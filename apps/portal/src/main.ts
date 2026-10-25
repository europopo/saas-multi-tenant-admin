import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { createI18n } from '@saas/ui';
import { portalMessages } from '@saas/shared';
import App from './App.vue';
import router from './router';
import './styles/index.css';

const app = createApp(App);

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 多语言：创建门户 i18n 实例并注入全局（组件内通过 inject('i18n') 使用）
const i18n = createI18n(portalMessages, 'zh-CN');
app.provide('i18n', i18n);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.mount('#app');
