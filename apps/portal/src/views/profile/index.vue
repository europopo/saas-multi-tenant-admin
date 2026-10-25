<script setup lang="ts">
/**
 * 个人中心
 * 展示当前登录用户信息，支持编辑昵称 / 邮箱 / 手机号（复用 userApi.update）。
 */
import { reactive, ref, computed } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import type { Role } from '@saas/shared';
import { userApi, roleApi } from '@/api';
import { PageHeader } from '@saas/ui';
import { useI18n } from '@saas/ui';
import { formatDateTime } from '@saas/shared';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const { t } = useI18n();

const roles = ref<Role[]>([]);
const editing = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const user = computed(() => auth.user);

const form = reactive({
  nickname: '',
  email: '',
  phone: '',
});

const rules: FormRules = {
  nickname: [{ required: true, message: t('portal.profile.nicknameRequired'), trigger: 'blur' }],
};

function roleNames(roleIds: string[]): string {
  const names = roleIds.map((rid) => roles.value.find((r) => r.id === rid)?.name ?? rid);
  return names.length ? names.join('、') : '-';
}

async function loadRoles() {
  try {
    roles.value = await roleApi.list(auth.user?.id).send();
  } catch {
    roles.value = [];
  }
}

function openEdit() {
  if (!user.value) return;
  form.nickname = user.value.nickname;
  form.email = user.value.email;
  form.phone = user.value.phone ?? '';
  editing.value = true;
}

async function submit() {
  if (!formRef.value || !user.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const updated = await userApi
        .update({
          id: user.value!.id,
          nickname: form.nickname,
          email: form.email,
          phone: form.phone,
        })
        .send();
      // 同步更新本地登录态，保证顶栏昵称等即时刷新
      auth.user = { ...user.value!, ...updated };
      localStorage.setItem('saas_user', JSON.stringify(auth.user));
      ElMessage.success(t('portal.profile.save') + '成功');
      editing.value = false;
    } catch (e) {
      ElMessage.error((e as Error).message || '保存失败');
    } finally {
      submitting.value = false;
    }
  });
}

loadRoles();
</script>

<template>
  <div>
    <PageHeader :title="t('portal.profile.title')" :description="t('portal.profile.description')" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 左侧：头像卡片 -->
      <div class="bg-white rounded-card shadow-card p-6 flex flex-col items-center text-center">
        <el-avatar :size="88" :src="user?.avatar || undefined" class="mb-4">
          {{ (user?.nickname ?? '?').charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="text-lg font-semibold text-gray-800">{{ user?.nickname }}</div>
        <div class="text-sm text-gray-500 mt-1">@{{ user?.username }}</div>
        <el-tag v-if="user?.isPlatformAdmin" type="danger" size="small" class="mt-3">平台管理员</el-tag>
      </div>

      <!-- 右侧：基本信息 -->
      <div class="lg:col-span-2 bg-white rounded-card shadow-card p-6">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-medium text-gray-800">{{ t('portal.profile.basic') }}</h3>
          <el-button v-if="!editing" type="primary" plain @click="openEdit">
            <el-icon class="mr-1"><EditPen /></el-icon>{{ t('portal.profile.edit') }}
          </el-button>
        </div>

        <template v-if="!editing">
          <el-descriptions :column="2" border>
            <el-descriptions-item :label="t('portal.profile.username')">
              {{ user?.username }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.nickname')">
              {{ user?.nickname }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.email')">
              {{ user?.email || '-' }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.phone')">
              {{ user?.phone || '-' }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.role')">
              {{ roleNames(user?.roleIds ?? []) }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.tenant')">
              {{ user?.tenantId }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.createdAt')">
              {{ user?.createdAt ? formatDateTime(user.createdAt) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('portal.profile.lastLoginAt')">
              {{ user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <el-form v-else ref="formRef" :model="form" :rules="rules" label-width="90px" class="max-w-md">
          <el-form-item :label="t('portal.profile.nickname')" prop="nickname">
            <el-input v-model="form.nickname" :placeholder="t('portal.profile.nicknamePlaceholder')" />
          </el-form-item>
          <el-form-item :label="t('portal.profile.email')">
            <el-input v-model="form.email" :placeholder="t('portal.profile.emailPlaceholder')" />
          </el-form-item>
          <el-form-item :label="t('portal.profile.phone')">
            <el-input v-model="form.phone" :placeholder="t('portal.profile.phonePlaceholder')" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="submit">
              {{ t('portal.profile.save') }}
            </el-button>
            <el-button @click="editing = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>
