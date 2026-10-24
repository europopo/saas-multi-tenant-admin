<script setup lang="ts">
/**
 * 统计卡片组件
 * 用于仪表盘的关键指标展示。
 */
defineProps<{
  label: string;
  value: string | number;
  icon?: string;
  /** 语义色 */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** 附加说明（如环比） */
  suffix?: string;
}>();
</script>

<template>
  <div class="bg-white rounded-card shadow-card p-5 flex items-center gap-4">
    <div
      class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
      :class="{
        'bg-blue-50 text-blue-600': tone === 'primary' || !tone,
        'bg-green-50 text-green-600': tone === 'success',
        'bg-amber-50 text-amber-600': tone === 'warning',
        'bg-red-50 text-red-600': tone === 'danger',
        'bg-gray-100 text-gray-600': tone === 'info',
      }"
    >
      <el-icon :size="24"><component :is="icon" /></el-icon>
    </div>
    <div class="min-w-0">
      <div class="text-sm text-gray-500">{{ label }}</div>
      <div class="text-2xl font-semibold text-gray-800 leading-tight">{{ value }}</div>
      <div v-if="suffix" class="text-xs text-gray-400 mt-0.5">{{ suffix }}</div>
    </div>
  </div>
</template>
