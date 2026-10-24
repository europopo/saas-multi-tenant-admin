<script setup lang="ts">
/**
 * 用户管理
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { UserInfo, Role } from '@saas/shared';
import { userApi, roleApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import { formatDateTime } from '@saas/shared';

const loading = ref(false);
const list = ref<UserInfo[]>([]);
const total = ref(0);
const roles = ref<Role[]>([]);

const query = reactive({
  keyword: '',
  status: '',
  page: 1,
  pageSize: 10,
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  username: '',
  nickname: '',
  email: '',
  phone: '',
  roleIds: [] as string[],
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
};

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

async function load() {
  loading.value = true;
  try {
    const result = await userApi.list(query).send();
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  roles.value = await roleApi.list().send();
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
  Object.assign(form, { id: '', username: '', nickname: '', email: '', phone: '', roleIds: [] });
  dialogVisible.value = true;
}

function openEdit(row: UserInfo) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    phone: row.phone ?? '',
    roleIds: row.roleIds,
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
        await userApi.create(form).send();
        ElMessage.success('创建成功');
      } else {
        await userApi.update(form).send();
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

async function toggleStatus(row: UserInfo) {
  const target = row.status === 'active' ? 'disabled' : 'active';
  await userApi.toggleStatus(row.id, target).send();
  ElMessage.success(target === 'active' ? '已启用' : '已停用');
  load();
}

async function removeUser(row: UserInfo) {
  await ElMessageBox.confirm(`确定删除用户「${row.nickname}」吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  await userApi.remove(row.id).send();
  ElMessage.success('删除成功');
  load();
}

function roleNames(roleIds: string[]): string {
  return roleIds.map((rid) => roles.value.find((r) => r.id === rid)?.name ?? rid).join('、');
}

onMounted(() => {
  load();
  loadRoles();
});
</script>

<template>
  <div>
    <PageHeader title="用户管理" description="管理平台用户及其角色授权">
      <template #actions>
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新建用户
        </el-button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-card shadow-card p-4 mb-4">
      <el-form inline>
        <el-form-item>
          <el-input
            v-model="query.keyword"
            placeholder="用户名/昵称/邮箱"
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
        <el-table-column prop="username" label="用户名" width="130" />
        <el-table-column prop="nickname" label="昵称" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="角色" min-width="180">
          <template #default="{ row }">{{ roleNames(row.roleIds) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :dict="statusDict" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row as UserInfo)">编辑</el-button>
            <el-button
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleStatus(row as UserInfo)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
            <el-button link type="danger" @click="removeUser(row as UserInfo)">删除</el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建用户' : '编辑用户'"
      width="520px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleIds" multiple style="width: 100%" placeholder="选择角色">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
