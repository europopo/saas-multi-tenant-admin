<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { SsoProvider } from '@saas/shared';
import { ssoApi } from '@/api';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const providers = ref<SsoProvider[]>([]);
const loaded = ref(false);
const authorizing = ref<string | null>(null);

/** 加载可用 SSO 提供商 */
async function loadProviders() {
  loading.value = true;
  try {
    providers.value = await ssoApi.providers().send();
  } catch (e) {
    ElMessage.error((e as Error).message || '加载 SSO 提供商失败');
  } finally {
    loading.value = false;
    loaded.value = true;
  }
}

/** 发起 SSO 授权（模拟跳转到 IdP） */
async function handleSsoLogin(provider: SsoProvider) {
  authorizing.value = provider.code;
  try {
    const redirect = (route.query.redirect as string) || '/dashboard';
    const result = await ssoApi.authorize({ provider: provider.code, redirect }).send();

    // 模拟跳转到 IdP 授权页：携带 provider / state / redirect 到回调页
    // 真实场景：window.location.href = result.authorizeUrl
    router.push({
      path: '/sso/callback',
      query: {
        provider: result.provider,
        state: result.state,
        // 模拟 IdP 授权成功后返回的授权码
        code: `mock-auth-code-${Date.now()}`,
        redirect: result.redirect ?? redirect,
      },
    });
  } catch (e) {
    ElMessage.error((e as Error).message || '发起 SSO 登录失败');
  } finally {
    authorizing.value = null;
  }
}

loadProviders();
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
        <h1 class="text-2xl font-bold text-gray-800">企业单点登录</h1>
        <p class="text-sm text-gray-500 mt-1">选择你的企业身份提供商，免密登录平台</p>
      </div>

      <div class="bg-white rounded-card shadow-card p-8">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">选择登录方式</h2>
        <p class="text-sm text-gray-500 mb-6">以下为当前租户已启用的身份提供商</p>

        <div v-loading="loading" class="space-y-3">
          <button
            v-for="p in providers"
            :key="p.id"
            type="button"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-60"
            :disabled="!!authorizing"
            @click="handleSsoLogin(p)"
          >
            <span
              class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0"
              :style="{ backgroundColor: p.color }"
            >
              <el-icon :size="18"><component :is="p.icon" /></el-icon>
            </span>
            <span class="flex-1 text-left">
              <span class="block text-sm font-medium text-gray-800">{{ p.name }}</span>
              <span class="block text-xs text-gray-500">{{ p.description }}</span>
            </span>
            <el-icon v-if="authorizing === p.code" class="is-loading text-gray-400">
              <Loading />
            </el-icon>
            <el-icon v-else class="text-gray-300"><ArrowRight /></el-icon>
          </button>

          <el-empty
            v-if="loaded && providers.length === 0"
            description="暂无启用的 SSO 提供商"
            :image-size="80"
          />
        </div>
      </div>

      <div class="mt-4 text-center">
        <el-link type="primary" :underline="false" @click="router.push('/login')">
          返回账号密码登录
        </el-link>
      </div>
    </div>
  </div>
</template>
