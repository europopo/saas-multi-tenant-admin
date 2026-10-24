/**
 * 业务状态码常量
 */
export const BUSINESS_CODE = {
  SUCCESS: 0,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
} as const;

/**
 * 统一响应构建
 */
export const RESPONSE = {
  success<T>(data: T, message = 'ok') {
    return { code: BUSINESS_CODE.SUCCESS, message, data };
  },
  error(message: string, code: number = BUSINESS_CODE.SERVER_ERROR, data: unknown = null) {
    return { code, message, data };
  },
} as const;
