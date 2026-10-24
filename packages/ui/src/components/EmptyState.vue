<script setup lang="ts">
/**
 * 空状态组件
 */
defineProps<{
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-gray-400">
    <el-empty :description="description ?? '暂无数据'" />
  </div>
</template>
