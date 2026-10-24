<script setup lang="ts">
/**
 * 任务看板
 */
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import type { DashboardData, ThirdSystem } from '@saas/shared';
import { taskApi, thirdSystemApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import { TASK_STATUS_DICT, formatDuration, fromNow } from '@saas/shared';

const router = useRouter();
const loading = ref(true);
const data = ref<DashboardData | null>(null);
const thirdSystems = ref<ThirdSystem[]>([]);

const trendChartRef = ref<HTMLElement>();
const distributionChartRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let distributionChart: echarts.ECharts | null = null;

// 筛选
const filter = ref({
  thirdSystemId: '',
  range: '7d',
});

async function load() {
  loading.value = true;
  try {
    const startTime = rangeToStart(filter.value.range);
    data.value = await taskApi
      .dashboard({
        thirdSystemId: filter.value.thirdSystemId || undefined,
        startTime,
      })
      .send();
    renderCharts();
  } finally {
    loading.value = false;
  }
}

function rangeToStart(range: string): string | undefined {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : undefined;
  if (!days) return undefined;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function renderCharts() {
  if (!data.value) return;

  if (trendChartRef.value) {
    trendChart = trendChart ?? echarts.init(trendChartRef.value);
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['总数', '成功', '失败'] },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: data.value.trend.map((t) => t.date) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '总数',
          type: 'line',
          smooth: true,
          data: data.value.trend.map((t) => t.total),
          itemStyle: { color: '#2563eb' },
        },
        {
          name: '成功',
          type: 'line',
          smooth: true,
          data: data.value.trend.map((t) => t.success),
          itemStyle: { color: '#10b981' },
        },
        {
          name: '失败',
          type: 'line',
          smooth: true,
          data: data.value.trend.map((t) => t.failed),
          itemStyle: { color: '#ef4444' },
        },
      ],
    });
  }

  if (distributionChartRef.value) {
    distributionChart = distributionChart ?? echarts.init(distributionChartRef.value);
    distributionChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          name: '任务数',
          type: 'pie',
          radius: ['40%', '68%'],
          data: data.value.distribution.map((d) => ({ name: d.thirdSystemName, value: d.count })),
        },
      ],
    });
  }
}

function handleResize() {
  trendChart?.resize();
  distributionChart?.resize();
}

function goToTaskList(status?: string) {
  router.push({ path: '/task/list', query: status ? { status } : {} });
}

const stats = computed(() => data.value?.stats);

onMounted(async () => {
  thirdSystems.value = await thirdSystemApi.list().send();
  load();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  distributionChart?.dispose();
});
</script>

<template>
  <div v-loading="loading">
    <PageHeader title="任务看板" description="任务执行情况总览" />

    <!-- 筛选 -->
    <div class="bg-white rounded-card shadow-card p-4 mb-4">
      <el-form inline>
        <el-form-item label="第三方系统">
          <el-select
            v-model="filter.thirdSystemId"
            placeholder="全部"
            clearable
            style="width: 200px"
            @change="load"
          >
            <el-option v-for="s in thirdSystems" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-radio-group v-model="filter.range" @change="load">
            <el-radio-button value="7d">近 7 天</el-radio-button>
            <el-radio-button value="30d">近 30 天</el-radio-button>
            <el-radio-button value="all">全部</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
      <div class="bg-white rounded-card shadow-card p-4 text-center">
        <div class="text-2xl font-semibold text-gray-800">{{ stats?.totalTasks ?? 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">任务总数</div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 text-center">
        <div class="text-2xl font-semibold text-gray-600">{{ stats?.pendingTasks ?? 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">待执行</div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 text-center">
        <div class="text-2xl font-semibold text-blue-600">{{ stats?.runningTasks ?? 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">执行中</div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 text-center">
        <div class="text-2xl font-semibold text-green-600">{{ stats?.successTasks ?? 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">成功</div>
      </div>
      <div
        class="bg-white rounded-card shadow-card p-4 text-center cursor-pointer hover:shadow-card-hover"
        @click="goToTaskList('failed')"
      >
        <div class="text-2xl font-semibold text-red-600">{{ stats?.failedTasks ?? 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">失败</div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 text-center">
        <div class="text-2xl font-semibold text-gray-800">{{ stats?.todayTasks ?? 0 }}</div>
        <div class="text-xs text-gray-500 mt-1">今日任务</div>
      </div>
      <div class="bg-white rounded-card shadow-card p-4 text-center">
        <div class="text-2xl font-semibold text-emerald-600">{{ stats?.successRate ?? 0 }}%</div>
        <div class="text-xs text-gray-500 mt-1">成功率</div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-card shadow-card p-5">
        <h3 class="font-medium text-gray-800 mb-4">近期任务趋势</h3>
        <div ref="trendChartRef" class="h-72"></div>
      </div>
      <div class="bg-white rounded-card shadow-card p-5">
        <h3 class="font-medium text-gray-800 mb-4">第三方系统任务分布</h3>
        <div ref="distributionChartRef" class="h-72"></div>
      </div>
    </div>

    <!-- 最近任务 + 失败任务 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium text-gray-800">最近执行的任务</h3>
          <el-button link type="primary" @click="goToTaskList()">查看全部</el-button>
        </div>
        <el-table :data="data?.recentTasks ?? []" size="small">
          <el-table-column prop="name" label="任务名称" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"
              ><StatusTag :dict="TASK_STATUS_DICT" :value="row.status"
            /></template>
          </el-table-column>
          <el-table-column label="耗时" width="90">
            <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="bg-white rounded-card shadow-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium text-gray-800">最近失败的任务</h3>
          <el-button link type="danger" @click="goToTaskList('failed')">失败任务</el-button>
        </div>
        <div v-if="data?.recentFailedTasks?.length" class="space-y-3">
          <div
            v-for="t in data.recentFailedTasks"
            :key="t.id"
            class="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0"
          >
            <el-icon class="text-red-500 mt-0.5"><component :is="'WarningFilled'" /></el-icon>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-gray-700 truncate">{{ t.name }}</div>
              <div class="text-xs text-gray-400">
                {{ t.thirdSystemName }} · {{ fromNow(t.createdAt) }}
              </div>
            </div>
            <el-button
              link
              type="danger"
              size="small"
              @click="router.push(`/task/list?status=failed&keyword=${t.code}`)"
              >查看</el-button
            >
          </div>
        </div>
        <el-empty v-else description="暂无失败任务" :image-size="80" />
      </div>
    </div>
  </div>
</template>
