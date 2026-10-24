/**
 * 用户、角色与权限领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { UserInfo, Role, PageResult, UserStatus } from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, paginate } from '@saas/shared';
import { db } from '../db';

/** 用户查询参数 */
interface UserQuery {
  keyword?: string;
  status?: UserStatus | '';
  page: number;
  pageSize: number;
}

export default defineMock({
  /** 用户列表 */
  '/user/list': ({ query }) => {
    const q = query as unknown as UserQuery & Record<string, string>;
    const keyword = (q.keyword ?? '').trim();
    const status = q.status ?? '';
    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 10;

    let list = [...db.users];
    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(k) ||
          u.nickname.toLowerCase().includes(k) ||
          u.email.toLowerCase().includes(k),
      );
    }
    if (status) list = list.filter((u) => u.status === status);

    const result = paginate(list, page, pageSize);
    return RESPONSE.success<PageResult<UserInfo>>({
      list: result.list,
      total: result.total,
      page,
      pageSize,
    });
  },

  /** 用户详情 */
  '/user/{id}': ({ params }) => {
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<UserInfo>(user);
  },

  /** 创建用户 */
  '[POST]/user/create': ({ data }) => {
    const body = data as Partial<UserInfo>;
    if (!body.username || !body.nickname) {
      return RESPONSE.error('用户名和昵称不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.users.some((u) => u.username === body.username)) {
      return RESPONSE.error('用户名已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const roleIds = body.roleIds ?? [];
    const roles = roleIds
      .map((rid) => db.roles.find((r) => r.id === rid)?.code)
      .filter(Boolean) as string[];
    // 用户权限 = 各角色「菜单码 ∪ 操作码」的并集（统一权限模型）
    const permissions = Array.from(
      new Set(
        roleIds.flatMap((rid) => {
          const role = db.roles.find((r) => r.id === rid);
          return [...(role?.menuCodes ?? []), ...(role?.permissionCodes ?? [])];
        }),
      ),
    );
    const user: UserInfo = {
      id: generateId('user'),
      username: body.username,
      nickname: body.nickname,
      avatar: '',
      email: body.email ?? '',
      phone: body.phone,
      status: body.status ?? 'active',
      roleIds,
      roles,
      permissions,
      tenantId: body.tenantId ?? 'tenant-demo',
      isPlatformAdmin: roles.includes('platform_admin'),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return RESPONSE.success<UserInfo>(user, '创建成功');
  },

  /** 更新用户 */
  '[PUT]/user/update': ({ data }) => {
    const body = data as Partial<UserInfo> & { id: string };
    const idx = db.users.findIndex((u) => u.id === body.id);
    if (idx === -1) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    const roleIds = body.roleIds ?? db.users[idx]!.roleIds;
    const roles = roleIds
      .map((rid) => db.roles.find((r) => r.id === rid)?.code)
      .filter(Boolean) as string[];
    const permissions = Array.from(
      new Set(
        roleIds.flatMap((rid) => {
          const role = db.roles.find((r) => r.id === rid);
          return [...(role?.menuCodes ?? []), ...(role?.permissionCodes ?? [])];
        }),
      ),
    );
    db.users[idx] = {
      ...db.users[idx]!,
      ...body,
      id: body.id,
      roleIds,
      roles,
      permissions,
      isPlatformAdmin: roles.includes('platform_admin'),
    };
    return RESPONSE.success<UserInfo>(db.users[idx]!, '更新成功');
  },

  /** 用户启停 */
  '[POST]/user/toggle-status': ({ data }) => {
    const { id, status } = data as { id: string; status: UserStatus };
    const user = db.users.find((u) => u.id === id);
    if (!user) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    user.status = status;
    return RESPONSE.success<UserInfo>(user, status === 'active' ? '已启用' : '已停用');
  },

  /** 删除用户 */
  '[DELETE]/user/{id}': ({ params }) => {
    const idx = db.users.findIndex((u) => u.id === params.id);
    if (idx === -1) return RESPONSE.error('用户不存在', BUSINESS_CODE.NOT_FOUND);
    const [removed] = db.users.splice(idx, 1);
    return RESPONSE.success<UserInfo>(removed!, '删除成功');
  },

  /** 角色列表 */
  '/role/list': () => {
    return RESPONSE.success<Role[]>(db.roles);
  },

  /** 角色详情 */
  '/role/{id}': ({ params }) => {
    const role = db.roles.find((r) => r.id === params.id);
    if (!role) return RESPONSE.error('角色不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<Role>(role);
  },

  /** 创建角色 */
  '[POST]/role/create': ({ data }) => {
    const body = data as Partial<Role>;
    if (!body.code || !body.name) {
      return RESPONSE.error('角色编码和名称不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.roles.some((r) => r.code === body.code)) {
      return RESPONSE.error('角色编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const role: Role = {
      id: generateId('role'),
      code: body.code,
      name: body.name,
      description: body.description ?? '',
      scope: body.scope ?? 'tenant',
      menuCodes: body.menuCodes ?? [],
      permissionCodes: body.permissionCodes ?? [],
      subsystemPermissions: body.subsystemPermissions ?? [],
      status: body.status ?? 'active',
      createdAt: new Date().toISOString(),
    };
    db.roles.push(role);
    return RESPONSE.success<Role>(role, '创建成功');
  },

  /** 更新角色 */
  '[PUT]/role/update': ({ data }) => {
    const body = data as Partial<Role> & { id: string };
    const idx = db.roles.findIndex((r) => r.id === body.id);
    if (idx === -1) return RESPONSE.error('角色不存在', BUSINESS_CODE.NOT_FOUND);
    // 若提交了按子系统分组的权限，则同步保留分组结构并聚合扁平码
    const next: Role = {
      ...db.roles[idx]!,
      ...body,
      id: body.id,
      subsystemPermissions: body.subsystemPermissions ?? db.roles[idx]!.subsystemPermissions ?? [],
    };
    db.roles[idx] = next;
    return RESPONSE.success<Role>(next, '更新成功');
  },

  /** 删除角色 */
  '[DELETE]/role/{id}': ({ params }) => {
    const idx = db.roles.findIndex((r) => r.id === params.id);
    if (idx === -1) return RESPONSE.error('角色不存在', BUSINESS_CODE.NOT_FOUND);
    const [removed] = db.roles.splice(idx, 1);
    return RESPONSE.success<Role>(removed!, '删除成功');
  },
});
