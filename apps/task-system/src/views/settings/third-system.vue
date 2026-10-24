<script setup lang="ts">
/**
 * 第三方系统管理
 */
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import type { ThirdSystem } from '@saas/shared';
import { thirdSystemApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import { THIRD_SYSTEM_TYPE_DICT, formatDateTime } from '@saas/shared';

const router = useRouter();
const loading = ref(false);
const list = ref<ThirdSystem[]>([]);

const query = reactive({ keyword: '', status: '' });

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  name: '',
  code: '',
  description: '',
  type: 'custom' as ThirdSystem['type'],
  endpoint: '',
  owner: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入系统名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入唯一编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择系统类型', trigger: 'change' }],
};

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

async function load() {
  loading.value = true;
  try {
    list.value = await thirdSystemApi.list(query).send();
  } finally {
    loading.value = false;
  }
}

function search() {
  load();
}

function reset() {
  query.keyword = '';
  query.status = '';
  load();
}

function openCreate() {
  dialogMode.value = 'create';
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    description: '',
    type: 'custom',
    endpoint: '',
    owner: '',
  });
  dialogVisible.value = true;
}

function openEdit(row: ThirdSystem) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    type: row.type,
    endpoint: row.endpoint,
    owner: row.owner,
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (dialogMode.value === 'create') {
        await thirdSystemApi.create(form).send();
        ElMessage.success('创建成功');
      } else {
        await thirdSystemApi.update(form).send();
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

async function toggleStatus(row: ThirdSystem) {
  const target = row.status === 'active' ? 'disabled' : 'active';
  await thirdSystemApi.toggleStatus(row.id, target).send();
  ElMessage.success(target === 'active' ? '已启用' : '已停用');
  load();
}

function viewTasks(row: ThirdSystem) {
  router.push({ path: '/task/list', query: { thirdSystemId: row.id } });
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="第三方系统管理" description="管理接入的任务第三方业务系统">
      <template #actions>
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新增系统
        </el-button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-card shadow-card p-4 mb-4">
      <el-form inline>
        <el-form-item>
          <el-input
            v-model="query.keyword"
            placeholder="系统名称/编码"
            clearable
            style="width: 220px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="bg-white rounded-card shadow-card">
      <el-table v-loading="loading" :data="list" row-key="id">
        <el-table-column prop="name" label="系统名称" min-width="140" />
        <el-table-column prop="code" label="唯一编码" width="140" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{
            THIRD_SYSTEM_TYPE_DICT.find((t) => t.value === row.type)?.label ?? row.type
          }}</template>
        </el-table-column>
        <el-table-column prop="endpoint" label="接入地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="credentialMasked" label="凭证" width="130" />
        <el-table-column prop="owner" label="负责人" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }"
            ><StatusTag :dict="statusDict" :value="row.status"
          /></template>
        </el-table-column>
        <el-table-column label="关联任务" width="100" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewTasks(row as ThirdSystem)">{{
              row.taskCount ?? 0
            }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row as ThirdSystem)">编辑</el-button>
            <el-button
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleStatus(row as ThirdSystem)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增第三方系统' : '编辑第三方系统'"
      width="560px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="系统名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="唯一编码" prop="code">
          <el-input v-model="form.code" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="系统类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option
              v-for="t in THIRD_SYSTEM_TYPE_DICT"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="接入地址">
          <el-input v-model="form.endpoint" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.owner" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
