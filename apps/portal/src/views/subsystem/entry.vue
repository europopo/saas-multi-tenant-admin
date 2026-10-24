<script setup lang="ts">
/**
 * 通用子系统落地页
 * 通过动态路由 /subsystem/:code 承载任意子系统。
 * 根据 code 从子系统 store 中读取子系统元信息并渲染内嵌页面；
 * 未来可在此接入 iframe / 微前端容器实现真实子系统加载。
 */
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Subsystem } from '@saas/shared';
import { useSubsystemStore } from '@/stores/subsystem';

const route = useRoute();
const router = useRouter();
const subsystemStore = useSubsystemStore();

const code = computed(() => String(route.params.code ?? ''));

const subsystem = computed<Subsystem | undefined>(() =>
  subsystemStore.subsystems.find((s) => s.code === code.value),
);

onMounted(async () => {
  // 确保子系统列表已加载（直接访问 URL 时）
  await subsystemStore.loadSubsystems();
  if (!subsystem.value) {
    ElMessage.error(`子系统「${code.value}」不存在或未授权`);
    router.replace('/dashboard');
  }
});
</script>

<template>
  <div v-if="subsystem" class="h-full flex flex-col">
    <!-- 子系统内嵌页头部 -->
    <div
      class="flex items-center justify-between bg-white rounded-card shadow-card px-5 py-4 mb-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"
        >
          <el-icon :size="22"><component :is="subsystem.icon" /></el-icon>
        </div>
        <div>
          <div class="text-base font-semibold text-gray-800">{{ subsystem.name }}</div>
          <div class="text-xs text-gray-400">{{ subsystem.code }}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <el-tag :type="subsystem.status === 'active' ? 'success' : 'info'" size="small">
          {{ subsystem.status === 'active' ? '运行中' : '已停用' }}
        </el-tag>
        <el-button size="small" @click="router.push('/dashboard')">
          <el-icon class="mr-1"><component :is="'Back'" /></el-icon>返回门户
        </el-button>
      </div>
    </div>

    <!-- 子系统内嵌内容占位 -->
    <div
      class="flex-1 bg-white rounded-card shadow-card flex flex-col items-center justify-center text-center p-10"
    >
      <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
        <el-icon :size="32"><component :is="subsystem.icon" /></el-icon>
      </div>
      <h2 class="text-lg font-semibold text-gray-800 mb-2">{{ subsystem.name }}</h2>
      <p class="text-sm text-gray-500 max-w-md mb-6">{{ subsystem.description }}</p>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="子系统内嵌页"
        description="当前为子系统占位容器。实际项目中，此处可通过 iframe 或微前端（如 qiankun / Module Federation）加载子系统的真实入口，实现与门户共用一个导航栏的无缝集成。"
        class="max-w-xl"
      />
    </div>
  </div>
</template>
