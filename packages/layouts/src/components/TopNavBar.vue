<script setup lang="ts">
/**
 * 顶部子系统导航栏
 * 参考主流 SaaS（飞书/钉钉/Notion 工作区）的顶部应用切换器设计：
 * - 横向排列所有子系统（图标 + 名称）
 * - 当前子系统高亮
 * - 点击切换到对应子系统
 */
import type { Subsystem } from '@saas/shared';

defineProps<{
  /** 子系统列表 */
  subsystems: Subsystem[];
  /** 当前激活的子系统编码 */
  activeCode?: string;
  /** 当前激活的子系统名称 */
  activeName?: string;
}>();

const emit = defineEmits<{
  (e: 'select', subsystem: Subsystem): void;
}>();

function onSelect(sub: Subsystem) {
  if (sub.status !== 'active') return;
  emit('select', sub);
}
</script>

<template>
  <div class="flex items-center gap-1 overflow-x-auto topnav-scroll">
    <!-- 门户首页入口 -->
    <button
      type="button"
      class="topnav-item shrink-0"
      :class="{ 'is-active': activeCode === 'portal' }"
      @click="emit('select', { id: 'portal', name: '门户', code: 'portal', description: '', icon: 'HomeFilled', entryUrl: '/', status: 'active', createdAt: '' })"
    >
      <el-icon :size="16"><HomeFilled /></el-icon>
      <span>门户</span>
    </button>

    <span v-if="subsystems.length" class="w-px h-5 bg-gray-200 shrink-0 mx-1"></span>

    <!-- 子系统列表 -->
    <button
      v-for="sub in subsystems"
      :key="sub.id"
      type="button"
      class="topnav-item shrink-0"
      :class="{ 'is-active': activeCode === sub.code, 'is-disabled': sub.status !== 'active' }"
      :title="sub.status === 'active' ? sub.description : `${sub.name}（已停用）`"
      @click="onSelect(sub)"
    >
      <el-icon :size="16"><component :is="sub.icon" /></el-icon>
      <span>{{ sub.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.topnav-scroll {
  scrollbar-width: none;
}
.topnav-scroll::-webkit-scrollbar {
  display: none;
}
.topnav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #4b5563;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.topnav-item:hover {
  background: #f3f4f6;
  color: #111827;
}
.topnav-item.is-active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}
.topnav-item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
