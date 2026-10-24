<script setup lang="ts">
/**
 * 子系统管理
 */
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import type { Subsystem } from '@saas/shared';
import { subsystemApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import { formatDateTime } from '@saas/shared';
import { useSubsystemStore } from '@/stores/subsystem';

const router = useRouter();
const subsystemStore = useSubsystemStore();

const loading = ref(false);
const list = ref<Subsystem[]>([]);

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  name: '',
  code: '',
  description: '',
  icon: 'Grid',
  entryUrl: '/',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入子系统名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    { pattern: /^[a-z0-9-]+$/, message: '仅支持小写字母、数字和连字符', trigger: 'blur' },
  ],
  entryUrl: [{ required: true, message: '请输入入口地址', trigger: 'blur' }],
};

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

const iconOptions = [
  'List',
  'DataAnalysis',
  'Message',
  'Grid',
  'Setting',
  'Monitor',
  'Document',
  'Folder',
];

async function load() {
  loading.value = true;
  try {
    list.value = await subsystemApi.list().send();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialogMode.value = 'create';
  Object.assign(form, { id: '', name: '', code: '', description: '', icon: 'Grid', entryUrl: '/' });
  dialogVisible.value = true;
}

function openEdit(row: Subsystem) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    icon: row.icon,
    entryUrl: row.entryUrl,
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
        await subsystemApi.create(form).send();
        ElMessage.success('创建成功');
      } else {
        await subsystemApi.update(form).send();
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      await load();
      // 刷新顶部导航栏（让新增/编辑的子系统即时生效）
      await subsystemStore.reload();
    } catch (e) {
      ElMessage.error((e as Error).message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
}

async function toggleStatus(row: Subsystem) {
  const target = row.status === 'active' ? 'disabled' : 'active';
  await subsystemApi.toggleStatus(row.id, target).send();
  ElMessage.success(target === 'active' ? '已启用' : '已停用');
  await load();
  await subsystemStore.reload();
}

function enter(row: Subsystem) {
  // 统一走动态路由 /subsystem/:code 进入子系统内嵌页
  router.push(`/subsystem/${row.code}`);
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="子系统管理" description="管理平台集成的各个业务子系统及其授权">
      <template #actions>
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新建子系统
        </el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="row in list"
        :key="row.id"
        class="bg-white rounded-card shadow-card p-5 hover:shadow-card-hover transition-shadow"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"
            >
              <el-icon :size="20"><component :is="row.icon" /></el-icon>
            </div>
            <div>
              <div class="font-medium text-gray-800">{{ row.name }}</div>
              <div class="text-xs text-gray-400">{{ row.code }}</div>
            </div>
          </div>
          <StatusTag :dict="statusDict" :value="row.status" />
        </div>
        <p class="text-sm text-gray-500 mb-4 min-h-[40px]">{{ row.description }}</p>
        <div class="text-xs text-gray-400 mb-4">创建于 {{ formatDateTime(row.createdAt) }}</div>
        <div class="flex items-center gap-2">
          <el-button
            size="small"
            type="primary"
            :disabled="row.status !== 'active'"
            @click="enter(row)"
            >进入应用</el-button
          >
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button
            size="small"
            :type="row.status === 'active' ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'active' ? '停用' : '启用' }}
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建子系统' : '编辑子系统'"
      width="560px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="子系统名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入子系统名称" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input
            v-model="form.code"
            placeholder="如 task-system"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="form.icon" style="width: 100%">
            <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon">
              <el-icon class="mr-1"><component :is="icon" /></el-icon>{{ icon }}
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="入口地址" prop="entryUrl">
          <el-input v-model="form.entryUrl" placeholder="如 /task" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="子系统功能描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
