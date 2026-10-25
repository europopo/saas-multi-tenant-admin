/**
 * 菜单管理领域 Mock 接口
 * 菜单是唯一数据源，驱动角色授权、动态路由、侧边栏渲染。
 */
import { defineMock } from '@alova/mock';
import type { MenuItem, SysMenuQuery, PermissionGroup } from '@saas/shared';
import {
  RESPONSE,
  BUSINESS_CODE,
  generateId,
  buildMenuTree,
  buildSubsystemMenuSeed,
  PORTAL_MENU_SEED,
} from '@saas/shared';
import { db } from '../db';

export default defineMock({
  /** 菜单列表（支持子系统筛选 + 名称/编码/状态过滤） */
  '/menu/list': ({ query }) => {
    const q = (query ?? {}) as SysMenuQuery;
    let list = db.menus.slice();
    if (q.subsystemCode) list = list.filter((m) => m.subsystemCode === q.subsystemCode);
    if (q.status) list = list.filter((m) => m.status === q.status);
    if (q.name) list = list.filter((m) => m.name.includes(q.name!));
    if (q.code) list = list.filter((m) => m.code.includes(q.code!));
    if (q.visibleOnly) list = list.filter((m) => m.visible);
    list.sort((a, b) => a.sort - b.sort);
    return RESPONSE.success<MenuItem[]>(list);
  },

  /** 菜单树（按 parentId 组装，供侧边栏与菜单管理树形展示） */
  '/menu/tree': ({ query }) => {
    const q = (query ?? {}) as SysMenuQuery;
    let list = db.menus.slice();
    if (q.subsystemCode) list = list.filter((m) => m.subsystemCode === q.subsystemCode);
    if (q.visibleOnly) list = list.filter((m) => m.visible);
    return RESPONSE.success<MenuItem[]>(buildMenuTree(list));
  },

  /**
   * 角色授权用菜单树：按子系统分组的「目录/菜单/按钮」三级树。
   * 数据源来自 db.menus，替代旧 /subsystem/menus。
   */
  '/menu/for-role': () => {
    // 门户分组（含 system 菜单管理）
    const portalMenus = db.menus.filter((m) => m.subsystemCode === 'portal');
    // 其他子系统分组
    const subsystemCodes = Array.from(new Set(db.menus.map((m) => m.subsystemCode))).filter(
      (c) => c !== 'portal',
    );
    const groups: PermissionGroup[] = [
      { subsystemCode: 'portal', name: '门户', icon: 'HomeFilled', menus: buildMenuTree(portalMenus) },
    ];
    for (const code of subsystemCodes) {
      const sub = db.subsystems.find((s) => s.code === code);
      const menus = db.menus.filter((m) => m.subsystemCode === code);
      groups.push({
        subsystemCode: code,
        name: sub?.name ?? code,
        icon: sub?.icon,
        menus: buildMenuTree(menus),
      });
    }
    return RESPONSE.success<PermissionGroup[]>(groups);
  },

  /** 菜单详情 */
  '/menu/{id}': ({ params }) => {
    const menu = db.menus.find((m) => m.id === params.id);
    if (!menu) return RESPONSE.error('菜单不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<MenuItem>(menu);
  },

  /** 创建菜单 */
  '[POST]/menu/create': ({ data }) => {
    const body = data as Partial<MenuItem>;
    if (!body.name || !body.code) {
      return RESPONSE.error('菜单名称和编码不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.menus.some((m) => m.code === body.code && m.subsystemCode === body.subsystemCode)) {
      return RESPONSE.error('同子系统下编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const menu: MenuItem = {
      id: generateId('menu'),
      code: body.code,
      name: body.name,
      type: body.type ?? 'menu',
      parentId: body.parentId ?? null,
      path: body.path ?? '',
      component: body.component ?? '',
      icon: body.icon ?? '',
      sort: body.sort ?? 99,
      visible: body.visible ?? true,
      status: body.status ?? 'active',
      subsystemCode: body.subsystemCode ?? 'portal',
      scope: body.scope ?? 'common',
      keepAlive: body.keepAlive ?? false,
    };
    db.menus.push(menu);
    return RESPONSE.success<MenuItem>(menu, '创建成功');
  },

  /** 更新菜单 */
  '[PUT]/menu/update': ({ data }) => {
    const body = data as Partial<MenuItem> & { id: string };
    const idx = db.menus.findIndex((m) => m.id === body.id);
    if (idx === -1) return RESPONSE.error('菜单不存在', BUSINESS_CODE.NOT_FOUND);
    db.menus[idx] = { ...db.menus[idx]!, ...body, id: body.id };
    return RESPONSE.success<MenuItem>(db.menus[idx]!, '更新成功');
  },

  /** 删除菜单（级联删除子节点） */
  '[DELETE]/menu/{id}': ({ params }) => {
    const id = params.id as string;
    const target = db.menus.find((m) => m.id === id);
    if (!target) return RESPONSE.error('菜单不存在', BUSINESS_CODE.NOT_FOUND);
    // 收集所有待删除 id（含子孙）
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of db.menus) {
        if (m.parentId && toDelete.has(m.parentId) && !toDelete.has(m.id)) {
          toDelete.add(m.id);
          changed = true;
        }
      }
    }
    db.menus = db.menus.filter((m) => !toDelete.has(m.id));
    return RESPONSE.success<null>(null, `已删除 ${toDelete.size} 条菜单`);
  },

  /**
   * 子系统创建后初始化其菜单（供子系统 create 接口联动调用）。
   * 由子系统 mock 在创建成功后调用；这里提供独立接口以防前端直接触发。
   */
  '[POST]/menu/init-subsystem': ({ data }) => {
    const { subsystemCode, subsystemName } = data as { subsystemCode: string; subsystemName: string };
    if (db.menus.some((m) => m.subsystemCode === subsystemCode)) {
      return RESPONSE.success<null>(null, '菜单已存在');
    }
    db.menus.push(...buildSubsystemMenuSeed(subsystemCode, subsystemName));
    return RESPONSE.success<null>(null, '已初始化子系统菜单');
  },
});

export { PORTAL_MENU_SEED };
