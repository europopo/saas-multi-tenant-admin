import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';

// 说明：
// Element Plus 在 main.ts 中通过 app.use(ElementPlus) 全量引入，
// 因此这里不再使用 ElementPlusResolver 按需解析，
// 避免 Vite 运行时增量依赖优化（会触发删除旧缓存，在部分沙箱环境下受限）。
//
// base 路径：通过环境变量 VITE_APP_BASE 控制。
// - 默认 '/'，适合将 dist 放到 IIS 站点根目录；
// - 子目录部署时（如 http://host/portal/）设为 VITE_APP_BASE=/portal/。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_APP_BASE || '/';

  return {
    base,
    plugins: [
      vue(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
