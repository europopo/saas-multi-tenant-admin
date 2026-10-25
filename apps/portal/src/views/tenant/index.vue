<script setup lang="ts">
/**
 * 租户管理
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { Tenant, TenantQuery } from '@saas/shared';
import { tenantApi, subsystemApi } from '@/api';
import { PageHeader, StatusTag, Permission } from '@saas/ui';
import { formatDateTime } from '@saas/shared';

const loading = ref(false);
const list = ref<Tenant[]>([]);
const total = ref(0);
const subsystems = ref<{ id: string; name: string }[]>([]);

const query = reactive<TenantQuery>({
  keyword: '',
  status: '',
  page: 1,
  pageSize: 10,
});

// 弹窗
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const detailVisible = ref(false);
const detailTenant = ref<Tenant | null>(null);
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  name: '',
  code: '',
  status: 'active' as Tenant['status'],
  contact: '',
  email: '',
  subsystemIds: [] as string[],
  // 一键开通：租户管理员账号（仅新建时使用）
  adminUsername: '',
  adminPassword: 'admin123',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入唯一标识', trigger: 'blur' },
    { pattern: /^[a-z0-9-]+$/, message: '仅支持小写字母、数字和连字符', trigger: 'blur' },
  ],
};

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
  { label: '待激活', value: 'pending', color: 'warning' },
];

async function load() {
  loading.value = true;
  try {
    const result = await tenantApi.list(query).send();
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  subsystems.value = await subsystemApi.list().send();
}

function search() {
  query.page = 1;
  load();
}

function reset() {
  query.keyword = '';
  query.status = '';
  query.page = 1;
  load();
}

function openCreate() {
  dialogMode.value = 'create';
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    status: 'active',
    contact: '',
    email: '',
    subsystemIds: [],
    adminUsername: '',
    adminPassword: 'admin123',
  });
  dialogVisible.value = true;
}

function openEdit(row: Tenant) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    contact: row.contact,
    email: row.email,
    subsystemIds: row.subsystemIds,
    adminUsername: '',
    adminPassword: 'admin123',
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
        await tenantApi.create(form).send();
        const adminName = form.adminUsername.trim() || `${form.code}-admin`;
        ElMessage.success(`创建成功，租户管理员账号：${adminName} / ${form.adminPassword}`);
      } else {
        await tenantApi.update(form).send();
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

async function toggleStatus(row: Tenant) {
  const target = row.status === 'active' ? 'disabled' : 'active';
  await tenantApi.toggleStatus(row.id, target).send();
  ElMessage.success(target === 'active' ? '已启用' : '已停用');
  load();
}

async function removeTenant(row: Tenant) {
  await ElMessageBox.confirm(`确定删除租户「${row.name}」吗？此操作不可恢复。`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  await tenantApi.remove(row.id).send();
  ElMessage.success('删除成功');
  load();
}

async function showDetail(row: Tenant) {
  detailTenant.value = await tenantApi.detail(row.id).send();
  detailVisible.value = true;
}

onMounted(() => {
  load();
  loadOptions();
});
</script>

<template>
  <div>
    <PageHeader title="租户管理" description="管理平台所有租户及其授权">
      <template #actions>
        <Permission permission="tenant:create">
          <el-button type="primary" @click="openCreate">
            <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新建租户
          </el-button>
        </Permission>
      </template>
    </PageHeader>

    <!-- 筛选栏 -->
    <div class="bg-white rounded-card shadow-card p-4 mb-4">
      <el-form inline>
        <el-form-item>
          <el-input
            v-model="query.keyword"
            placeholder="租户名称/编码/联系人"
            clearable
            style="width: 220px"
            @keyup.enter="search"
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="disabled" />
            <el-option label="待激活" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-card shadow-card">
      <el-table v-loading="loading" :data="list" row-key="id">
        <el-table-column prop="name" label="租户名称" min-width="160" />
        <el-table-column prop="code" label="唯一标识" width="130" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :dict="statusDict" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="到期时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.expiredAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showDetail(row as Tenant)">详情</el-button>
            <Permission permission="tenant:edit">
              <el-button link type="primary" @click="openEdit(row as Tenant)">编辑</el-button>
            </Permission>
            <Permission permission="tenant:toggle">
              <el-button
                link
                :type="row.status === 'active' ? 'warning' : 'success'"
                @click="toggleStatus(row as Tenant)"
              >
                {{ row.status === 'active' ? '停用' : '启用' }}
              </el-button>
            </Permission>
            <Permission permission="tenant:delete">
              <el-button link type="danger" @click="removeTenant(row as Tenant)">删除</el-button>
            </Permission>
          </template>
        </el-table-column>
      </el-table>
      <div class="p-4 flex justify-end">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="load"
          @size-change="search"
        />
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建租户' : '编辑租户'"
      width="560px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="唯一标识" prop="code">
          <el-input
            v-model="form.code"
            placeholder="如 demo-tech"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="授权子系统">
          <el-select
            v-model="form.subsystemIds"
            multiple
            style="width: 100%"
            placeholder="选择该租户可访问的子系统"
          >
            <el-option v-for="s in subsystems" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <template v-if="dialogMode === 'create'">
          <el-form-item label="管理员账号">
            <el-input
              v-model="form.adminUsername"
              :placeholder="`留空默认 ${form.code || '{code}'}-admin`"
            />
          </el-form-item>
          <el-form-item label="管理员密码">
            <el-input v-model="form.adminPassword" placeholder="默认 admin123" />
          </el-form-item>
        </template>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="租户详情" size="480px">
      <template v-if="detailTenant">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="租户名称">{{ detailTenant.name }}</el-descriptions-item>
          <el-descriptions-item label="唯一标识">{{ detailTenant.code }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <StatusTag :dict="statusDict" :value="detailTenant.status" />
          </el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detailTenant.contact }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detailTenant.email }}</el-descriptions-item>
          <el-descriptions-item label="用户数">{{
            detailTenant.userCount ?? 0
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            formatDateTime(detailTenant.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="到期时间">{{
            formatDateTime(detailTenant.expiredAt)
          }}</el-descriptions-item>
        </el-descriptions>
        <div class="mt-4">
          <div class="text-sm font-medium text-gray-700 mb-2">授权子系统</div>
          <el-tag v-for="sid in detailTenant.subsystemIds" :key="sid" class="mr-2 mb-2">
            {{ subsystems.find((s) => s.id === sid)?.name ?? sid }}
          </el-tag>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
