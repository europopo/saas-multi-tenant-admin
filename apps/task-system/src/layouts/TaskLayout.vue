<script setup lang="ts">
/**
 * 任务子系统布局
 * 复用 AppLayout，与门户共用顶部子系统导航栏。
 */
import { computed, provide, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { AppLayout } from '@saas/layouts';
import { buildMenuTree, type Subsystem } from '@saas/shared';
import { useAuthStore } from '@/stores/auth';
import { subsystemApi } from '@/api';
import { TASK_MENUS } from '@/router/menus';

const auth = useAuthStore();
const router = useRouter();

const subsystems = ref<Subsystem[]>([]);

provide(
  'user:permissions',
  computed(() => auth.user?.permissions ?? []),
);

const menus = buildMenuTree(TASK_MENUS);
const username = computed(() => auth.user?.nickname ?? '');
const avatar = computed(() => auth.user?.avatar ?? '');

onMounted(async () => {
  try {
    subsystems.value = await subsystemApi.list().send();
  } catch {
    // 忽略
  }
});

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}

function handleToggleTenant() {
  ElMessage.info('租户切换由门户统一管理');
}

/**
 * 切换子系统（顶部导航，与门户共用）
 */
function handleSelectSubsystem(sub: Subsystem) {
  if (sub.code === 'portal') {
    const token = auth.token ?? '';
    const user = auth.user ? encodeURIComponent(JSON.stringify(auth.user)) : '';
    const query = `token=${encodeURIComponent(token)}&user=${user}`;
    // 门户入口地址可通过 VITE_PORTAL_URL 配置（如 http://host/portal/），
    // 未配置时回退到同主机 5173 端口的开发地址。
    const portalBase = import.meta.env.VITE_PORTAL_URL || `http://${window.location.hostname}:5173`;
    window.location.href = `${portalBase}/?${query}`;
    return;
  }
  if (sub.status !== 'active') {
    ElMessage.info(`「${sub.name}」已停用`);
    return;
  }
  // 当前已在任务子系统
  if (sub.code === 'task-system') {
    router.push('/task/dashboard');
    return;
  }
  ElMessage.info(`「${sub.name}」子系统为演示占位，暂未接入`);
}
</script>

<template>
  <AppLayout
    :menus="menus"
    logo-text="任务管理"
    :username="username"
    :avatar="avatar"
    :subsystems="subsystems"
    active-subsystem-code="task-system"
    @logout="handleLogout"
    @toggle-tenant="handleToggleTenant"
    @select-subsystem="handleSelectSubsystem"
  >
    <router-view />
  </AppLayout>
</template>
