import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasRole,
  paginate,
  formatDuration,
  getDictLabel,
  TASK_STATUS_DICT,
} from '../src';

describe('hasPermission', () => {
  it('支持通配符 *', () => {
    expect(hasPermission(['*'], 'task:read')).toBe(true);
  });

  it('支持模块通配符 module:*', () => {
    expect(hasPermission(['task:*'], 'task:delete')).toBe(true);
    expect(hasPermission(['task:*'], 'user:read')).toBe(false);
  });

  it('精确匹配', () => {
    expect(hasPermission(['task:read'], 'task:read')).toBe(true);
    expect(hasPermission(['task:read'], 'task:write')).toBe(false);
  });

  it('空权限列表返回 false', () => {
    expect(hasPermission([], 'task:read')).toBe(false);
  });
});

describe('hasRole', () => {
  it('单角色匹配', () => {
    expect(hasRole(['platform_admin'], 'platform_admin')).toBe(true);
    expect(hasRole(['tenant_user'], 'platform_admin')).toBe(false);
  });

  it('多角色任一匹配', () => {
    expect(hasRole(['tenant_user'], ['platform_admin', 'tenant_user'])).toBe(true);
  });
});

describe('paginate', () => {
  const list = Array.from({ length: 25 }, (_, i) => i);

  it('正确分页', () => {
    const page1 = paginate(list, 1, 10);
    expect(page1.list.length).toBe(10);
    expect(page1.total).toBe(25);

    const page3 = paginate(list, 3, 10);
    expect(page3.list.length).toBe(5);
  });
});

describe('formatDuration', () => {
  it('小于 1 秒显示毫秒', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('显示秒', () => {
    expect(formatDuration(1500)).toBe('1.5s');
  });

  it('undefined 返回 -', () => {
    expect(formatDuration(undefined)).toBe('-');
  });
});

describe('getDictLabel', () => {
  it('根据 value 获取 label', () => {
    expect(getDictLabel(TASK_STATUS_DICT, 'success')).toBe('成功');
  });

  it('未匹配返回原值', () => {
    expect(getDictLabel(TASK_STATUS_DICT, 'unknown' as never)).toBe('unknown');
  });
});
