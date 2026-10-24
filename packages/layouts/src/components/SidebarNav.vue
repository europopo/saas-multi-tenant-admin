<script setup lang="ts">
/**
 * 侧边栏导航组件
 * 基于 el-menu 渲染，支持折叠、菜单高亮、图标展示。
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MenuItem } from '@saas/shared';

const props = withDefaults(
  defineProps<{
    menus: MenuItem[];
    collapsed?: boolean;
    /** 深色模式 */
    dark?: boolean;
  }>(),
  { collapsed: false, dark: true },
);

const route = useRoute();
const router = useRouter();

const activeIndex = computed(() => route.path);

function isActive(path?: string): boolean {
  if (!path) return false;
  return route.path === path || route.path.startsWith(path + '/');
}

function navigate(item: MenuItem) {
  if (item.path) router.push(item.path);
}
</script>

<template>
  <el-menu
    class="sidebar-menu"
    :class="{ 'sidebar-dark': props.dark }"
    :collapse="props.collapsed"
    :default-active="activeIndex"
    :collapse-transition="false"
    router
  >
    <template v-for="item in menus" :key="item.code">
      <!-- 有子菜单 -->
      <el-sub-menu v-if="item.children?.length" :index="item.path ?? item.code">
        <template #title>
          <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
          <span>{{ item.name }}</span>
        </template>
        <el-menu-item
          v-for="child in item.children"
          :key="child.code"
          :index="child.path ?? child.code"
          @click="navigate(child)"
        >
          {{ child.name }}
        </el-menu-item>
      </el-sub-menu>
      <!-- 无子菜单 -->
      <el-menu-item
        v-else
        :index="item.path ?? item.code"
        :class="{ 'is-active': isActive(item.path) }"
        @click="navigate(item)"
      >
        <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
        <template #title>{{ item.name }}</template>
      </el-menu-item>
    </template>
  </el-menu>
</template>
