/**
 * Alova 实例工厂
 *
 * 设计说明：
 * - 通过 createApiClient 工厂函数创建 Alova 实例，支持注入不同的请求适配器。
 * - 开发环境注入 Mock 适配器（来自 @saas/mock），生产环境使用 alova/fetch 真实请求。
 * - 通过 requestAdapter 注入避免 api-client 反向依赖 mock 包，保持依赖单向。
 */
import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import adapterFetch, { type FetchRequestAdapter } from 'alova/fetch';
import { createRequestInterceptor, createResponseInterceptor } from './interceptors';

export interface CreateApiClientOptions {
  baseURL?: string;
  /** 请求适配器（默认为真实 fetch 适配器；开发环境由应用层注入 mock 适配器） */
  requestAdapter?: FetchRequestAdapter;
  /** 获取认证 token 的函数 */
  getToken?: () => string | null;
  /** 请求超时时间（毫秒） */
  timeout?: number;
}

/**
 * 创建 Alova 实例
 */
export function createApiClient(options: CreateApiClientOptions = {}) {
  const { baseURL = '/api', requestAdapter, getToken = () => null, timeout = 10_000 } = options;

  const instance = createAlova({
    baseURL,
    requestAdapter: requestAdapter ?? adapterFetch(),
    statesHook: VueHook,
    timeout,
    beforeRequest: createRequestInterceptor(getToken),
    responded: createResponseInterceptor,
  });

  return instance;
}

/** 默认导出：无 mock 的真实请求实例 */
export const defaultApiClient = createApiClient();
