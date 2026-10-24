/**
 * Mock 请求适配器组装
 *
 * 将所有领域 Mock 接口注册到一个 Alova Mock 适配器，
 * 由应用层在开发环境注入到 Alova 实例。
 */
import { createAlovaMockAdapter } from '@alova/mock';
import adapterFetch from 'alova/fetch';
import authMock from './modules/auth';
import tenantMock from './modules/tenant';
import subsystemMock from './modules/subsystem';
import userMock from './modules/user';
import menuMock from './modules/menu';
import taskMock from './modules/task';
import dashboardMock from './modules/dashboard';
import ssoMock from './modules/sso';

/**
 * 创建 Mock 适配器
 * @param enabled 是否启用 mock（生产环境传 false）
 */
export function createMockAdapter(enabled = true) {
  return createAlovaMockAdapter(
    [authMock, tenantMock, subsystemMock, userMock, menuMock, taskMock, dashboardMock, ssoMock],
    {
      enable: enabled,
      httpAdapter: adapterFetch(),
      // 关键：mock key 以业务路径（如 /auth/login）定义，
      // 使用 methodurl 匹配模式按 method.url（不含 baseURL /api）匹配，
      // 否则会因 baseURL 前缀导致 mock 无法命中。
      matchMode: 'methodurl',
      delay: 300,
      // 默认 onMockResponse 会把数据包装成 Response 实例，
      // 这里直接把 body 透传给 responded 拦截器做统一解包
      onMockResponse(response) {
        return {
          response: response.body,
          headers: new Headers(),
        };
      },
      mockRequestLogger: false,
    },
  );
}
