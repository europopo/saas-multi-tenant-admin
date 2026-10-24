<script setup lang="ts">
/**
 * 面包屑导航组件
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const crumbs = computed(() => {
  const matched = route.matched.filter((m) => m.meta?.title);
  return matched.map((m) => ({ title: m.meta.title as string, path: m.path }));
});
</script>

<template>
  <el-breadcrumb separator="/">
    <el-breadcrumb-item v-for="(c, i) in crumbs" :key="i">
      {{ c.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>
