/**
 * 租户领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { Tenant, TenantQuery, PageResult } from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, paginate } from '@saas/shared';
import { db } from '../db';

export default defineMock({
  /** 租户列表（分页 + 搜索 + 筛选） */
  '/tenant/list': ({ query }) => {
    const q = query as unknown as TenantQuery & Record<string, string>;
    const keyword = (q.keyword ?? '').trim();
    const status = q.status ?? '';
    const planId = q.planId ?? '';
    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 10;

    let list = [...db.tenants].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(k) ||
          t.code.toLowerCase().includes(k) ||
          t.contact.includes(keyword),
      );
    }
    if (status) list = list.filter((t) => t.status === status);
    if (planId) list = list.filter((t) => t.planId === planId);

    const result = paginate(list, page, pageSize);
    return RESPONSE.success<PageResult<Tenant>>({
      list: result.list,
      total: result.total,
      page,
      pageSize,
    });
  },

  /** 租户详情 */
  '/tenant/{id}': ({ params }) => {
    const tenant = db.tenants.find((t) => t.id === params.id);
    if (!tenant) return RESPONSE.error('租户不存在', BUSINESS_CODE.NOT_FOUND);
    const plan = db.plans.find((p) => p.id === tenant.planId);
    return RESPONSE.success<Tenant>({ ...tenant, planName: plan?.name });
  },

  /** 创建租户 */
  '[POST]/tenant/create': ({ data }) => {
    const body = data as Partial<Tenant>;
    if (!body.name || !body.code) {
      return RESPONSE.error('租户名称和唯一标识不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.tenants.some((t) => t.code === body.code)) {
      return RESPONSE.error('唯一标识已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const tenant: Tenant = {
      id: generateId('tenant'),
      name: body.name,
      code: body.code,
      status: body.status ?? 'active',
      planId: body.planId ?? 'plan-free',
      contact: body.contact ?? '',
      email: body.email ?? '',
      subsystemIds: body.subsystemIds ?? [],
      createdAt: new Date().toISOString(),
      expiredAt: body.expiredAt ?? new Date(Date.now() + 365 * 86_400_000).toISOString(),
      userCount: 0,
    };
    db.tenants.unshift(tenant);
    return RESPONSE.success<Tenant>(tenant, '创建成功');
  },

  /** 更新租户 */
  '[PUT]/tenant/update': ({ data }) => {
    const body = data as Partial<Tenant> & { id: string };
    const idx = db.tenants.findIndex((t) => t.id === body.id);
    if (idx === -1) return RESPONSE.error('租户不存在', BUSINESS_CODE.NOT_FOUND);
    if (body.code && db.tenants.some((t) => t.code === body.code && t.id !== body.id)) {
      return RESPONSE.error('唯一标识已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    db.tenants[idx] = { ...db.tenants[idx]!, ...body, id: body.id };
    return RESPONSE.success<Tenant>(db.tenants[idx]!, '更新成功');
  },

  /** 启用/停用租户 */
  '[POST]/tenant/toggle-status': ({ data }) => {
    const { id, status } = data as { id: string; status: 'active' | 'disabled' };
    const tenant = db.tenants.find((t) => t.id === id);
    if (!tenant) return RESPONSE.error('租户不存在', BUSINESS_CODE.NOT_FOUND);
    tenant.status = status;
    return RESPONSE.success<Tenant>(tenant, status === 'active' ? '已启用' : '已停用');
  },

  /** 删除租户 */
  '[DELETE]/tenant/{id}': ({ params }) => {
    const idx = db.tenants.findIndex((t) => t.id === params.id);
    if (idx === -1) return RESPONSE.error('租户不存在', BUSINESS_CODE.NOT_FOUND);
    const [removed] = db.tenants.splice(idx, 1);
    return RESPONSE.success<Tenant>(removed!, '删除成功');
  },
});
