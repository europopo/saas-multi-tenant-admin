import type { Config } from 'tailwindcss';

/**
 * 共享 Tailwind 配置（Tailwind CSS v3）
 * 定义统一的设计系统：色板、间距、圆角、阴影等设计 token，
 * 供 portal 与 task-system 两个应用复用，保证视觉一致。
 */
export default {
  content: [],
  // 通过 html 根节点的 dark class 控制深浅主题
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 品牌主色（蓝色系）
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // 侧边栏深色
        sidebar: {
          bg: '#1f2937',
          hover: '#374151',
          active: '#2563eb',
          text: '#9ca3af',
          'text-active': '#f9fafb',
        },
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
        header: '56px',
      },
      borderRadius: {
        card: '8px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
