/**
 * 通用工具函数
 */

/** 生成唯一 id（基于时间戳 + 随机数） */
export function generateId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

/** 判断是否为空值（null / undefined / 空字符串） */
export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** 深度克隆（仅用于纯数据，避免循环引用） */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 服务端风格分页切片 */
export function paginate<T>(
  list: T[],
  page: number,
  pageSize: number,
): { list: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
  };
}

/** 防抖 */
export function debounce<T extends (...args: never[]) => void>(fn: T, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** 节流 */
export function throttle<T extends (...args: never[]) => void>(fn: T, wait = 300) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  };
}
