/**
 * 任务子系统业务 API 模块
 */
import type {
  Task,
  TaskConfig,
  TaskQuery,
  TaskLog,
  TaskStatusHistory,
  TaskRetryRecord,
  PageResult,
  DashboardData,
  ThirdSystem,
  TaskTypeRule,
  SystemSettings,
  UserInfo,
  LoginResult,
  LoginParams,
  Subsystem,
} from '@saas/shared';
import { alova } from './client';

/** 认证 API（复用门户登录态） */
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

/** 子系统 API（顶部导航共用） */
export const subsystemApi = {
  list() {
    return alova.Get<Subsystem[]>('/subsystem/list');
  },
};

/** 任务 API */
export const taskApi = {
  list(query: TaskQuery) {
    return alova.Get<PageResult<Task>>('/task/list', { params: query });
  },
  detail(id: string) {
    return alova.Get<Task>(`/task/${id}`);
  },
  logs(id: string) {
    return alova.Get<TaskLog[]>(`/task/${id}/logs`);
  },
  history(id: string) {
    return alova.Get<TaskStatusHistory[]>(`/task/${id}/history`);
  },
  retries(id: string) {
    return alova.Get<TaskRetryRecord[]>(`/task/${id}/retries`);
  },
  /** 创建任务（config 各字段均可省略，由服务端按任务规则填充默认值） */
  create(data: Omit<Partial<Task>, 'config'> & { config?: Partial<TaskConfig> }) {
    return alova.Post<Task>('/task/create', data);
  },
  update(data: Omit<Partial<Task>, 'config'> & { config?: Partial<TaskConfig>; id: string }) {
    return alova.Put<Task>('/task/update', data);
  },
  trigger(id: string) {
    return alova.Post<Task>('/task/trigger', { id });
  },
  cancel(id: string) {
    return alova.Post<Task>('/task/cancel', { id });
  },
  retry(id: string) {
    return alova.Post<Task>('/task/retry', { id });
  },
  remove(id: string) {
    return alova.Delete<Task>(`/task/${id}`);
  },
  batchDelete(ids: string[]) {
    return alova.Post<number>('/task/batch-delete', { ids });
  },
  dashboard(query?: { thirdSystemId?: string; startTime?: string; endTime?: string }) {
    return alova.Get<DashboardData>('/task/dashboard', { params: query });
  },
};

/** 第三方系统 API */
export const thirdSystemApi = {
  list(query?: { keyword?: string; status?: string }) {
    return alova.Get<ThirdSystem[]>('/third-system/list', { params: query });
  },
  detail(id: string) {
    return alova.Get<ThirdSystem>(`/third-system/${id}`);
  },
  create(data: Partial<ThirdSystem>) {
    return alova.Post<ThirdSystem>('/third-system/create', data);
  },
  update(data: Partial<ThirdSystem> & { id: string }) {
    return alova.Put<ThirdSystem>('/third-system/update', data);
  },
  toggleStatus(id: string, status: 'active' | 'disabled') {
    return alova.Post<ThirdSystem>('/third-system/toggle-status', { id, status });
  },
};

/** 任务类型规则 API */
export const taskTypeApi = {
  list() {
    return alova.Get<TaskTypeRule[]>('/task-type/list');
  },
  update(data: Partial<TaskTypeRule> & { id: string }) {
    return alova.Put<TaskTypeRule>('/task-type/update', data);
  },
  toggleStatus(id: string, enabled: boolean) {
    return alova.Post<TaskTypeRule>('/task-type/toggle-status', { id, enabled });
  },
};

/** 系统设置 API */
export const settingsApi = {
  get() {
    return alova.Get<SystemSettings>('/settings');
  },
  update(data: Partial<SystemSettings>) {
    return alova.Put<SystemSettings>('/settings', data);
  },
};
