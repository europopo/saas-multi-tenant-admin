/**
 * 权限相关工具函数
 */
import type { MenuItem, Role, RoleScope } from '../types/auth';

/** 判断是否拥有某个权限编码 */
export function hasPermission(permissions: string[], code: string): boolean {
  if (!permissions || permissions.length === 0) return false;
  // 支持通配符：* 或 module:* 匹配 module:read
  return permissions.some((p) => {
    if (p === '*' || p === code) return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -1);
      return code.startsWith(prefix);
    }
    return false;
  });
}

/** 判断是否拥有任一角色编码 */
export function hasRole(roles: string[], roleCode: string | string[]): boolean {
  const codes = Array.isArray(roleCode) ? roleCode : [roleCode];
  return roles.some((r) => codes.includes(r));
}

/** 判断是否为平台管理员（拥有 platform 域权限或超级管理员角色） */
export function isPlatformAdminUser(roles: string[], permissions: string[]): boolean {
  return hasRole(roles, 'platform_admin') || hasPermission(permissions, 'platform:*');
}

/**
 * 判断某个菜单节点是否属于「平台级」。
 * 数据驱动：依据菜单自身的 scope 字段（platform），不再依赖编码前缀写死匹配。
 * scope 缺失时回退为 common（视为非平台级）。
 */
export function isPlatformMenuItem(item: MenuItem): boolean {
  return item.scope === 'platform';
}

/**
 * 聚合多个角色的权限域：任一角色为 platform 即返回 platform，否则 tenant。
 */
export function aggregateScope(roles: Role[]): RoleScope {
  return roles.some((r) => r.scope === 'platform') ? 'platform' : 'tenant';
}

/**
 * 从多个角色的 subsystemPermissions 聚合「可访问的子系统编码集合」。
 * - 若任一角色为 platform 域，返回 null（表示全部子系统）。
 * - 否则返回各角色授权子系统编码的并集。
 */
export function aggregateAccessibleSubsystems(roles: Role[]): string[] | null {
  const isPlatform = roles.some((r) => r.scope === 'platform');
  if (isPlatform) return null; // 平台级：全部
  const codes = new Set<string>();
  for (const r of roles) {
    for (const sp of r.subsystemPermissions ?? []) {
      if (sp.subsystemCode) codes.add(sp.subsystemCode);
    }
  }
  return Array.from(codes);
}
