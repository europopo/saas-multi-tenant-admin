/**
 * 门户 Alova 实例
 *
 * 说明：本项目当前"全部为前端模拟数据"，无真实后端，
 * 因此无论在开发环境还是构建产物中，均注入 Mock 适配器，
 * 否则构建产物（import.meta.env.PROD）下登录等请求会打到
 * /api 真实接口而返回 404，导致功能不可用。
 */
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '@saas/mock';

/** 获取认证 token（从 localStorage 读取） */
function getToken(): string | null {
  return localStorage.getItem('saas_token');
}

/** 创建 Alova 实例（始终启用 Mock 适配器） */
export const alova = createApiClient({
  baseURL: '/api',
  requestAdapter: createMockAdapter(true),
  getToken,
});
