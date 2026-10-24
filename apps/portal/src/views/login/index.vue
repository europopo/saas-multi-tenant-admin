<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: 'admin',
  password: 'admin123',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
};

async function handleLogin() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await auth.login({ username: form.username, password: form.password });
      ElMessage.success('登录成功');
      const redirect = (route.query.redirect as string) || '/dashboard';
      router.push(redirect);
    } catch (e) {
      ElMessage.error((e as Error).message || '登录失败');
    } finally {
      loading.value = false;
    }
  });
}

function fillAccount(username: string, password: string) {
  form.username = username;
  form.password = password;
}

function goSsoLogin() {
  const redirect = (route.query.redirect as string) || '/dashboard';
  router.push({ path: '/sso/login', query: { redirect } });
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-100 p-4"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white text-2xl font-bold mb-4"
        >
          S
        </div>
        <h1 class="text-2xl font-bold text-gray-800">SaaS 多租户管理平台</h1>
        <p class="text-sm text-gray-500 mt-1">统一管理租户、子系统与任务</p>
      </div>

      <div class="bg-white rounded-card shadow-card p-8">
        <h2 class="text-lg font-semibold text-gray-800 mb-6">账号登录</h2>
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @keyup.enter="handleLogin"
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" size="large">
              <template #prefix
                ><el-icon><component :is="'User'" /></el-icon
              ></template>
            </el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
            >
              <template #prefix
                ><el-icon><component :is="'Lock'" /></el-icon
              ></template>
            </el-input>
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            class="w-full"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form>

        <div class="flex items-center gap-3 my-5">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-xs text-gray-400">或</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <el-button
          size="large"
          class="w-full"
          @click="goSsoLogin"
        >
          <el-icon class="mr-1"><Key /></el-icon>
          企业 SSO 单点登录
        </el-button>
      </div>

      <div class="mt-4 bg-white rounded-card shadow-card p-4 text-sm text-gray-500">
        <div class="font-medium text-gray-700 mb-2">演示账号</div>
        <div class="space-y-1.5">
          <div
            class="flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
            @click="fillAccount('admin', 'admin123')"
          >
            <span class="text-gray-600">平台管理员</span>
            <span class="text-xs">admin / admin123</span>
          </div>
          <div
            class="flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
            @click="fillAccount('tenant_admin', 'tenant123')"
          >
            <span class="text-gray-600">租户管理员</span>
            <span class="text-xs">tenant_admin / tenant123</span>
          </div>
          <div
            class="flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
            @click="fillAccount('member', 'member123')"
          >
            <span class="text-gray-600">普通成员</span>
            <span class="text-xs">member / member123</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
