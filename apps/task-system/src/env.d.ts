/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 应用部署路径前缀，如 '/task/'，默认 '/' */
  readonly VITE_APP_BASE?: string;
  /** 门户完整入口地址（含协议），供跨应用单点登录跳转 */
  readonly VITE_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
