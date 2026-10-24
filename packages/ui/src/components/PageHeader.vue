<script setup lang="ts">
/**
 * 页面标题栏组件
 * 统一页面标题 + 描述 + 操作区的布局。
 */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-gray-800">{{ title }}</h2>
      <p v-if="description" class="mt-1 text-sm text-gray-500">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
