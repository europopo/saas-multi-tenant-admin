/**
 * 认证与 RBAC 相关类型
 */

/** 用户状态 */
export type UserStatus = 'active' | 'disabled';

/** 租户状态 */
export type TenantStatus = 'active' | 'disabled' | 'pending';

/** 角色类型：区分平台级与租户级权限 */
export type RoleScope = 'platform' | 'tenant';

/** 登录请求参数 */
export interface LoginParams {
  username: string;
  password: string;
}

/** 当前登录用户信息 */
export interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  phone?: string;
  status: UserStatus;
  /** 用户拥有的角色 id 列表 */
  roleIds: string[];
  /** 用户拥有的角色编码列表（扁平化后的权限判断依据） */
  roles: string[];
  /** 用户拥有的权限编码列表（按钮级 / 页面级） */
  permissions: string[];
  /** 当前所属租户 id（平台管理员为 null，不属于任何租户） */
  tenantId: string | null;
  /** 是否为平台管理员 */
  isPlatformAdmin: boolean;
  /**
   * 权限域：由用户角色聚合而来（任一角色为 platform 即视为 platform）。
   * 决定数据行级隔离与平台级菜单/子系统可见性。
   */
  scope?: RoleScope;
  /**
   * 可访问的子系统编码列表（由用户角色的 subsystemPermissions 聚合而来）。
   * 平台级用户拥有全部子系统。
   */
  accessibleSubsystems?: string[];
  createdAt: string;
  lastLoginAt?: string;
}

/** 登录响应 */
export interface LoginResult {
  token: string;
  user: UserInfo;
}

/** SSO 提供商类型 */
export type SsoProviderType = 'oidc' | 'wecom' | 'feishu' | 'dingtalk' | 'ldap';

/** SSO 提供商状态 */
export type SsoProviderStatus = 'active' | 'disabled';

/** SSO 身份提供商 */
export interface SsoProvider {
  id: string;
  name: string;
  type: SsoProviderType;
  /** 提供商唯一编码，如 wecom、feishu */
  code: string;
  /** 图标标识 */
  icon: string;
  /** 展示色（用于按钮/图标底色） */
  color: string;
  description?: string;
  /** 授权地址（模拟） */
  authorizeUrl: string;
  /** 回调地址（模拟） */
  redirectUri: string;
  /** 是否启用 */
  status: SsoProviderStatus;
  /** 是否默认显示在登录页 */
  isDefault: boolean;
  createdAt: string;
}

/** SSO 登录发起参数 */
export interface SsoLoginParams {
  /** 提供商编码 */
  provider: string;
  /** 登录后跳转地址 */
  redirect?: string;
}

/** SSO 回调参数 */
export interface SsoCallbackParams {
  /** 提供商编码 */
  provider: string;
  /** 授权码（模拟） */
  code: string;
  /** 状态值，用于防 CSRF */
  state?: string;
}

/** SSO 登录响应 */
export interface SsoLoginResult {
  token: string;
  user: UserInfo;
  /** 是否为新用户（首次 SSO 登录自动创建账号） */
  isNewUser: boolean;
  /** 绑定的 SSO 提供商 */
  provider: string;
}

/** 子系统维度权限分组：某个子系统下已授权的菜单/按钮编码 */
export interface SubsystemPermission {
  /** 子系统编码（门户自身使用特殊码 'portal'） */
  subsystemCode: string;
  /** 该子系统下已授权的菜单编码（菜单可见性） */
  menuCodes: string[];
  /** 该子系统下已授权的按钮级操作编码 */
  permissionCodes: string[];
}

/** 权限数据源分组：一个子系统（或门户）的完整菜单权限树，供角色权限配置面板渲染 */
export interface PermissionGroup {
  /** 子系统编码（门户为 'portal'） */
  subsystemCode: string;
  /** 分组名称 */
  name: string;
  /** 分组图标 */
  icon?: string;
  /** 该分组下的菜单权限树（含 menu/button 节点） */
  menus: MenuItem[];
}

/** 角色 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  scope: RoleScope;
  /**
   * 角色所属租户：
   * - null = 平台级角色（全局，scope 恒为 'platform'）
   * - 具体值 = 属于该租户的租户级角色（scope 恒为 'tenant'）
   * 是「角色归属哪个租户」的精确表达，配合 scope 一起做数据行级隔离。
   */
  tenantId: string | null;
  /** 关联的菜单权限编码（菜单可见性，运行时扁平化结果） */
  menuCodes: string[];
  /** 关联的操作权限编码（按钮级 / 操作级，运行时扁平化结果） */
  permissionCodes: string[];
  /** 按子系统分组的权限配置（权限配置面板的持久化来源） */
  subsystemPermissions?: SubsystemPermission[];
  status: UserStatus;
  createdAt: string;
}

/** 菜单项类型：dir=目录，menu=菜单，button=页面内操作按钮 */
export type MenuItemType = 'dir' | 'menu' | 'button';

/** 菜单状态 */
export type MenuStatus = 'active' | 'disabled';

/**
 * 菜单权限域：标识该菜单/权限点属于哪个层级，作为「平台级 vs 租户级」隔离的数据驱动依据。
 * - platform：平台管理菜单（租户/子系统/用户/角色/菜单管理等），仅平台级角色可授权、可见
 * - tenant：租户内业务菜单（后续可扩展按租户隔离）
 * - common：通用菜单（仪表盘等），所有角色可见
 */
export type MenuScope = 'platform' | 'tenant' | 'common';

/** 菜单项（完整菜单实体，对齐 ruoyi-vue-pro system_menu 表） */
export interface MenuItem {
  /** 菜单唯一主键 */
  id: string;
  /** 菜单唯一编码，作为权限标识（如 system:user:list） */
  code: string;
  name: string;
  /** 菜单类型：目录 / 菜单 / 按钮 */
  type: MenuItemType;
  /** 父级菜单 id（根节点为 null） */
  parentId: string | null;
  /** 路由路径（dir/menu 必填，button 可为空） */
  path?: string;
  /** 组件路径（用于动态路由映射，如 system/user/index） */
  component?: string;
  icon?: string;
  /** 排序 */
  sort: number;
  /** 是否在侧边栏显示 */
  visible: boolean;
  status: MenuStatus;
  /** 所属子系统编码（门户为 'portal'） */
  subsystemCode: string;
  /**
   * 菜单权限域：平台级(platform) / 租户级(tenant) / 通用(common)。
   * 默认 common。是「平台级菜单是否可被租户级角色授权/可见」的数据驱动判定依据。
   */
  scope?: MenuScope;
  /** 是否缓存页面 */
  keepAlive?: boolean;
  /** 额外权限标识（兼容 ruoyi，按需） */
  permission?: string;
  /** 是否在侧边栏隐藏（旧字段兼容） */
  hidden?: boolean;
  /** 排序（旧字段兼容） */
  order?: number;
  /** 子菜单 */
  children?: MenuItem[];
  /** 树形展示时是否禁用勾选（用于权限域约束等场景，非持久化字段） */
  disabled?: boolean;
}

/** 菜单查询参数 */
export interface SysMenuQuery {
  /** 菜单名称模糊搜索 */
  name?: string;
  /** 编码模糊搜索 */
  code?: string;
  /** 状态筛选 */
  status?: MenuStatus | '';
  /** 子系统编码筛选（默认 portal） */
  subsystemCode?: string;
  /** 是否仅返回可见菜单 */
  visibleOnly?: boolean;
}
