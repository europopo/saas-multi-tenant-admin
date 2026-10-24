<script setup lang="ts">
/**
 * 企业级后台整体布局（参考主流 SaaS 设计）
 * 深色侧边栏 + 浅色内容区 + 顶部子系统导航栏。
 * 侧边栏承载当前子系统的功能菜单，顶部导航栏承载跨子系统的应用切换。
 */
import { ref, computed } from 'vue';
import type { MenuItem, Subsystem, Tenant } from '@saas/shared';
import SidebarNav from './SidebarNav.vue';
import Breadcrumb from './Breadcrumb.vue';
import TopNavBar from './TopNavBar.vue';

const props = defineProps<{
  /** 侧边栏菜单 */
  menus: MenuItem[];
  /** 系统 logo / 名称 */
  logoText?: string;
  /** 用户名 */
  username?: string;
  /** 用户头像 */
  avatar?: string;
  /** 顶部导航栏标题（可选） */
  headerTitle?: string;
  /** 子系统列表（顶部导航） */
  subsystems?: Subsystem[];
  /** 当前激活的子系统编码 */
  activeSubsystemCode?: string;
  /** 租户列表（顶部租户切换器） */
  tenants?: Tenant[];
  /** 当前租户 id */
  currentTenantId?: string;
}>();

const emit = defineEmits<{
  (e: 'logout'): void;
  (e: 'toggle-tenant'): void;
  (e: 'select-subsystem', subsystem: Subsystem): void;
  (e: 'select-tenant', tenant: Tenant): void;
}>();

const collapsed = ref(false);

const initial = computed(() => (props.username ?? '?').charAt(0).toUpperCase());

// 租户切换器搜索
const tenantKeyword = ref('');

const currentTenant = computed(() =>
  (props.tenants ?? []).find((t) => t.id === props.currentTenantId) ?? null,
);

const filteredTenants = computed(() => {
  const k = tenantKeyword.value.trim().toLowerCase();
  if (!k) return props.tenants ?? [];
  return (props.tenants ?? []).filter(
    (t) => t.name.toLowerCase().includes(k) || t.code.toLowerCase().includes(k),
  );
});

function selectTenant(t: Tenant) {
  tenantKeyword.value = '';
  emit('select-tenant', t);
}

// 主题切换（light/dark，与 portal/task-system 共用，持久化到 localStorage）
const THEME_KEY = 'saas_theme';
const isDark = ref(document.documentElement.classList.contains('dark'));

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light');
}

function onCommand(command: string) {
  if (command === 'logout') emit('logout');
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <!-- 侧边栏 -->
    <aside
      class="flex flex-col bg-sidebar-bg text-sidebar-text transition-all duration-300 shrink-0"
      :style="{ width: collapsed ? '64px' : '240px' }"
    >
      <div class="h-14 flex items-center justify-center border-b border-white/10">
        <div class="flex items-center gap-2 px-4 overflow-hidden">
          <div
            class="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0"
          >
            {{ (logoText ?? 'S').charAt(0) }}
          </div>
          <span v-if="!collapsed" class="text-white font-semibold whitespace-nowrap">{{
            logoText
          }}</span>
        </div>
      </div>
      <SidebarNav :menus="menus" :collapsed="collapsed" dark />
      <!-- 收起/展开菜单：固定于侧边栏底部 -->
      <div class="mt-auto p-3 border-t border-white/10 shrink-0">
        <button
          class="w-full flex items-center justify-center gap-2 text-xs text-sidebar-text hover:text-white py-2 rounded transition-colors"
          @click="collapsed = !collapsed"
        >
          <el-icon><component :is="collapsed ? 'Expand' : 'Fold'" /></el-icon>
          <span v-if="!collapsed">收起菜单</span>
        </button>
      </div>
    </aside>

    <!-- 主体 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 顶栏：左侧面包屑 + 中部子系统导航 + 右侧操作区 -->
      <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 gap-4">
        <!-- 左侧：logo 快捷入口（折叠时展示） -->
        <div class="flex items-center gap-3">
          <TopNavBar
            v-if="subsystems && subsystems.length"
            :subsystems="subsystems"
            :active-code="activeSubsystemCode"
            @select="(s) => emit('select-subsystem', s)"
          />
        </div>

        <!-- 右侧：租户切换 + 主题切换 + 通知 + 用户菜单 -->
        <div class="flex items-center gap-4 shrink-0">
          <!-- 租户切换器（下拉 + 搜索 + 当前标识） -->
          <el-dropdown
            v-if="tenants && tenants.length"
            trigger="click"
            popper-class="tenant-switcher"
            @command="selectTenant"
          >
            <div
              class="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div
                class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0"
              >
                {{ (currentTenant?.name ?? '?').charAt(0) }}
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-200 max-w-[140px] truncate">
                {{ currentTenant?.name ?? '选择租户' }}
              </span>
              <el-icon class="text-gray-400"><component :is="'ArrowDown'" /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="px-3 pt-2 pb-1" @click.stop>
                  <el-input
                    v-model="tenantKeyword"
                    placeholder="搜索租户"
                    size="small"
                    clearable
                  >
                    <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
                </div>
                <el-scrollbar max-height="240px">
                  <el-dropdown-item
                    v-for="t in filteredTenants"
                    :key="t.id"
                    :command="t"
                    :class="{ 'is-current': t.id === currentTenantId }"
                  >
                    <div class="flex items-center gap-2 py-0.5">
                      <div
                        class="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0"
                      >
                        {{ t.name.charAt(0) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1 text-sm">
                          <span class="truncate">{{ t.name }}</span>
                          <el-icon v-if="t.id === currentTenantId" class="text-blue-600"><Check /></el-icon>
                        </div>
                        <div class="text-xs text-gray-400">{{ t.code }}</div>
                      </div>
                    </div>
                  </el-dropdown-item>
                  <div
                    v-if="filteredTenants.length === 0"
                    class="px-4 py-3 text-center text-xs text-gray-400"
                  >
                    未找到匹配的租户
                  </div>
                </el-scrollbar>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <!-- 无租户时降级为按钮 -->
          <el-button v-else size="small" @click="emit('toggle-tenant')">
            <el-icon class="mr-1"><component :is="'Switch'" /></el-icon>
            切换租户
          </el-button>
          <!-- 主题切换 -->
          <el-tooltip :content="isDark ? '切换到浅色' : '切换到深色'" placement="bottom">
            <el-button size="small" circle @click="toggleTheme">
              <el-icon :size="16"><component :is="isDark ? 'Sunny' : 'Moon'" /></el-icon>
            </el-button>
          </el-tooltip>
          <el-badge :value="3" class="cursor-pointer">
            <el-icon :size="18"><component :is="'Bell'" /></el-icon>
          </el-badge>
          <el-dropdown trigger="click" @command="onCommand">
            <div class="flex items-center gap-2 cursor-pointer">
              <el-avatar :size="30" :src="avatar || undefined">{{ initial }}</el-avatar>
              <span class="text-sm text-gray-700">{{ username }}</span>
              <el-icon class="text-gray-400"><component :is="'ArrowDown'" /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="settings">设置</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 面包屑条 -->
      <div class="h-10 bg-white border-b border-gray-100 flex items-center px-6 shrink-0">
        <Breadcrumb />
      </div>

      <!-- 内容区 -->
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
