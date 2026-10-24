<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

onMounted(() => {
  window.addEventListener('auth:unauthorized', () => {
    auth.logout();
    router.push('/login');
  });
});
</script>

<template>
  <router-view />
</template>
