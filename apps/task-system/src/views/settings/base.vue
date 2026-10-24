<script setup lang="ts">
/**
 * 系统基础设置
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { SystemSettings } from '@saas/shared';
import { settingsApi } from '@/api';
import { PageHeader } from '@saas/ui';

const loading = ref(true);
const saving = ref(false);

const form = reactive<SystemSettings>({
  systemName: '',
  systemDescription: '',
  defaultPageSize: 10,
  defaultTaskFilter: {},
  logRetentionDays: 30,
  taskStatusGuide: '',
  executionStrategyGuide: '',
});

async function load() {
  loading.value = true;
  try {
    const data = await settingsApi.get().send();
    Object.assign(form, data);
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await settingsApi.update(form).send();
    ElMessage.success('保存成功');
  } catch (e) {
    ElMessage.error((e as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="系统基础设置" description="配置任务子系统的基础参数与说明文档" />

    <div v-loading="loading" class="bg-white rounded-card shadow-card p-6 max-w-3xl">
      <el-form :model="form" label-width="140px">
        <el-form-item label="系统名称">
          <el-input v-model="form.systemName" />
        </el-form-item>
        <el-form-item label="系统描述">
          <el-input v-model="form.systemDescription" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="默认分页大小">
          <el-select v-model="form.defaultPageSize" style="width: 200px">
            <el-option :value="10" label="10 条/页" />
            <el-option :value="20" label="20 条/页" />
            <el-option :value="50" label="50 条/页" />
            <el-option :value="100" label="100 条/页" />
          </el-select>
        </el-form-item>
        <el-form-item label="日志保留周期">
          <el-input-number
            v-model="form.logRetentionDays"
            :min="1"
            :max="365"
            style="width: 200px"
          />
          <span class="ml-2 text-sm text-gray-500">天</span>
        </el-form-item>
        <el-form-item label="任务状态说明">
          <el-input v-model="form.taskStatusGuide" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="执行策略说明">
          <el-input v-model="form.executionStrategyGuide" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
