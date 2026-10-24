<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const status = ref<'loading' | 'success' | 'error'>('loading');
const message = ref('正在通过企业身份认证登录…');
const isNewUser = ref(false);

onMounted(async () => {
  const { provider, code, state, redirect } = route.query;
  const redirectPath = (redirect as string) || '/dashboard';

  // 校验必要参数
  if (!provider || !code) {
    status.value = 'error';
    message.value = 'SSO 回调参数不完整，请重新发起登录';
    return;
  }

  try {
    const result = await auth.loginBySso({
      provider: provider as string,
      code: code as string,
      state: (state as string) || undefined,
    });

    isNewUser.value = result.isNewUser;
    status.value = 'success';
    message.value = result.isNewUser
      ? '首次 SSO 登录，已自动创建账号'
      : `欢迎回来，${result.user.nickname}`;

    // 短暂展示后跳转
    setTimeout(() => {
      router.replace(redirectPath);
    }, 800);
  } catch (e) {
    status.value = 'error';
    message.value = (e as Error).message || 'SSO 登录失败';
  }
});

function backToLogin() {
  router.replace('/login');
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-100 p-4"
  >
    <div class="w-full max-w-sm bg-white rounded-card shadow-card p-10 text-center">
      <!-- 加载中 -->
      <div v-if="status === 'loading'" class="flex flex-col items-center gap-4">
        <el-icon class="is-loading text-blue-500" :size="48"><Loading /></el-icon>
        <p class="text-gray-600 text-sm">{{ message }}</p>
      </div>

      <!-- 成功 -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center gap-4">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600"
        >
          <el-icon :size="32"><CircleCheck /></el-icon>
        </div>
        <p class="text-gray-800 font-medium">{{ message }}</p>
        <p class="text-xs text-gray-400">正在跳转…</p>
      </div>

      <!-- 失败 -->
      <div v-else class="flex flex-col items-center gap-4">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600"
        >
          <el-icon :size="32"><CircleClose /></el-icon>
        </div>
        <p class="text-gray-800 font-medium">登录失败</p>
        <p class="text-sm text-gray-500">{{ message }}</p>
        <el-button type="primary" @click="backToLogin">返回登录</el-button>
      </div>
    </div>
  </div>
</template>
