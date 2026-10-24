<script setup lang="ts">
/**
 * 状态标签组件
 * 根据字典配置展示带语义色的状态标签。
 */
import { computed } from 'vue';
import type { DictItem } from '@saas/shared';

const props = defineProps<{
  /** 字典配置 */
  dict: DictItem<any>[];
  /** 当前值 */
  value: string | number;
}>();

const item = computed(() => props.dict.find((d) => d.value === props.value));
const label = computed(() => item.value?.label ?? String(props.value));
const color = computed(() => item.value?.color ?? 'info');

const colorMap: Record<string, string> = {
  primary: 'text-blue-600 bg-blue-50',
  success: 'text-green-600 bg-green-50',
  danger: 'text-red-600 bg-red-50',
  warning: 'text-amber-600 bg-amber-50',
  info: 'text-gray-600 bg-gray-100',
};
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="colorMap[color] ?? colorMap.info"
  >
    {{ label }}
  </span>
</template>
