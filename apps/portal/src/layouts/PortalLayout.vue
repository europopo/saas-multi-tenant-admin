<script setup lang="ts">
/**
 * 门户整体布局
 * 基于 @saas/layouts 的 AppLayout，注入门户菜单、顶部子系统导航与租户切换。
 */
import { computed, onMounted, onUnmounted, provide, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { AppLayout } from '@saas/layouts';
import type { MenuItem, Subsystem, Tenant } from '@saas/shared';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useSubsystemStore } from '@/stores/subsystem';
import { menuApi, subsystemApi } from '@/api';

const auth = useAuthStore();
const tenantStore = useTenantStore();
const subsystemStore = useSubsystemStore();
const router = useRouter();

// 向子组件提供权限
provide(
  'user:permissions',
  computed(() => auth.user?.permissions ?? []),
);

// 动态菜单：从菜单表拉取门户可见菜单，按权限过滤后构建侧边栏树
const portalMenus = ref<MenuItem[]>([]);
const menus = computed<MenuItem[]>(() => {
  if (auth.isPlatformAdmin) return stripButtons(portalMenus.value);
  return filterMenusByPermission(portalMenus.value);
});

/** 移除按钮节点（按钮不进侧边栏） */
function stripButtons(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    if (item.type === 'button') continue;
    if (item.children?.length) {
      result.push({ ...item, children: stripButtons(item.children) });
    } else {
      result.push(item);
    }
  }
  return result;
}

async function loadMenus() {
  try {
    portalMenus.value = await menuApi.tree({ subsystemCode: 'portal', visibleOnly: true }).send();
  } catch {
    // 菜单加载失败保持空，静态路由兜底
  }
}

function filterMenusByPermission(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    // 按钮不进侧边栏
    if (item.type === 'button') continue;
    if (item.children?.length) {
      const children = filterMenusByPermission(item.children);
      if (children.length === 0 && !auth.hasPermission(item.code)) continue;
      result.push({ ...item, children });
      continue;
    }
    // 叶子菜单：需拥有对应菜单码权限
    if (auth.hasPermission(item.code)) {
      result.push(item);
    }
  }
  return result;
}

const username = computed(() => auth.user?.nickname ?? '');
const avatar = computed(() => auth.user?.avatar ?? '');

onMounted(async () => {
  await tenantStore.loadTenants();
  await subsystemStore.loadSubsystems();
  await loadMenus();
  // 默认当前租户
  if (!tenantStore.currentTenant && auth.user) {
    const t = tenantStore.allTenants.find((x) => x.id === auth.user!.tenantId);
    tenantStore.setCurrentTenant(t ?? null);
  }
  // 监听菜单变更事件（菜单管理页增删改后触发），重新加载侧边栏菜单
  window.addEventListener('menu:changed', loadMenus);
});

// 组件卸载时移除监听（SPA 中布局常驻，此处兜底）
onUnmounted(() => {
  window.removeEventListener('menu:changed', loadMenus);
});

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}

async function handleSelectTenant(tenant: Tenant) {
  tenantStore.setCurrentTenant(tenant);
  ElMessage.success(`已切换到租户「${tenant.name}」`);
  const accessible = await subsystemApi.accessible(tenant.id).send();
  console.log('当前租户可访问子系统：', accessible);
}

/**
 * 切换子系统（顶部导航）
 * - 门户自身（portal）：SPA 跳转到仪表盘
 * - task-system：独立应用，跨端口跳转（URL 携带登录态实现单点登录）
 * - 其余子系统（含动态新增）：统一走动态路由 /subsystem/:code 进入内嵌页
 */
function handleSelectSubsystem(sub: Subsystem) {
  if (sub.code === 'portal') {
    router.push('/dashboard');
    return;
  }
  if (sub.status !== 'active') {
    ElMessage.info(`「${sub.name}」已停用`);
    return;
  }
  // 任务管理子系统为独立应用，跳转到其入口，并通过 URL 携带登录态实现跨端口单点登录
  if (sub.code === 'task-system') {
    const token = auth.token ?? '';
    const user = auth.user ? encodeURIComponent(JSON.stringify(auth.user)) : '';
    const query = `token=${encodeURIComponent(token)}&user=${user}`;
    window.location.href = `http://${window.location.hostname}:5174/task?${query}`;
    return;
  }
  // 动态路由：任意子系统（含新增）统一跳转到 /subsystem/:code
  router.push(`/subsystem/${sub.code}`);
}
</script>

<template>
  <AppLayout
    :menus="menus"
    logo-text="SaaS 平台"
    :username="username"
    :avatar="avatar"
    :subsystems="subsystemStore.subsystems"
    active-subsystem-code="portal"
    :tenants="tenantStore.allTenants"
    :current-tenant-id="tenantStore.currentTenant?.id"
    @logout="handleLogout"
    @select-tenant="handleSelectTenant"
    @select-subsystem="handleSelectSubsystem"
  >
    <router-view />
  </AppLayout>
</template>
