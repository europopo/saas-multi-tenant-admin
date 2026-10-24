<script setup lang="ts">
/**
 * 权限控制组件
 * 根据当前用户权限判断是否渲染插槽内容，用于按钮级权限控制。
 */
import { computed, inject, type ComputedRef } from 'vue';
import { hasPermission } from '@saas/shared';

const props = defineProps<{
  /** 需要的权限编码（如 task:delete） */
  permission?: string;
  /** 需要的任一权限编码 */
  anyOf?: string[];
  /** 需要的全部权限编码 */
  allOf?: string[];
}>();

// 通过 provide/inject 获取当前用户权限（提供方注入的是 ComputedRef<string[]>）
const permissions = inject<ComputedRef<string[]>>(
  'user:permissions',
  computed(() => []),
);

const allowed = computed(() => {
  if (props.permission) return hasPermission(permissions.value, props.permission);
  if (props.anyOf) return props.anyOf.some((p) => hasPermission(permissions.value, p));
  if (props.allOf) return props.allOf.every((p) => hasPermission(permissions.value, p));
  return true;
});
</script>

<template>
  <slot v-if="allowed" />
</template>
