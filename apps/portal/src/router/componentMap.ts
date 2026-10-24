/**
 * 组件映射表：菜单表中的 component 字符串 → 真实 Vue 组件。
 * 用于动态路由注册（router.addRoute）。
 * 新增页面后在此登记，或改用 import.meta.glob 自动扫描。
 */
import type { Component } from 'vue';

const viewModules = import.meta.glob('@/views/**/*.vue');

/** 组件 key 映射（去除 views/ 前缀与 .vue 后缀） */
const componentMap: Record<string, () => Promise<Component>> = {};

for (const path in viewModules) {
  // path 形如 "/src/views/dashboard/index.vue" 或 "@/views/..."
  const key = path
    .replace(/^.*\/views\//, '')
    .replace(/\.vue$/, '');
  componentMap[key] = viewModules[path] as () => Promise<Component>;
}

/** 根据菜单 component 字符串解析真实组件加载器，未命中返回 null */
export function resolveComponent(component: string | undefined): (() => Promise<Component>) | null {
  if (!component) return null;
  return componentMap[component] ?? null;
}

export default componentMap;
