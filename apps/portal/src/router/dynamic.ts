/**
 * 动态路由注册
 * 登录后根据用户可见菜单（menu 类型）动态注册路由。
 * 数据源：menuApi.tree（db.menus），组件通过 componentMap 解析。
 */
import type { Router, RouteRecordRaw } from 'vue-router';
import type { MenuItem } from '@saas/shared';
import { menuApi } from '@/api';
import { resolveComponent } from './componentMap';

/** 已注册的动态路由 path 集合（避免重复注册） */
const registered = new Set<string>();

/**
 * 将菜单树（仅 menu 类型节点）转为路由记录。
 * dir 节点不直接对应路由，仅作侧边栏分组；button 节点不进路由。
 */
function menuToRoute(menu: MenuItem): RouteRecordRaw | null {
  if (menu.type !== 'menu' || !menu.path) return null;
  const loader = resolveComponent(menu.component);
  if (!loader) return null;
  return {
    path: menu.path,
    name: menu.code,
    component: loader,
    meta: { title: menu.name, code: menu.code },
  };
}

/** 收集菜单树中所有 menu 节点（递归） */
function collectMenuNodes(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    if (item.type === 'menu') result.push(item);
    if (item.children?.length) result.push(...collectMenuNodes(item.children));
  }
  return result;
}

/**
 * 动态注册路由（在登录后 / 刷新时调用）。
 * 从后端菜单表拉取可见菜单，逐个 addRoute 到门户布局下。
 */
export async function registerDynamicRoutes(router: Router): Promise<void> {
  try {
    const trees = await menuApi.tree({ visibleOnly: true }).send();
    const menuNodes = collectMenuNodes(trees);
    for (const node of menuNodes) {
      if (registered.has(node.path!)) continue;
      const route = menuToRoute(node);
      if (!route) continue;
      // 注册到根路径（PortalLayout 为 '/' 的子路由）
      router.addRoute('portal-layout', route);
      registered.add(node.path!);
    }
  } catch {
    // 动态路由注册失败不阻塞，静态路由兜底
  }
}

/** 清理已注册记录（登出时调用） */
export function clearRegisteredRoutes(): void {
  registered.clear();
}
