/**
 * 租户一键开通 + 租户管理员权限 测试
 * 验证：创建租户自动生成 TENANT_ADMIN 角色 + 管理员用户，且管理员登录后权限正确。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createApiClient } from '@saas/api-client';
import { createMockAdapter } from '../src/adapter';
import { resetDatabase, db, buildTenantAdminPermissions } from '../src/db';
import type { Tenant, Role, LoginResult } from '@saas/shared';

function createMockClient() {
  return createApiClient({
    baseURL: '/api',
    requestAdapter: createMockAdapter(true),
    getToken: () => null,
  });
}

describe('tenant onboarding (mock)', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('创建租户自动生成租户管理员角色与用户，且管理员可登录', async () => {
    const alova = createMockClient();
    const code = `test-tenant-${Date.now()}`;

    // 1. 创建租户（勾选任务管理子系统）
    const tenant = await alova
      .Post<Tenant>('/tenant/create', {
        name: '测试租户',
        code,
        subsystemIds: ['sub-task'],
      })
      .send();

    expect(tenant.id).toBeTruthy();
    expect(tenant.subsystemIds).toContain('sub-task');
    expect(tenant.userCount).toBe(1);

    // 2. 自动生成了管理员角色
    const adminRole = db.roles.find((r) => r.tenantId === tenant.id);
    expect(adminRole).toBeTruthy();
    expect(adminRole!.scope).toBe('tenant');
    expect(adminRole!.code).toBe('tenant_admin');
    // 权限包含 dashboard + user/role 管理菜单（scope=common）
    expect(adminRole!.menuCodes).toContain('dashboard');
    expect(adminRole!.menuCodes).toContain('user');
    expect(adminRole!.menuCodes).toContain('user-list');
    expect(adminRole!.menuCodes).toContain('role-list');
    // 权限包含已选子系统 task-system 的菜单
    expect(adminRole!.subsystemPermissions!.some((sp) => sp.subsystemCode === 'task-system')).toBe(true);

    // 3. 自动生成了管理员用户
    const adminUser = db.users.find((u) => u.tenantId === tenant.id);
    expect(adminUser).toBeTruthy();
    expect(adminUser!.username).toBe(`${code}-admin`);
    expect(adminUser!.roleIds).toContain(adminRole!.id);

    // 4. 新管理员可用默认密码登录
    const result = await alova.Post<LoginResult>('/auth/login', {
      username: `${code}-admin`,
      password: 'admin123',
    }).send();
    expect(result.user.username).toBe(`${code}-admin`);
    expect(result.user.isPlatformAdmin).toBe(false);
    // 租户管理员聚合出的权限域应为 tenant
    expect(result.user.scope).toBe('tenant');
    // 能看到 user/role 管理菜单权限
    expect(result.user.permissions).toContain('user');
    expect(result.user.permissions).toContain('user-list');
    expect(result.user.permissions).toContain('role-list');
    // 可访问 task-system 子系统
    expect(result.user.accessibleSubsystems).toContain('task-system');
  });

  it('buildTenantAdminPermissions 授予 dashboard 与用户/角色管理，但不含平台级菜单', () => {
    const perms = buildTenantAdminPermissions(['sub-task']);
    // 包含通用菜单
    expect(perms.menuCodes).toContain('dashboard');
    expect(perms.menuCodes).toContain('user');
    expect(perms.menuCodes).toContain('role-list');
    // 不包含平台级菜单（tenant/subsystem/system）
    expect(perms.menuCodes).not.toContain('tenant');
    expect(perms.menuCodes).not.toContain('subsystem');
    expect(perms.menuCodes).not.toContain('system');
    // 包含 task-system 分组
    expect(perms.subsystemPermissions.some((sp) => sp.subsystemCode === 'task-system')).toBe(true);
  });

  it('租户级角色带 tenantId，平台级角色 tenantId 为 null', () => {
    const platformRole = db.roles.find((r) => r.code === 'platform_admin');
    const tenantRole = db.roles.find((r) => r.code === 'tenant_admin');
    expect(platformRole!.tenantId).toBeNull();
    expect(tenantRole!.tenantId).toBe('tenant-demo');
  });

  it('角色列表按 userId 做租户数据隔离', async () => {
    const alova = createMockClient();
    // member 用户（租户级，tenant-demo）
    const memberRoles = await alova
      .Get<Role[]>('/role/list', { params: { userId: 'user-member' } })
      .send();
    // 只返回 tenant-demo 的租户级角色，不含平台级角色
    expect(memberRoles.some((r) => r.code === 'platform_admin')).toBe(false);
    expect(memberRoles.every((r) => r.tenantId === 'tenant-demo')).toBe(true);
  });
});
