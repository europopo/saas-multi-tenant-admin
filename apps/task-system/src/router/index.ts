/**
 * 任务子系统路由配置
 */
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/task',
    component: () => import('@/layouts/TaskLayout.vue'),
    redirect: '/task/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'task-dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '任务看板', code: 'task:read' },
      },
      {
        path: 'list',
        name: 'task-list',
        component: () => import('@/views/task/index.vue'),
        meta: { title: '任务管理', code: 'task:read' },
      },
      {
        path: 'settings/third-system',
        name: 'third-system',
        component: () => import('@/views/settings/third-system.vue'),
        meta: { title: '第三方系统', code: 'task:read' },
      },
      {
        path: 'settings/task-type',
        name: 'task-type',
        component: () => import('@/views/settings/task-type.vue'),
        meta: { title: '任务类型规则', code: 'task:read' },
      },
      {
        path: 'settings/base',
        name: 'base-settings',
        component: () => import('@/views/settings/base.vue'),
        meta: { title: '基础设置', code: 'task:read' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/task/dashboard',
  },
];

const router = createRouter({
  // 路由 base 与 vite build.base 保持一致，支持子目录部署
  history: createWebHistory(import.meta.env.VITE_APP_BASE || '/'),
  routes,
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  // 跨应用跳转单点登录：从 URL 参数导入门户传来的登录态
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

  if (to.meta.public === true) {
    next();
    return;
  }
  if (!auth.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } });
    return;
  }
  const code = to.meta.code as string | undefined;
  if (code && !auth.hasPermission(code)) {
    next('/task/dashboard');
    return;
  }
  next();
});

export default router;
