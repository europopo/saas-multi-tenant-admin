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

const form = reactive({ username: 'admin', password: 'admin123' });

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await auth.login({ username: form.username, password: form.password });
      ElMessage.success('登录成功');
      const redirect = (route.query.redirect as string) || '/task/dashboard';
      router.push(redirect);
    } catch (e) {
      ElMessage.error((e as Error).message || '登录失败');
    } finally {
      loading.value = false;
    }
  });
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-gray-100 p-4"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white text-2xl font-bold mb-4"
        >
          T
        </div>
        <h1 class="text-2xl font-bold text-gray-800">任务管理子系统</h1>
        <p class="text-sm text-gray-500 mt-1">第三方系统任务执行管理</p>
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
            <el-input v-model="form.username" size="large" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" size="large" show-password />
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
        <div class="mt-4 text-xs text-gray-400 text-center">默认账号：admin / admin123</div>
      </div>
    </div>
  </div>
</template>
