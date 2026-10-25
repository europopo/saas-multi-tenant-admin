/**
 * 数据字典领域 Mock 接口
 *
 * 纯租户级字典：所有字典类型/数据均按 tenantId 隔离。
 * 接口默认从 userId 解析当前用户租户做数据隔离（平台管理员可跨租户查看）。
 */
import { defineMock } from '@alova/mock';
import type {
  DictType,
  DictData,
  DictTypeQuery,
  DictDataQuery,
  PageResult,
  DictItem,
} from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, paginate } from '@saas/shared';
import { db, resolveUserAuth } from '../db';

/** 解析请求中的当前用户租户 id（未传 userId 时返回 null，表示不限制） */
function resolveTenantId(userId?: string): string | null {
  if (!userId) return null;
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  const resolved = resolveUserAuth(user);
  // 平台级用户不限制租户（可查看所有租户字典）
  if (resolved.scope === 'platform') return null;
  return user.tenantId;
}

export default defineMock({
  /** 字典类型列表（租户隔离 + 关键字/状态筛选 + 分页） */
  '/dict/type/list': ({ query }) => {
    const q = (query ?? {}) as DictTypeQuery & { userId?: string } & Record<string, string>;
    const tenantId = resolveTenantId(q.userId);
    const keyword = (q.keyword ?? '').trim();
    const status = q.status ?? '';

    let list = db.dictTypes.slice();
    if (tenantId) list = list.filter((t) => t.tenantId === tenantId);
    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(k) || t.type.toLowerCase().includes(k));
    }
    if (status) list = list.filter((t) => t.status === status);

    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 10;
    const result = paginate(list, page, pageSize);
    return RESPONSE.success<PageResult<DictType>>({
      list: result.list,
      total: result.total,
      page,
      pageSize,
    });
  },

  /** 创建字典类型 */
  '[POST]/dict/type/create': ({ data }) => {
    const body = data as Partial<DictType>;
    if (!body.name || !body.type) {
      return RESPONSE.error('字典名称和编码不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (!body.tenantId) {
      return RESPONSE.error('字典必须归属某个租户', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.dictTypes.some((t) => t.type === body.type && t.tenantId === body.tenantId)) {
      return RESPONSE.error('同租户下字典编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const dictType: DictType = {
      id: generateId('dict-type'),
      name: body.name,
      type: body.type,
      status: body.status ?? 'active',
      tenantId: body.tenantId,
      remark: body.remark ?? '',
      createdAt: new Date().toISOString(),
    };
    db.dictTypes.push(dictType);
    return RESPONSE.success<DictType>(dictType, '创建成功');
  },

  /** 更新字典类型 */
  '[PUT]/dict/type/update': ({ data }) => {
    const body = data as Partial<DictType> & { id: string };
    const idx = db.dictTypes.findIndex((t) => t.id === body.id);
    if (idx === -1) return RESPONSE.error('字典类型不存在', BUSINESS_CODE.NOT_FOUND);
    db.dictTypes[idx] = { ...db.dictTypes[idx]!, ...body, id: body.id };
    return RESPONSE.success<DictType>(db.dictTypes[idx]!, '更新成功');
  },

  /** 删除字典类型（级联删除其字典数据） */
  '[DELETE]/dict/type/{id}': ({ params }) => {
    const id = params.id as string;
    const target = db.dictTypes.find((t) => t.id === id);
    if (!target) return RESPONSE.error('字典类型不存在', BUSINESS_CODE.NOT_FOUND);
    const dataCount = db.dictData.filter((d) => d.typeId === id).length;
    db.dictData = db.dictData.filter((d) => d.typeId !== id);
    db.dictTypes = db.dictTypes.filter((t) => t.id !== id);
    return RESPONSE.success<null>(null, `已删除，同时删除 ${dataCount} 条字典数据`);
  },

  /** 按字典类型查询字典数据 */
  '/dict/data/list': ({ query }) => {
    const q = (query ?? {}) as DictDataQuery & { userId?: string } & Record<string, string>;
    const tenantId = resolveTenantId(q.userId);
    let list = db.dictData.slice();
    if (q.typeId) list = list.filter((d) => d.typeId === q.typeId);
    if (tenantId) list = list.filter((d) => d.tenantId === tenantId);
    list.sort((a, b) => a.sort - b.sort);
    return RESPONSE.success<DictData[]>(list);
  },

  /** 按字典编码取字典项（供业务下拉框复用，返回展示用 DictItem[]） */
  '/dict/data/by-type': ({ query }) => {
    const q = (query ?? {}) as { type?: string; tenantId?: string } & Record<string, string>;
    if (!q.type) return RESPONSE.error('缺少字典编码', BUSINESS_CODE.VALIDATION_ERROR);
    let list = db.dictData.slice();
    if (q.tenantId) list = list.filter((d) => d.tenantId === q.tenantId);
    const type = db.dictTypes.find((t) => t.type === q.type);
    if (type) list = list.filter((d) => d.typeId === type.id);
    list = list.filter((d) => d.status === 'active').sort((a, b) => a.sort - b.sort);
    const items: DictItem[] = list.map((d) => ({
      label: d.label,
      value: d.value,
      color: d.color,
    }));
    return RESPONSE.success<DictItem[]>(items);
  },

  /** 创建字典数据 */
  '[POST]/dict/data/create': ({ data }) => {
    const body = data as Partial<DictData>;
    if (!body.typeId || !body.label || !body.value) {
      return RESPONSE.error('字典数据不完整', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const type = db.dictTypes.find((t) => t.id === body.typeId);
    if (!type) return RESPONSE.error('字典类型不存在', BUSINESS_CODE.NOT_FOUND);
    const dictData: DictData = {
      id: generateId('dict-data'),
      typeId: body.typeId,
      label: body.label,
      labelEn: body.labelEn,
      value: body.value,
      sort: body.sort ?? 99,
      status: body.status ?? 'active',
      tenantId: body.tenantId ?? type.tenantId,
      color: body.color,
      createdAt: new Date().toISOString(),
    };
    db.dictData.push(dictData);
    return RESPONSE.success<DictData>(dictData, '创建成功');
  },

  /** 更新字典数据 */
  '[PUT]/dict/data/update': ({ data }) => {
    const body = data as Partial<DictData> & { id: string };
    const idx = db.dictData.findIndex((d) => d.id === body.id);
    if (idx === -1) return RESPONSE.error('字典数据不存在', BUSINESS_CODE.NOT_FOUND);
    db.dictData[idx] = { ...db.dictData[idx]!, ...body, id: body.id };
    return RESPONSE.success<DictData>(db.dictData[idx]!, '更新成功');
  },

  /** 删除字典数据 */
  '[DELETE]/dict/data/{id}': ({ params }) => {
    const idx = db.dictData.findIndex((d) => d.id === params.id);
    if (idx === -1) return RESPONSE.error('字典数据不存在', BUSINESS_CODE.NOT_FOUND);
    const [removed] = db.dictData.splice(idx, 1);
    return RESPONSE.success<DictData>(removed!, '删除成功');
  },
});
