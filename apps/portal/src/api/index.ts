/**
 * 门户业务 API 模块
 * 所有业务 API 按领域划分，通过统一 Alova 实例调用。
 */
import type {
  LoginParams,
  LoginResult,
  UserInfo,
  Tenant,
  TenantQuery,
  PageResult,
  Subsystem,
  Role,
  PermissionGroup,
  MenuItem,
  SysMenuQuery,
  PortalDashboardData,
  SsoProvider,
  SsoLoginParams,
  SsoCallbackParams,
  SsoLoginResult,
} from '@saas/shared';
import { alova } from './client';

/** 认证 API */
export const authApi = {
  login(params: LoginParams) {
    return alova.Post<LoginResult>('/auth/login', params);
  },
  logout(token: string) {
    return alova.Post<null>('/auth/logout', { token });
  },
  getMe(token?: string) {
    return alova.Get<UserInfo>('/auth/me', { params: { token } });
  },
};

/** SSO 单点登录 API */
export const ssoApi = {
  providers() {
    return alova.Get<SsoProvider[]>('/sso/providers');
  },
  authorize(params: SsoLoginParams) {
    return alova.Post<{
      provider: string;
      state: string;
      authorizeUrl: string;
      redirect?: string;
    }>('/sso/authorize', params);
  },
  callback(params: SsoCallbackParams) {
    return alova.Post<SsoLoginResult>('/sso/callback', params);
  },
};

/** 租户 API */
export const tenantApi = {
  list(query: TenantQuery) {
    return alova.Get<PageResult<Tenant>>('/tenant/list', { params: query });
  },
  detail(id: string) {
    return alova.Get<Tenant>(`/tenant/${id}`);
  },
  create(data: Partial<Tenant>) {
    return alova.Post<Tenant>('/tenant/create', data);
  },
  update(data: Partial<Tenant> & { id: string }) {
    return alova.Put<Tenant>('/tenant/update', data);
  },
  toggleStatus(id: string, status: 'active' | 'disabled') {
    return alova.Post<Tenant>('/tenant/toggle-status', { id, status });
  },
  remove(id: string) {
    return alova.Delete<Tenant>(`/tenant/${id}`);
  },
};

/** 子系统 API */
export const subsystemApi = {
  list() {
    // 禁用 GET 缓存：子系统增删改后需即时刷新顶部导航栏
    return alova.Get<Subsystem[]>('/subsystem/list', { cacheFor: null });
  },
  accessible(tenantId: string) {
    return alova.Get<Subsystem[]>('/subsystem/accessible', {
      params: { tenantId },
      cacheFor: null,
    });
  },
  create(data: Partial<Subsystem>) {
    return alova.Post<Subsystem>('/subsystem/create', data);
  },
  update(data: Partial<Subsystem> & { id: string }) {
    return alova.Put<Subsystem>('/subsystem/update', data);
  },
  toggleStatus(id: string, status: 'active' | 'disabled') {
    return alova.Post<Subsystem>('/subsystem/toggle-status', { id, status });
  },
};

/** 用户 API */
export const userApi = {
  list(query: { keyword?: string; status?: string; page: number; pageSize: number }) {
    return alova.Get<PageResult<UserInfo>>('/user/list', { params: query });
  },
  create(data: Partial<UserInfo>) {
    return alova.Post<UserInfo>('/user/create', data);
  },
  update(data: Partial<UserInfo> & { id: string }) {
    return alova.Put<UserInfo>('/user/update', data);
  },
  toggleStatus(id: string, status: 'active' | 'disabled') {
    return alova.Post<UserInfo>('/user/toggle-status', { id, status });
  },
  remove(id: string) {
    return alova.Delete<UserInfo>(`/user/${id}`);
  },
};

/** 角色 API */
export const roleApi = {
  list() {
    return alova.Get<Role[]>('/role/list');
  },
  /** 获取权限数据源（门户 + 各子系统菜单树，按子系统分组） */
  menus() {
    return alova.Get<PermissionGroup[]>('/menu/for-role', { cacheFor: null });
  },
  create(data: Partial<Role>) {
    return alova.Post<Role>('/role/create', data);
  },
  update(data: Partial<Role> & { id: string }) {
    return alova.Put<Role>('/role/update', data);
  },
  remove(id: string) {
    return alova.Delete<Role>(`/role/${id}`);
  },
};

/** 菜单 API（菜单管理模块） */
export const menuApi = {
  list(query?: SysMenuQuery) {
    return alova.Get<MenuItem[]>('/menu/list', { params: query, cacheFor: null });
  },
  tree(query?: SysMenuQuery) {
    return alova.Get<MenuItem[]>('/menu/tree', { params: query, cacheFor: null });
  },
  forRole() {
    return alova.Get<PermissionGroup[]>('/menu/for-role', { cacheFor: null });
  },
  create(data: Partial<MenuItem>) {
    return alova.Post<MenuItem>('/menu/create', data);
  },
  update(data: Partial<MenuItem> & { id: string }) {
    return alova.Put<MenuItem>('/menu/update', data);
  },
  remove(id: string) {
    return alova.Delete<null>(`/menu/${id}`);
  },
};

/** 仪表盘 API */
export const dashboardApi = {
  get() {
    return alova.Get<PortalDashboardData>('/portal/dashboard');
  },
};
