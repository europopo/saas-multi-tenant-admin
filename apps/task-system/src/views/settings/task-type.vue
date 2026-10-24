<script setup lang="ts">
/**
 * 任务类型与规则配置
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance } from 'element-plus';
import type { TaskTypeRule } from '@saas/shared';
import { taskTypeApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import { TASK_TYPE_DICT, TASK_PRIORITY_DICT, RETRY_STRATEGY_DICT } from '@saas/shared';

const loading = ref(false);
const list = ref<TaskTypeRule[]>([]);

const dialogVisible = ref(false);
const editingRule = ref<TaskTypeRule | null>(null);
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  defaultPriority: 'medium' as TaskTypeRule['defaultPriority'],
  maxRetry: 3,
  retryStrategy: 'exponential' as TaskTypeRule['retryStrategy'],
  timeout: 600,
  allowManual: true,
  allowCancel: true,
});

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

async function load() {
  loading.value = true;
  try {
    list.value = await taskTypeApi.list().send();
  } finally {
    loading.value = false;
  }
}

function openEdit(row: TaskTypeRule) {
  editingRule.value = row;
  Object.assign(form, {
    id: row.id,
    defaultPriority: row.defaultPriority,
    maxRetry: row.maxRetry,
    retryStrategy: row.retryStrategy,
    timeout: row.timeout,
    allowManual: row.allowManual,
    allowCancel: row.allowCancel,
  });
  dialogVisible.value = true;
}

async function submit() {
  submitting.value = true;
  try {
    await taskTypeApi.update(form).send();
    ElMessage.success('更新成功');
    dialogVisible.value = false;
    load();
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败');
  } finally {
    submitting.value = false;
  }
}

async function toggleStatus(row: TaskTypeRule) {
  await taskTypeApi.toggleStatus(row.id, !row.enabled).send();
  ElMessage.success(row.enabled ? '已停用' : '已启用');
  load();
}

function typeLabel(type: string): string {
  return TASK_TYPE_DICT.find((t) => t.value === type)?.label ?? type;
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      title="任务类型与规则配置"
      description="配置各任务类型的默认优先级、重试策略与执行规则"
    />

    <div class="bg-white rounded-card shadow-card">
      <el-table v-loading="loading" :data="list" row-key="id">
        <el-table-column label="任务类型" width="140">
          <template #default="{ row }">{{ typeLabel(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="名称" width="130" />
        <el-table-column label="默认优先级" width="110">
          <template #default="{ row }">{{
            TASK_PRIORITY_DICT.find((p) => p.value === row.defaultPriority)?.label
          }}</template>
        </el-table-column>
        <el-table-column label="最大重试" width="100">
          <template #default="{ row }">{{ row.maxRetry }} 次</template>
        </el-table-column>
        <el-table-column label="重试策略" width="120">
          <template #default="{ row }">{{
            RETRY_STRATEGY_DICT.find((s) => s.value === row.retryStrategy)?.label
          }}</template>
        </el-table-column>
        <el-table-column label="超时" width="100">
          <template #default="{ row }">{{ row.timeout }}s</template>
        </el-table-column>
        <el-table-column label="允许手动触发" width="120">
          <template #default="{ row }">
            <el-tag :type="row.allowManual ? 'success' : 'info'" size="small">{{
              row.allowManual ? '是' : '否'
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="允许取消" width="100">
          <template #default="{ row }">
            <el-tag :type="row.allowCancel ? 'success' : 'info'" size="small">{{
              row.allowCancel ? '是' : '否'
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :dict="statusDict" :value="row.enabled ? 'active' : 'disabled'" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row as TaskTypeRule)">编辑规则</el-button>
            <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggleStatus(row as TaskTypeRule)">
              {{ row.enabled ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="`编辑规则：${editingRule?.name ?? ''}`"
      width="520px"
    >
      <el-form ref="formRef" :model="form" label-width="120px">
        <el-form-item label="默认优先级">
          <el-select v-model="form.defaultPriority" style="width: 100%">
            <el-option
              v-for="p in TASK_PRIORITY_DICT"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="最大重试次数">
          <el-input-number v-model="form.maxRetry" :min="0" :max="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="重试策略">
          <el-select v-model="form.retryStrategy" style="width: 100%">
            <el-option
              v-for="s in RETRY_STRATEGY_DICT"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="超时时间（秒）">
          <el-input-number
            v-model="form.timeout"
            :min="10"
            :max="3600"
            :step="30"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="允许手动触发">
          <el-switch v-model="form.allowManual" />
        </el-form-item>
        <el-form-item label="允许取消">
          <el-switch v-model="form.allowCancel" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
