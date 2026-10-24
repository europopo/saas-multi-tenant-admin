/**
 * Alova 请求/响应拦截器
 */
import { BUSINESS_CODE } from '@saas/shared';

/** 业务错误类 */
export class BusinessError extends Error {
  code: number;
  traceId?: string;

  constructor(code: number, message: string, traceId?: string) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.traceId = traceId;
  }
}

/** 请求拦截器：注入认证 token */
export function createRequestInterceptor(getToken: () => string | null) {
  return (config: any): any => {
    const token = getToken();
    const headers = { ...(config.headers ?? {}) };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return { ...config, headers };
  };
}

/**
 * 响应拦截器：统一解包标准响应结构，抛出业务错误
 * 返回 resolved 的值直接就是 data 字段，页面无需再手动判断 code。
 */
export async function createResponseInterceptor<T>(response: any): Promise<T> {
  // Alova fetch 适配器返回 Response 实例，需要先读取 json
  let payload = response;
  if (typeof response?.json === 'function') {
    payload = await response.json();
  }
  const body = payload as { code: number; message: string; data: T; traceId?: string };

  if (body.code === BUSINESS_CODE.UNAUTHORIZED) {
    // 触发全局登出事件（仅浏览器环境）
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new BusinessError(body.code, body.message || '登录已失效', body.traceId);
  }
  if (body.code !== BUSINESS_CODE.SUCCESS) {
    throw new BusinessError(body.code, body.message || '请求失败', body.traceId);
  }
  return body.data;
}
