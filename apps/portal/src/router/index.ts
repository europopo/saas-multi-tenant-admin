/**
 * 门户路由配置
 */
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { registerDynamicRoutes } from './dynamic';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/sso/login',
    name: 'sso-login',
    component: () => import('@/views/sso/login.vue'),
    meta: { title: '企业单点登录', public: true },
  },
  {
    path: '/sso/callback',
    name: 'sso-callback',
    component: () => import('@/views/sso/callback.vue'),
    meta: { title: 'SSO 登录中', public: true },
  },
  {
    path: '/',
    name: 'portal-layout',
    component: () => import('@/layouts/PortalLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        // 仪表盘为登录后默认落地页，对所有登录用户开放，不设权限码校验
        meta: { title: '仪表盘' },
      },
      {
        path: 'tenant/list',
        name: 'tenant-list',
        component: () => import('@/views/tenant/index.vue'),
        meta: { title: '租户列表', code: 'tenant:read' },
      },
      {
        path: 'subsystem/list',
        name: 'subsystem-list',
        component: () => import('@/views/subsystem/index.vue'),
        meta: { title: '子系统列表', code: 'subsystem:read' },
      },
      {
        // 通用子系统落地页：动态承载任意子系统（含后续新增的子系统）
        path: 'subsystem/:code',
        name: 'subsystem-entry',
        component: () => import('@/views/subsystem/entry.vue'),
        meta: { title: '子系统' },
      },
      {
        path: 'user/list',
        name: 'user-list',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户管理', code: 'user:read' },
      },
      {
        path: 'role/list',
        name: 'role-list',
        component: () => import('@/views/role/index.vue'),
        meta: { title: '角色管理', code: 'role:read' },
      },
      {
        path: 'system/menu',
        name: 'system-menu',
        component: () => import('@/views/system/menu/index.vue'),
        meta: { title: '菜单管理', code: 'system:menu:read' },
      },
      {
        path: 'dict',
        name: 'dict',
        component: () => import('@/views/dict/index.vue'),
        meta: { title: '数据字典', code: 'dict' },
      },
      {
        path: 'notice',
        name: 'notice',
        component: () => import('@/views/notice/index.vue'),
        meta: { title: '站内信', code: 'notice' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '设置' },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '权限不足', public: true },
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/** 是否已完成动态路由注册 */
let dynamicRoutesRegistered = false;

/** 路由守卫 */
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  // 跨应用跳转单点登录：从 URL 参数导入子系统传来的登录态
  const tokenParam = to.query.token as string | undefined;
  const userParam = to.query.user as string | undefined;
  if (tokenParam && !auth.isLoggedIn) {
    auth.importSession(tokenParam, userParam ?? '');
    // 导入后清理 URL 参数，避免 token 暴露在地址栏
    const cleanQuery = { ...to.query };
    delete cleanQuery.token;
    delete cleanQuery.user;
    next({ path: to.path, query: cleanQuery, replace: true });
    return;
  }

  const isPublic = to.meta.public === true;

  if (isPublic) {
    // 已登录访问登录页则跳转首页
    if (to.path === '/login' && auth.isLoggedIn) {
      next('/dashboard');
      return;
    }
    next();
    return;
  }

  // 未登录跳转登录页
  if (!auth.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } });
    return;
  }

  // 登录后动态注册菜单路由（仅首次）
  if (!dynamicRoutesRegistered) {
    dynamicRoutesRegistered = true;
    registerDynamicRoutes(router).then(() => {
      // 动态路由注册完成后，若目标路由此刻才可用则放行，否则继续权限校验
      if (to.matched.length === 0) {
        next({ ...to, replace: true });
        return;
      }
      proceedWithPermission();
    });
    return;
  }

  proceedWithPermission();

  function proceedWithPermission() {
    // 权限码校验
    const code = to.meta.code as string | undefined;
    if (code && !auth.hasPermission(code) && !auth.isPlatformAdmin) {
      next('/403');
      return;
    }
    next();
  }
});

export default router;
