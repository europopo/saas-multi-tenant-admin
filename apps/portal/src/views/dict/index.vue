<script setup lang="ts">
/**
 * 数据字典管理模块（纯租户级）
 * 左「字典类型」列表 + 右「字典数据」表格的经典左右布局。
 * 字典按租户隔离：租户管理员管理本租户字典，平台管理员可跨租户查看。
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { DictType, DictData } from '@saas/shared';
import { dictApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { PageHeader, StatusTag } from '@saas/ui';

const auth = useAuthStore();

const loading = ref(false);
const types = ref<DictType[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');

const activeTypeId = ref('');
const dataList = ref<DictData[]>([]);
const dataLoading = ref(false);

// 字典类型弹窗
const typeDialogVisible = ref(false);
const typeDialogMode = ref<'create' | 'edit'>('create');
const typeFormRef = ref<FormInstance>();
const typeSubmitting = ref(false);
const typeForm = reactive({
  id: '',
  name: '',
  type: '',
  status: 'active' as 'active' | 'disabled',
  remark: '',
});

// 字典数据弹窗
const dataDialogVisible = ref(false);
const dataDialogMode = ref<'create' | 'edit'>('create');
const dataFormRef = ref<FormInstance>();
const dataSubmitting = ref(false);
const dataForm = reactive({
  id: '',
  typeId: '',
  label: '',
  value: '',
  sort: 99,
  status: 'active' as 'active' | 'disabled',
  color: '',
});

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

const colorDict: { label: string; value: string; color: 'primary' | 'success' | 'warning' | 'danger' | 'info' }[] = [
  { label: '默认', value: '', color: 'info' },
  { label: '主要', value: 'primary', color: 'primary' },
  { label: '成功', value: 'success', color: 'success' },
  { label: '警告', value: 'warning', color: 'warning' },
  { label: '危险', value: 'danger', color: 'danger' },
  { label: '信息', value: 'info', color: 'info' },
];

const typeRules: FormRules = {
  name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  type: [
    { required: true, message: '请输入字典编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持字母数字与下划线', trigger: 'blur' },
  ],
};

const dataRules: FormRules = {
  label: [{ required: true, message: '请输入显示文案', trigger: 'blur' }],
  value: [
    { required: true, message: '请输入存储值', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '存储值建议使用英文编码', trigger: 'blur' },
  ],
};

async function loadTypes() {
  loading.value = true;
  try {
    const res = await dictApi
      .typeList({ keyword: keyword.value, status: '', page: page.value, pageSize: pageSize.value, userId: auth.user?.id })
      .send();
    types.value = res.list;
    total.value = res.total;
    // 若当前选中类型不在列表中，重置选中
    if (!types.value.some((t) => t.id === activeTypeId.value)) {
      activeTypeId.value = types.value[0]?.id ?? '';
      dataList.value = [];
      if (activeTypeId.value) loadData();
    }
  } finally {
    loading.value = false;
  }
}

async function loadData() {
  if (!activeTypeId.value) return;
  dataLoading.value = true;
  try {
    dataList.value = await dictApi
      .dataList({ typeId: activeTypeId.value, userId: auth.user?.id })
      .send();
  } finally {
    dataLoading.value = false;
  }
}

function selectType(id: string) {
  activeTypeId.value = id;
  loadData();
}

function openTypeCreate() {
  typeDialogMode.value = 'create';
  Object.assign(typeForm, { id: '', name: '', type: '', status: 'active', remark: '' });
  typeDialogVisible.value = true;
}

function openTypeEdit(row: DictType) {
  typeDialogMode.value = 'edit';
  Object.assign(typeForm, {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    remark: row.remark ?? '',
  });
  typeDialogVisible.value = true;
}

async function submitType() {
  if (!typeFormRef.value) return;
  await typeFormRef.value.validate(async (valid) => {
    if (!valid) return;
    typeSubmitting.value = true;
    try {
      const tenantId = auth.user?.tenantId ?? '';
      if (typeDialogMode.value === 'create') {
        await dictApi.typeCreate({ ...typeForm, tenantId }).send();
        ElMessage.success('创建成功');
      } else {
        await dictApi.typeUpdate({ ...typeForm }).send();
        ElMessage.success('更新成功');
      }
      typeDialogVisible.value = false;
      loadTypes();
    } catch (e) {
      ElMessage.error((e as Error).message || '操作失败');
    } finally {
      typeSubmitting.value = false;
    }
  });
}

async function removeType(row: DictType) {
  await ElMessageBox.confirm(`确定删除字典「${row.name}」及其全部字典数据吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  await dictApi.typeRemove(row.id).send();
  ElMessage.success('删除成功');
  if (activeTypeId.value === row.id) activeTypeId.value = '';
  loadTypes();
}

function openDataCreate() {
  if (!activeTypeId.value) {
    ElMessage.warning('请先选择左侧的字典类型');
    return;
  }
  dataDialogMode.value = 'create';
  Object.assign(dataForm, { id: '', typeId: activeTypeId.value, label: '', value: '', sort: 99, status: 'active', color: '' });
  dataDialogVisible.value = true;
}

function openDataEdit(row: DictData) {
  dataDialogMode.value = 'edit';
  Object.assign(dataForm, {
    id: row.id,
    typeId: row.typeId,
    label: row.label,
    value: row.value,
    sort: row.sort,
    status: row.status,
    color: row.color ?? '',
  });
  dataDialogVisible.value = true;
}

async function submitData() {
  if (!dataFormRef.value) return;
  await dataFormRef.value.validate(async (valid) => {
    if (!valid) return;
    dataSubmitting.value = true;
    try {
      if (dataDialogMode.value === 'create') {
        await dictApi.dataCreate({ ...dataForm }).send();
        ElMessage.success('创建成功');
      } else {
        await dictApi.dataUpdate({ ...dataForm }).send();
        ElMessage.success('更新成功');
      }
      dataDialogVisible.value = false;
      loadData();
    } catch (e) {
      ElMessage.error((e as Error).message || '操作失败');
    } finally {
      dataSubmitting.value = false;
    }
  });
}

async function removeData(row: DictData) {
  await ElMessageBox.confirm(`确定删除字典项「${row.label}」吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  await dictApi.dataRemove(row.id).send();
  ElMessage.success('删除成功');
  loadData();
}

onMounted(loadTypes);
</script>

<template>
  <div>
    <PageHeader title="数据字典" description="管理本租户的业务枚举，供各子系统下拉选项复用，无需改代码即可配置">
      <template #actions>
        <el-button type="primary" @click="openTypeCreate">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新建字典类型
        </el-button>
      </template>
    </PageHeader>

    <div class="flex gap-4">
      <!-- 左侧：字典类型 -->
      <div class="w-72 shrink-0 bg-white rounded-card shadow-card">
        <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--el-border-color-lighter)]">
          <span class="text-sm font-medium">字典类型</span>
          <el-input v-model="keyword" placeholder="搜索" size="small" clearable style="width: 140px" @change="loadTypes" />
        </div>
        <div v-loading="loading" class="max-h-[520px] overflow-y-auto">
          <div
            v-for="t in types"
            :key="t.id"
            class="px-3 py-2.5 cursor-pointer border-b border-[var(--el-border-color-lighter)] hover:bg-[var(--el-fill-color-light)] transition-colors"
            :class="{ 'bg-[var(--el-color-primary-light-9)]': t.id === activeTypeId }"
            @click="selectType(t.id)"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{{ t.name }}</span>
              <div class="flex items-center gap-1" @click.stop>
                <el-button link type="primary" size="small" @click="openTypeEdit(t)">编辑</el-button>
                <el-button link type="danger" size="small" @click="removeType(t)">删除</el-button>
              </div>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t.type }}</span>
              <StatusTag :dict="statusDict" :value="t.status" />
            </div>
          </div>
          <el-empty v-if="!loading && types.length === 0" description="暂无字典类型" :image-size="60" />
        </div>
        <div class="flex justify-end px-3 py-2">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            small
            @current-change="loadTypes"
          />
        </div>
      </div>

      <!-- 右侧：字典数据 -->
      <div class="flex-1 bg-white rounded-card shadow-card">
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--el-border-color-lighter)]">
          <span class="text-sm font-medium">字典数据</span>
          <el-button type="primary" size="small" @click="openDataCreate">
            <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新增字典项
          </el-button>
        </div>
        <el-table v-loading="dataLoading" :data="dataList" height="520">
          <el-table-column prop="label" label="显示文案" min-width="140">
            <template #default="{ row }">
              <el-tag :type="row.color || 'info'" size="small" effect="light">{{ row.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="value" label="存储值" min-width="140">
            <template #default="{ row }">
              <code class="text-xs bg-[var(--el-fill-color-light)] px-1.5 py-0.5 rounded">{{ row.value }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :dict="statusDict" :value="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDataEdit(row as DictData)">编辑</el-button>
              <el-button link type="danger" @click="removeData(row as DictData)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!dataLoading && dataList.length === 0" description="请选择左侧字典类型查看数据" :image-size="60" />
      </div>
    </div>

    <!-- 字典类型弹窗 -->
    <el-dialog v-model="typeDialogVisible" :title="typeDialogMode === 'create' ? '新建字典类型' : '编辑字典类型'" width="520px">
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="100px">
        <el-form-item label="字典名称" prop="name">
          <el-input v-model="typeForm.name" placeholder="如：任务优先级" />
        </el-form-item>
        <el-form-item label="字典编码" prop="type">
          <el-input v-model="typeForm.type" placeholder="如 task_priority" :disabled="typeDialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="typeForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="typeForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="typeSubmitting" @click="submitType">确定</el-button>
      </template>
    </el-dialog>

    <!-- 字典数据弹窗 -->
    <el-dialog v-model="dataDialogVisible" :title="dataDialogMode === 'create' ? '新增字典项' : '编辑字典项'" width="520px">
      <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="100px">
        <el-form-item label="显示文案" prop="label">
          <el-input v-model="dataForm.label" placeholder="如：高" />
        </el-form-item>
        <el-form-item label="存储值" prop="value">
          <el-input v-model="dataForm.value" placeholder="如 high（英文编码，参与逻辑判断）" />
        </el-form-item>
        <el-form-item label="语义色">
          <el-select v-model="dataForm.color" style="width: 100%">
            <el-option v-for="c in colorDict" :key="c.value" :label="c.label" :value="c.value">
              <el-tag :type="c.color" size="small" effect="light">{{ c.label }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dataForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dataForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dataSubmitting" @click="submitData">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
