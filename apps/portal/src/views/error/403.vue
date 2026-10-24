<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div class="text-6xl font-bold text-gray-300">403</div>
    <p class="text-gray-500 mt-4 mb-6">抱歉，您没有权限访问该页面</p>
    <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
  </div>
</template>
