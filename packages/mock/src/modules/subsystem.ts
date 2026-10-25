/**
 * 子系统领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { Subsystem } from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, buildSubsystemMenuSeed } from '@saas/shared';
import { db, resolveUserAuth } from '../db';

export default defineMock({
  /**
   * 子系统列表（按当前用户角色过滤可见性）。
   * 传入 userId 时，按该用户角色的「权限域 + 可访问子系统」过滤；
   * 不传则返回全部（兼容平台级/无鉴权场景）。
   */
  '/subsystem/list': ({ query }) => {
    const userId = (query as { userId?: string }).userId;
    if (userId) {
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        const resolved = resolveUserAuth(user);
        if (resolved.scope === 'platform') {
          return RESPONSE.success<Subsystem[]>(db.subsystems);
        }
        const allowed = new Set(resolved.accessibleSubsystems ?? []);
        // 门户自身始终可见；其余按角色授权过滤
        const list = db.subsystems.filter((s) => s.code === 'portal' || allowed.has(s.code));
        return RESPONSE.success<Subsystem[]>(list);
      }
    }
    return RESPONSE.success<Subsystem[]>(db.subsystems);
  },

  /** 子系统详情 */
  '/subsystem/{id}': ({ params }) => {
    const sub = db.subsystems.find((s) => s.id === params.id);
    if (!sub) return RESPONSE.error('子系统不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<Subsystem>(sub);
  },

  /** 创建子系统 */
  '[POST]/subsystem/create': ({ data }) => {
    const body = data as Partial<Subsystem>;
    if (!body.name || !body.code) {
      return RESPONSE.error('子系统名称和编码不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.subsystems.some((s) => s.code === body.code)) {
      return RESPONSE.error('编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const sub: Subsystem = {
      id: generateId('sub'),
      name: body.name,
      code: body.code,
      description: body.description ?? '',
      icon: body.icon ?? 'Grid',
      entryUrl: body.entryUrl ?? '/',
      status: body.status ?? 'active',
      createdAt: new Date().toISOString(),
    };
    db.subsystems.push(sub);
    // 联动：为新增子系统初始化默认菜单（写入 db.menus，权限配置/侧边栏自动出现）
    if (!db.menus.some((m) => m.subsystemCode === sub.code)) {
      db.menus.push(...buildSubsystemMenuSeed(sub.code, sub.name));
    }
    return RESPONSE.success<Subsystem>(sub, '创建成功');
  },

  /** 更新子系统 */
  '[PUT]/subsystem/update': ({ data }) => {
    const body = data as Partial<Subsystem> & { id: string };
    const idx = db.subsystems.findIndex((s) => s.id === body.id);
    if (idx === -1) return RESPONSE.error('子系统不存在', BUSINESS_CODE.NOT_FOUND);
    db.subsystems[idx] = { ...db.subsystems[idx]!, ...body, id: body.id };
    return RESPONSE.success<Subsystem>(db.subsystems[idx]!, '更新成功');
  },

  /** 子系统启停 */
  '[POST]/subsystem/toggle-status': ({ data }) => {
    const { id, status } = data as { id: string; status: 'active' | 'disabled' };
    const sub = db.subsystems.find((s) => s.id === id);
    if (!sub) return RESPONSE.error('子系统不存在', BUSINESS_CODE.NOT_FOUND);
    sub.status = status;
    return RESPONSE.success<Subsystem>(sub, status === 'active' ? '已启用' : '已停用');
  },
});
