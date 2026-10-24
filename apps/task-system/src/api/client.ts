/**
 * 任务子系统 Alova 实例
 *
 * 说明：与门户一致，当前"全部为前端模拟数据"，无真实后端，
 * 因此始终注入 Mock 适配器，避免构建产物下请求打到 /api 返回 404。
 */
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '@saas/mock';

function getToken(): string | null {
  return localStorage.getItem('saas_token');
}

export const alova = createApiClient({
  baseURL: '/api',
  requestAdapter: createMockAdapter(true),
  getToken,
});
