<script setup lang="ts">
/**
 * 任务管理（列表 + 详情 + 创建/编辑 + 状态操作）
 */
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type {
  Task,
  TaskQuery,
  ThirdSystem,
  TaskLog,
  TaskStatusHistory,
  TaskRetryRecord,
} from '@saas/shared';
import { taskApi, thirdSystemApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import {
  TASK_STATUS_DICT,
  TASK_PRIORITY_DICT,
  TASK_TYPE_DICT,
  formatDateTime,
  formatDuration,
} from '@saas/shared';

const route = useRoute();

const loading = ref(false);
const list = ref<Task[]>([]);
const total = ref(0);
const thirdSystems = ref<ThirdSystem[]>([]);
const selectedRows = ref<Task[]>([]);

const query = reactive<TaskQuery>({
  keyword: '',
  thirdSystemId: '',
  type: '',
  status: '',
  priority: '',
  startTime: '',
  endTime: '',
  sortField: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
});

// 从 URL query 读取初始筛选
function initFromUrl() {
  if (route.query.status) query.status = route.query.status as TaskQuery['status'];
  if (route.query.keyword) query.keyword = route.query.keyword as string;
}

async function load() {
  loading.value = true;
  try {
    const result = await taskApi.list(query).send();
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function loadThirdSystems() {
  thirdSystems.value = await thirdSystemApi.list().send();
}

function search() {
  query.page = 1;
  load();
}

function reset() {
  Object.assign(query, {
    keyword: '',
    thirdSystemId: '',
    type: '',
    status: '',
    priority: '',
    startTime: '',
    endTime: '',
    sortField: 'createdAt',
    sortOrder: 'desc',
    page: 1,
  });
  load();
}

// ============ 详情 ============
const detailVisible = ref(false);
const detailTask = ref<Task | null>(null);
const detailLogs = ref<TaskLog[]>([]);
const detailHistory = ref<TaskStatusHistory[]>([]);
const detailRetries = ref<TaskRetryRecord[]>([]);
const detailTab = ref('logs');

async function showDetail(row: Task) {
  detailTask.value = await taskApi.detail(row.id).send();
  detailVisible.value = true;
  detailTab.value = 'logs';
  loadDetailData(row.id);
}

async function loadDetailData(id: string) {
  const [logs, history, retries] = await Promise.all([
    taskApi.logs(id).send(),
    taskApi.history(id).send(),
    taskApi.retries(id).send(),
  ]);
  detailLogs.value = logs;
  detailHistory.value = history;
  detailRetries.value = retries;
}

// ============ 创建/编辑 ============
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  name: '',
  code: '',
  thirdSystemId: '',
  type: 'data-sync' as Task['type'],
  priority: 'medium' as Task['priority'],
  remark: '',
  paramsText: '{}',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入任务编码', trigger: 'blur' }],
  thirdSystemId: [{ required: true, message: '请选择第三方系统', trigger: 'change' }],
  type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
};

function openCreate() {
  dialogMode.value = 'create';
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    thirdSystemId: '',
    type: 'data-sync',
    priority: 'medium',
    remark: '',
    paramsText: '{\n  "mode": "incremental"\n}',
  });
  dialogVisible.value = true;
}

function openEdit(row: Task) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    thirdSystemId: row.thirdSystemId,
    type: row.type,
    priority: row.priority,
    remark: row.remark ?? '',
    paramsText: JSON.stringify(row.config.params, null, 2),
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    // 校验参数 JSON
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(form.paramsText);
    } catch {
      ElMessage.error('执行参数必须是合法的 JSON');
      return;
    }
    submitting.value = true;
    try {
      const payload = {
        name: form.name,
        code: form.code,
        thirdSystemId: form.thirdSystemId,
        type: form.type,
        priority: form.priority,
        remark: form.remark,
        config: { params },
      };
      if (dialogMode.value === 'create') {
        await taskApi.create(payload).send();
        ElMessage.success('创建成功');
      } else {
        await taskApi.update({ ...payload, id: form.id }).send();
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      load();
    } catch (e) {
      ElMessage.error((e as Error).message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
}

// ============ 状态操作 ============
async function confirmAction(row: Task, action: 'trigger' | 'cancel' | 'retry' | 'delete') {
  const configs = {
    trigger: {
      text: '确定手动触发该任务吗？',
      type: 'warning' as const,
      fn: () => taskApi.trigger(row.id),
    },
    cancel: {
      text: '确定取消该任务吗？',
      type: 'warning' as const,
      fn: () => taskApi.cancel(row.id),
    },
    retry: {
      text: '确定重试该失败任务吗？',
      type: 'warning' as const,
      fn: () => taskApi.retry(row.id),
    },
    delete: {
      text: `确定删除任务「${row.name}」吗？`,
      type: 'warning' as const,
      fn: () => taskApi.remove(row.id),
    },
  };
  const c = configs[action];
  await ElMessageBox.confirm(c.text, '确认操作', { type: c.type });
  await c.fn().send();
  ElMessage.success('操作成功');
  load();
}

async function batchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的任务');
    return;
  }
  await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 个任务吗？`, '警告', {
    type: 'warning',
  });
  const ids = selectedRows.value.map((r) => r.id);
  await taskApi.batchDelete(ids).send();
  ElMessage.success('批量删除成功');
  selectedRows.value = [];
  load();
}

function onSelectionChange(rows: Task[]) {
  selectedRows.value = rows;
}

function onSortChange({ prop, order }: { prop: string | null; order: string | null }) {
  query.sortField = prop ?? '';
  query.sortOrder = order === 'ascending' ? 'asc' : 'desc';
  load();
}

// 判断按钮是否可用（前端状态校验）
function canTrigger(row: Task): boolean {
  return row.config.allowManual && row.status !== 'running' && row.status !== 'success';
}
function canCancel(row: Task): boolean {
  return row.config.allowCancel && row.status !== 'success' && row.status !== 'canceled';
}
function canRetry(row: Task): boolean {
  return row.status === 'failed';
}
function canEdit(row: Task): boolean {
  return row.status === 'pending';
}

const timeRange = computed(() => {
  const start = query.startTime ? formatDateTime(query.startTime) : '';
  const end = query.endTime ? formatDateTime(query.endTime) : '';
  return start || end ? [start, end] : [];
});

onMounted(() => {
  initFromUrl();
  loadThirdSystems();
  load();
});
</script>

<template>
  <div>
    <PageHeader title="任务管理" description="管理第三方系统之间的任务记录与执行状态">
      <template #actions>
        <el-button :disabled="selectedRows.length === 0" @click="batchDelete">
          <el-icon class="mr-1"><component :is="'Delete'" /></el-icon>批量删除
        </el-button>
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>创建任务
        </el-button>
      </template>
    </PageHeader>

    <!-- 筛选栏 -->
    <div class="bg-white rounded-card shadow-card p-4 mb-4">
      <el-form inline>
        <el-form-item>
          <el-input
            v-model="query.keyword"
            placeholder="任务名称/编码/ID"
            clearable
            style="width: 180px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="query.thirdSystemId"
            placeholder="第三方系统"
            clearable
            style="width: 160px"
          >
            <el-option v-for="s in thirdSystems" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.type" placeholder="任务类型" clearable style="width: 130px">
            <el-option
              v-for="t in TASK_TYPE_DICT"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px">
            <el-option
              v-for="s in TASK_STATUS_DICT"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.priority" placeholder="优先级" clearable style="width: 110px">
            <el-option
              v-for="p in TASK_PRIORITY_DICT"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 320px"
            @change="search"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-card shadow-card">
      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        @selection-change="onSelectionChange"
        @sort-change="onSortChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="任务 ID" width="110" />
        <el-table-column prop="name" label="任务名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="code" label="任务编码" width="120" />
        <el-table-column
          prop="thirdSystemName"
          label="第三方系统"
          width="130"
          show-overflow-tooltip
        />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{
            TASK_TYPE_DICT.find((t) => t.value === row.type)?.label ?? row.type
          }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><StatusTag :dict="TASK_STATUS_DICT" :value="row.status"
          /></template>
        </el-table-column>
        <el-table-column label="优先级" width="90">
          <template #default="{ row }"
            ><StatusTag :dict="TASK_PRIORITY_DICT" :value="row.priority"
          /></template>
        </el-table-column>
        <el-table-column label="发起时间" width="160" sortable="custom" prop="createdAt">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="90" sortable="custom" prop="duration">
          <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="重试" width="70" prop="retryCount">
          <template #default="{ row }">{{ row.retryCount }}</template>
        </el-table-column>
        <el-table-column label="创建人" width="100" prop="creator">
          <template #default="{ row }">{{ row.creator }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showDetail(row as Task)">详情</el-button>
            <el-button v-if="canEdit(row as Task)" link type="primary" @click="openEdit(row as Task)"
              >编辑</el-button
            >
            <el-button
              v-if="canTrigger(row as Task)"
              link
              type="success"
              @click="confirmAction(row as Task, 'trigger')"
              >触发</el-button
            >
            <el-button
              v-if="canCancel(row as Task)"
              link
              type="warning"
              @click="confirmAction(row as Task, 'cancel')"
              >取消</el-button
            >
            <el-button v-if="canRetry(row as Task)" link type="danger" @click="confirmAction(row as Task, 'retry')"
              >重试</el-button
            >
            <el-button link type="danger" @click="confirmAction(row as Task, 'delete')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="p-4 flex justify-end">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="load"
          @size-change="search"
        />
      </div>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="任务详情" size="640px">
      <template v-if="detailTask">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="任务名称" :span="2">{{
            detailTask.name
          }}</el-descriptions-item>
          <el-descriptions-item label="任务编码">{{ detailTask.code }}</el-descriptions-item>
          <el-descriptions-item label="任务 ID">{{ detailTask.id }}</el-descriptions-item>
          <el-descriptions-item label="第三方系统">{{
            detailTask.thirdSystemName
          }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">{{
            TASK_TYPE_DICT.find((t) => t.value === detailTask!.type)?.label
          }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <StatusTag :dict="TASK_STATUS_DICT" :value="detailTask.status" />
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <StatusTag :dict="TASK_PRIORITY_DICT" :value="detailTask.priority" />
          </el-descriptions-item>
          <el-descriptions-item label="发起时间">{{
            formatDateTime(detailTask.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{
            formatDateTime(detailTask.startedAt ?? '')
          }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{
            formatDateTime(detailTask.finishedAt ?? '')
          }}</el-descriptions-item>
          <el-descriptions-item label="执行耗时">{{
            formatDuration(detailTask.duration)
          }}</el-descriptions-item>
          <el-descriptions-item label="重试次数">{{ detailTask.retryCount }}</el-descriptions-item>
          <el-descriptions-item label="结果摘要" :span="2">{{
            detailTask.resultSummary ?? '-'
          }}</el-descriptions-item>
          <el-descriptions-item v-if="detailTask.errorMessage" label="错误信息" :span="2">
            <span class="text-red-600">{{ detailTask.errorMessage }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="执行参数" :span="2">
            <pre class="text-xs bg-gray-50 rounded p-2 overflow-auto">{{
              JSON.stringify(detailTask.config.params, null, 2)
            }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detailTask.creator }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ detailTask.remark ?? '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-tabs v-model="detailTab" class="mt-4">
          <el-tab-pane label="执行日志" name="logs">
            <el-timeline v-if="detailLogs.length">
              <el-timeline-item
                v-for="log in detailLogs"
                :key="log.id"
                :timestamp="formatDateTime(log.timestamp)"
                :type="
                  log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'primary'
                "
              >
                {{ log.message }}
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无日志" :image-size="60" />
          </el-tab-pane>
          <el-tab-pane label="状态历史" name="history">
            <el-timeline v-if="detailHistory.length">
              <el-timeline-item
                v-for="h in detailHistory"
                :key="h.id"
                :timestamp="formatDateTime(h.timestamp)"
              >
                {{ TASK_STATUS_DICT.find((s) => s.value === h.from)?.label }} →
                {{ TASK_STATUS_DICT.find((s) => s.value === h.to)?.label }}
                <span class="text-xs text-gray-400">（{{ h.operator }}）</span>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无历史记录" :image-size="60" />
          </el-tab-pane>
          <el-tab-pane label="重试记录" name="retries">
            <el-table :data="detailRetries" size="small">
              <el-table-column prop="attempt" label="第几次" width="80" />
              <el-table-column label="结果" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">{{
                    row.result === 'success' ? '成功' : '失败'
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="errorMessage" label="信息" min-width="160" />
              <el-table-column label="时间" width="160">
                <template #default="{ row }">{{ formatDateTime(row.timestamp) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建任务' : '编辑任务'"
      width="560px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务编码" prop="code">
          <el-input
            v-model="form.code"
            placeholder="如 SYNC-001"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="第三方系统" prop="thirdSystemId">
          <el-select v-model="form.thirdSystemId" placeholder="选择第三方系统" style="width: 100%">
            <el-option
              v-for="s in thirdSystems"
              :key="s.id"
              :label="s.name"
              :value="s.id"
              :disabled="s.status !== 'active'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option
              v-for="t in TASK_TYPE_DICT"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.priority">
            <el-radio-button v-for="p in TASK_PRIORITY_DICT" :key="p.value" :value="p.value">{{
              p.label
            }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="执行参数">
          <el-input
            v-model="form.paramsText"
            type="textarea"
            :rows="5"
            placeholder='JSON 格式，如 {"mode":"incremental"}'
          />
          <div class="text-xs text-gray-400 mt-1">
            不同任务类型可配置不同参数结构，需为合法 JSON
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
