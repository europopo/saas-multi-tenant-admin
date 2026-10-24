/**
 * 菜单种子数据与工具函数
 *
 * 提供「门户 + 各子系统」的初始菜单数据（对齐 ruoyi-vue-pro system_menu 表结构），
 * 作为内存数据库 db.menus 的初始化种子。运行时菜单管理、角色授权、动态路由/侧边栏
 * 均以 db.menus 为唯一数据源。
 */
import type { MenuItem } from '../types/auth';

/** 生成稳定的菜单 id（基于编码） */
export function menuId(code: string): string {
  return `menu-${code}`;
}

/** 门户菜单种子数据（目录/菜单/按钮三级） */
export const PORTAL_MENU_SEED: MenuItem[] = [
  {
    id: menuId('dashboard'),
    code: 'dashboard',
    name: '仪表盘',
    type: 'menu',
    parentId: null,
    path: '/dashboard',
    component: 'dashboard/index',
    icon: 'Odometer',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('tenant'),
    code: 'tenant',
    name: '租户管理',
    type: 'dir',
    parentId: null,
    path: '/tenant',
    icon: 'OfficeBuilding',
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('tenant-list'),
    code: 'tenant-list',
    name: '租户列表',
    type: 'menu',
    parentId: menuId('tenant'),
    path: '/tenant/list',
    component: 'tenant/index',
    icon: 'List',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('tenant-create'),
    code: 'tenant:create',
    name: '新建租户',
    type: 'button',
    parentId: menuId('tenant'),
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('tenant-edit'),
    code: 'tenant:edit',
    name: '编辑租户',
    type: 'button',
    parentId: menuId('tenant'),
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('tenant-delete'),
    code: 'tenant:delete',
    name: '删除租户',
    type: 'button',
    parentId: menuId('tenant'),
    sort: 4,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('subsystem'),
    code: 'subsystem',
    name: '子系统管理',
    type: 'dir',
    parentId: null,
    path: '/subsystem',
    icon: 'Grid',
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('subsystem-list'),
    code: 'subsystem-list',
    name: '子系统列表',
    type: 'menu',
    parentId: menuId('subsystem'),
    path: '/subsystem/list',
    component: 'subsystem/index',
    icon: 'List',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('subsystem-create'),
    code: 'subsystem:create',
    name: '新建子系统',
    type: 'button',
    parentId: menuId('subsystem'),
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('subsystem-edit'),
    code: 'subsystem:edit',
    name: '编辑子系统',
    type: 'button',
    parentId: menuId('subsystem'),
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('user'),
    code: 'user',
    name: '用户与角色',
    type: 'dir',
    parentId: null,
    path: '/user',
    icon: 'User',
    sort: 4,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('user-list'),
    code: 'user-list',
    name: '用户管理',
    type: 'menu',
    parentId: menuId('user'),
    path: '/user/list',
    component: 'user/index',
    icon: 'User',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('user-create'),
    code: 'user:create',
    name: '新建用户',
    type: 'button',
    parentId: menuId('user'),
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('user-edit'),
    code: 'user:edit',
    name: '编辑用户',
    type: 'button',
    parentId: menuId('user'),
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('user-delete'),
    code: 'user:delete',
    name: '删除用户',
    type: 'button',
    parentId: menuId('user'),
    sort: 4,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('role-list'),
    code: 'role-list',
    name: '角色管理',
    type: 'menu',
    parentId: menuId('user'),
    path: '/role/list',
    component: 'role/index',
    icon: 'UserFilled',
    sort: 5,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('role-create'),
    code: 'role:create',
    name: '新建角色',
    type: 'button',
    parentId: menuId('user'),
    sort: 6,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('role-edit'),
    code: 'role:edit',
    name: '编辑角色',
    type: 'button',
    parentId: menuId('user'),
    sort: 7,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('role-delete'),
    code: 'role:delete',
    name: '删除角色',
    type: 'button',
    parentId: menuId('user'),
    sort: 8,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  // 系统管理目录（含菜单管理）
  {
    id: menuId('system'),
    code: 'system',
    name: '系统管理',
    type: 'dir',
    parentId: null,
    path: '/system',
    icon: 'Setting',
    sort: 5,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('system-menu'),
    code: 'system-menu',
    name: '菜单管理',
    type: 'menu',
    parentId: menuId('system'),
    path: '/system/menu',
    component: 'system/menu/index',
    icon: 'Menu',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('system-menu-create'),
    code: 'system:menu:create',
    name: '新增菜单',
    type: 'button',
    parentId: menuId('system'),
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('system-menu-edit'),
    code: 'system:menu:edit',
    name: '编辑菜单',
    type: 'button',
    parentId: menuId('system'),
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
  {
    id: menuId('system-menu-delete'),
    code: 'system:menu:delete',
    name: '删除菜单',
    type: 'button',
    parentId: menuId('system'),
    sort: 4,
    visible: true,
    status: 'active',
    subsystemCode: 'portal',
  },
];

/** 任务子系统菜单种子数据 */
export const TASK_MENU_SEED: MenuItem[] = [
  {
    id: menuId('task-dashboard'),
    code: 'task-dashboard',
    name: '任务看板',
    type: 'menu',
    parentId: null,
    path: '/task/dashboard',
    component: 'dashboard/index',
    icon: 'DataBoard',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'task-system',
  },
  {
    id: menuId('task-list'),
    code: 'task-list',
    name: '任务管理',
    type: 'menu',
    parentId: null,
    path: '/task/list',
    component: 'task/index',
    icon: 'List',
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'task-system',
  },
  {
    id: menuId('task-settings'),
    code: 'task-settings',
    name: '系统设置',
    type: 'dir',
    parentId: null,
    path: '/task/settings',
    icon: 'Setting',
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'task-system',
  },
  {
    id: menuId('task-third-system'),
    code: 'third-system',
    name: '第三方系统',
    type: 'menu',
    parentId: menuId('task-settings'),
    path: '/task/settings/third-system',
    component: 'settings/third-system',
    icon: 'Connection',
    sort: 1,
    visible: true,
    status: 'active',
    subsystemCode: 'task-system',
  },
  {
    id: menuId('task-task-type'),
    code: 'task-type',
    name: '任务类型规则',
    type: 'menu',
    parentId: menuId('task-settings'),
    path: '/task/settings/task-type',
    component: 'settings/task-type',
    icon: 'SetUp',
    sort: 2,
    visible: true,
    status: 'active',
    subsystemCode: 'task-system',
  },
  {
    id: menuId('task-base-settings'),
    code: 'base-settings',
    name: '基础设置',
    type: 'menu',
    parentId: menuId('task-settings'),
    path: '/task/settings/base',
    component: 'settings/base',
    icon: 'Tools',
    sort: 3,
    visible: true,
    status: 'active',
    subsystemCode: 'task-system',
  },
];

/**
 * 为某个子系统生成默认菜单模板（用于新增子系统后自动初始化其菜单）。
 * 返回扁平列表（含目录 + 菜单 + 按钮），由调用方 push 进 db.menus。
 */
export function buildSubsystemMenuSeed(
  subsystemCode: string,
  subsystemName: string,
): MenuItem[] {
  const label = subsystemName || subsystemCode;
  return [
    {
      id: menuId(`${subsystemCode}-dashboard`),
      code: `${subsystemCode}:dashboard`,
      name: `${label}总览`,
      type: 'menu',
      parentId: null,
      path: `/subsystem/${subsystemCode}`,
      component: 'subsystem/entry',
      icon: 'Odometer',
      sort: 1,
      visible: true,
      status: 'active',
      subsystemCode,
    },
    {
      id: menuId(`${subsystemCode}-list`),
      code: `${subsystemCode}:list`,
      name: `${label}列表`,
      type: 'menu',
      parentId: null,
      path: `/subsystem/${subsystemCode}/list`,
      component: 'subsystem/entry',
      icon: 'List',
      sort: 2,
      visible: true,
      status: 'active',
      subsystemCode,
    },
    {
      id: menuId(`${subsystemCode}-create`),
      code: `${subsystemCode}:create`,
      name: `新建${label}记录`,
      type: 'button',
      parentId: null,
      sort: 3,
      visible: true,
      status: 'active',
      subsystemCode,
    },
    {
      id: menuId(`${subsystemCode}-edit`),
      code: `${subsystemCode}:edit`,
      name: `编辑${label}记录`,
      type: 'button',
      parentId: null,
      sort: 4,
      visible: true,
      status: 'active',
      subsystemCode,
    },
    {
      id: menuId(`${subsystemCode}-delete`),
      code: `${subsystemCode}:delete`,
      name: `删除${label}记录`,
      type: 'button',
      parentId: null,
      sort: 5,
      visible: true,
      status: 'active',
      subsystemCode,
    },
  ];
}

/** 全部菜单种子（门户 + 任务子系统） */
export const ALL_MENU_SEED: MenuItem[] = [...PORTAL_MENU_SEED, ...TASK_MENU_SEED];

/**
 * 将扁平菜单列表构建为树（按 parentId 组装，按 sort 排序）。
 * @param list 扁平菜单列表
 * @param parentId 父 id（null 为根）
 */
export function buildMenuTree(list: MenuItem[], parentId: string | null = null): MenuItem[] {
  const children = list
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((m) => {
      const kids = buildMenuTree(list, m.id);
      return kids.length ? { ...m, children: kids } : { ...m };
    });
  return children;
}

/**
 * 从菜单列表中提取「菜单/目录编码」（用于侧边栏可见性校验）
 * 仅包含 type !== 'button' 的节点 code。
 */
export function collectMenuCodes(tree: MenuItem[]): string[] {
  const codes: string[] = [];
  const walk = (items: MenuItem[]) => {
    for (const item of items) {
      if (item.type !== 'button') codes.push(item.code);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(tree);
  return codes;
}

/**
 * 从菜单列表中提取「按钮级权限编码」。
 */
export function collectButtonCodes(tree: MenuItem[]): string[] {
  const codes: string[] = [];
  const walk = (items: MenuItem[]) => {
    for (const item of items) {
      if (item.type === 'button') codes.push(item.code);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(tree);
  return codes;
}
