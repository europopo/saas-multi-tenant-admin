/**
 * 租户领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { Tenant, TenantQuery, PageResult, Role, UserInfo } from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, paginate } from '@saas/shared';
import { db, resolveUserAuth, buildTenantAdminPermissions } from '../db';

export default defineMock({
  /**
   * 租户列表（分页 + 搜索 + 筛选 + 权限域数据隔离）。
   * 传入 userId 时，租户级用户仅能看到自己所属租户（行级数据隔离）；
   * 平台级用户或未传 userId 时返回全部租户。
   */
  '/tenant/list': ({ query }) => {
    const q = query as unknown as TenantQuery & Record<string, string>;
    const keyword = (q.keyword ?? '').trim();
    const status = q.status ?? '';
    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 10;

    let list = [...db.tenants].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // 权限域数据隔离：租户级用户只返回本租户
    const userId = q.userId;
    if (userId) {
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        const resolved = resolveUserAuth(user);
        if (resolved.scope === 'tenant') {
          list = list.filter((t) => t.id === user.tenantId);
        }
      }
    }

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
    return RESPONSE.success<Tenant>(tenant);
  },

  /**
   * 创建租户（一键开通）：
   * 1. 创建租户（subsystemIds 来自表单勾选）
   * 2. 自动创建 TENANT_ADMIN 角色（scope=tenant, tenantId=新租户id，权限=已选子系统菜单 + portal dashboard）
   * 3. 自动创建租户管理员用户（username = `${code}-admin`，默认密码 admin123）
   * 4. 回写 userCount=1
   */
  '[POST]/tenant/create': ({ data }) => {
    const body = data as Partial<Tenant> & { adminUsername?: string; adminPassword?: string };
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
      contact: body.contact ?? '',
      email: body.email ?? '',
      subsystemIds: body.subsystemIds ?? [],
      createdAt: new Date().toISOString(),
      expiredAt: body.expiredAt ?? new Date(Date.now() + 365 * 86_400_000).toISOString(),
      userCount: 0,
    };
    db.tenants.unshift(tenant);

    // 一键开通：自动创建租户管理员角色
    const adminPerms = buildTenantAdminPermissions(tenant.subsystemIds);
    const adminRole: Role = {
      id: generateId('role'),
      code: 'tenant_admin',
      name: '租户管理员',
      description: `租户「${tenant.name}」自动开通的管理员角色`,
      scope: 'tenant',
      tenantId: tenant.id,
      menuCodes: adminPerms.menuCodes,
      permissionCodes: adminPerms.permissionCodes,
      subsystemPermissions: adminPerms.subsystemPermissions,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    db.roles.push(adminRole);

    // 一键开通：自动创建租户管理员用户
    const adminUsername = body.adminUsername?.trim() || `${tenant.code}-admin`;
    const adminPassword = body.adminPassword?.trim() || 'admin123';
    if (db.users.some((u) => u.username === adminUsername)) {
      return RESPONSE.error(`管理员用户名「${adminUsername}」已存在`, BUSINESS_CODE.VALIDATION_ERROR);
    }
    const adminUser: UserInfo = {
      id: generateId('user'),
      username: adminUsername,
      nickname: `租户管理员`,
      avatar: '',
      email: body.email ?? '',
      status: 'active',
      roleIds: [adminRole.id],
      roles: ['tenant_admin'],
      permissions: Array.from(
        new Set([...adminRole.menuCodes, ...adminRole.permissionCodes]),
      ),
      tenantId: tenant.id,
      isPlatformAdmin: false,
      createdAt: new Date().toISOString(),
    };
    db.users.push(adminUser);
    db.credentials[adminUsername] = adminPassword;
    tenant.userCount = 1;

    return RESPONSE.success<Tenant>(tenant, `创建成功，租户管理员账号：${adminUsername} / ${adminPassword}`);
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
