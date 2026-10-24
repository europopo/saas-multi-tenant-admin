<script setup lang="ts">
/**
 * 门户仪表盘
 * 所有统计与图表数据均通过 Alova Mock 接口获取。
 */
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import * as echarts from 'echarts';
import type { PortalDashboardData } from '@saas/shared';
import { dashboardApi } from '@/api';
import { PageHeader } from '@saas/ui';
import { formatDateTime, fromNow } from '@saas/shared';

const loading = ref(true);
const data = ref<PortalDashboardData | null>(null);
const growthChartRef = ref<HTMLElement>();
const usageChartRef = ref<HTMLElement>();
let growthChart: echarts.ECharts | null = null;
let usageChart: echarts.ECharts | null = null;

const stats = computed(() => data.value?.stats);

async function load() {
  loading.value = true;
  try {
    data.value = await dashboardApi.get().send();
    renderCharts();
  } finally {
    loading.value = false;
  }
}

function renderCharts() {
  if (!data.value) return;

  // 租户增长趋势
  if (growthChartRef.value) {
    growthChart = growthChart ?? echarts.init(growthChartRef.value);
    growthChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.value.tenantGrowth.map((g) => g.month),
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '新增租户',
          type: 'line',
          smooth: true,
          data: data.value.tenantGrowth.map((g) => g.count),
          areaStyle: { opacity: 0.15 },
          itemStyle: { color: '#2563eb' },
        },
      ],
    });
  }

  // 子系统使用情况
  if (usageChartRef.value) {
    usageChart = usageChart ?? echarts.init(usageChartRef.value);
    usageChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          name: '租户数',
          type: 'pie',
          radius: ['45%', '70%'],
          data: data.value.subsystemUsage.map((u) => ({
            name: u.subsystemName,
            value: u.tenantCount,
          })),
        },
      ],
    });
  }
}

function handleResize() {
  growthChart?.resize();
  usageChart?.resize();
}

onMounted(() => {
  load();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  growthChart?.dispose();
  usageChart?.dispose();
});

const activityTypeMap: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'warning' | 'info' | 'danger' }
> = {
  login: { label: '登录', color: 'info' },
  tenant: { label: '租户', color: 'primary' },
  subsystem: { label: '子系统', color: 'warning' },
  user: { label: '用户', color: 'success' },
  task: { label: '任务', color: 'danger' },
};
</script>

<template>
  <div v-loading="loading">
    <PageHeader title="仪表盘" description="平台整体运营概览" />

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="text-sm text-gray-500">租户总数</div>
        <div class="text-3xl font-semibold text-gray-800 mt-1">{{ stats?.totalTenants ?? 0 }}</div>
      </div>
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="text-sm text-gray-500">活跃租户</div>
        <div class="text-3xl font-semibold text-green-600 mt-1">
          {{ stats?.activeTenants ?? 0 }}
        </div>
      </div>
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="text-sm text-gray-500">子系统数量</div>
        <div class="text-3xl font-semibold text-blue-600 mt-1">
          {{ stats?.totalSubsystems ?? 0 }}
        </div>
      </div>
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="text-sm text-gray-500">用户数量</div>
        <div class="text-3xl font-semibold text-gray-800 mt-1">{{ stats?.totalUsers ?? 0 }}</div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="lg:col-span-2 bg-white rounded-card shadow-card p-5">
        <h3 class="font-medium text-gray-800 mb-4">租户增长趋势</h3>
        <div ref="growthChartRef" class="h-64"></div>
      </div>
      <div class="bg-white rounded-card shadow-card p-5">
        <h3 class="font-medium text-gray-800 mb-4">子系统使用情况</h3>
        <div ref="usageChartRef" class="h-64"></div>
      </div>
    </div>

    <!-- 最近租户 + 活动记录 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-card shadow-card p-5">
        <h3 class="font-medium text-gray-800 mb-4">最近创建的租户</h3>
        <el-table :data="data?.recentTenants ?? []" size="small">
          <el-table-column prop="name" label="租户名称" />
          <el-table-column prop="code" label="编码" width="120" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <span
                :class="
                  row.status === 'active'
                    ? 'text-green-600'
                    : row.status === 'disabled'
                      ? 'text-gray-400'
                      : 'text-amber-600'
                "
              >
                {{
                  row.status === 'active' ? '启用' : row.status === 'disabled' ? '停用' : '待激活'
                }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="bg-white rounded-card shadow-card p-5">
        <h3 class="font-medium text-gray-800 mb-4">最近活动记录</h3>
        <div class="space-y-3">
          <div
            v-for="act in data?.recentActivities ?? []"
            :key="act.id"
            class="flex items-start gap-3"
          >
            <el-tag :type="activityTypeMap[act.type]?.color ?? 'info'" size="small" effect="light">
              {{ activityTypeMap[act.type]?.label ?? act.type }}
            </el-tag>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-gray-700">{{ act.description }}</div>
              <div class="text-xs text-gray-400">
                {{ act.operator }} · {{ fromNow(act.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
