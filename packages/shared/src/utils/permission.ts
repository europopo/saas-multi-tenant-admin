/**
 * 权限相关工具函数
 */

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
