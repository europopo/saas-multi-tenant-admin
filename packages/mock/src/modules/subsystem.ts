/**
 * 子系统领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { Subsystem, PermissionGroup } from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, buildMenuTree, buildSubsystemMenuSeed } from '@saas/shared';
import { db } from '../db';

export default defineMock({
  /** 子系统列表 */
  '/subsystem/list': () => {
    return RESPONSE.success<Subsystem[]>(db.subsystems);
  },

  /**
   * 权限数据源（兼容旧接口）：返回「门户 + 各子系统」的菜单权限树，按子系统分组。
   * 数据源来自 db.menus（与 /menu/for-role 同源）。
   */
  '/subsystem/menus': () => {
    const portalMenus = db.menus.filter((m) => m.subsystemCode === 'portal');
    const groups: PermissionGroup[] = [
      { subsystemCode: 'portal', name: '门户', icon: 'HomeFilled', menus: buildMenuTree(portalMenus) },
    ];
    for (const sub of db.subsystems) {
      const menus = db.menus.filter((m) => m.subsystemCode === sub.code);
      if (menus.length) {
        groups.push({
          subsystemCode: sub.code,
          name: sub.name,
          icon: sub.icon,
          menus: buildMenuTree(menus),
        });
      }
    }
    return RESPONSE.success<PermissionGroup[]>(groups);
  },

  /** 当前租户可访问的子系统（根据租户授权关系过滤） */
  '/subsystem/accessible': ({ query }) => {
    const tenantId = (query as { tenantId?: string }).tenantId;
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (!tenant) return RESPONSE.success<Subsystem[]>([]);
    const list = db.subsystems.filter(
      (s) => s.status === 'active' && tenant.subsystemIds.includes(s.id),
    );
    return RESPONSE.success<Subsystem[]>(list);
  },

  /** 子系统详情 */
  '/subsystem/{id}': ({ params }) => {
    const sub = db.subsystems.find((s) => s.id === params.id);
    if (!sub) return RESPONSE.error('子系统不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<Subsystem>(sub);
  },

  /** 创建子系统 */
  '[POST]/subsystem/create': ({ data }) => {
    const body = data as Partial<Subsystem>;
    if (!body.name || !body.code) {
      return RESPONSE.error('子系统名称和编码不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.subsystems.some((s) => s.code === body.code)) {
      return RESPONSE.error('编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const sub: Subsystem = {
      id: generateId('sub'),
      name: body.name,
      code: body.code,
      description: body.description ?? '',
      icon: body.icon ?? 'Grid',
      entryUrl: body.entryUrl ?? '/',
      status: body.status ?? 'active',
      createdAt: new Date().toISOString(),
    };
    db.subsystems.push(sub);
    // 联动：为新增子系统初始化默认菜单（写入 db.menus，权限配置/侧边栏自动出现）
    if (!db.menus.some((m) => m.subsystemCode === sub.code)) {
      db.menus.push(...buildSubsystemMenuSeed(sub.code, sub.name));
    }
    return RESPONSE.success<Subsystem>(sub, '创建成功');
  },

  /** 更新子系统 */
  '[PUT]/subsystem/update': ({ data }) => {
    const body = data as Partial<Subsystem> & { id: string };
    const idx = db.subsystems.findIndex((s) => s.id === body.id);
    if (idx === -1) return RESPONSE.error('子系统不存在', BUSINESS_CODE.NOT_FOUND);
    db.subsystems[idx] = { ...db.subsystems[idx]!, ...body, id: body.id };
    return RESPONSE.success<Subsystem>(db.subsystems[idx]!, '更新成功');
  },

  /** 子系统启停 */
  '[POST]/subsystem/toggle-status': ({ data }) => {
    const { id, status } = data as { id: string; status: 'active' | 'disabled' };
    const sub = db.subsystems.find((s) => s.id === id);
    if (!sub) return RESPONSE.error('子系统不存在', BUSINESS_CODE.NOT_FOUND);
    sub.status = status;
    return RESPONSE.success<Subsystem>(sub, status === 'active' ? '已启用' : '已停用');
  },
});
