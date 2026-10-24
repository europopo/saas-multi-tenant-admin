/**
 * 主题状态管理
 * 支持 light / dark / system 三种模式，持久化到 localStorage，并跟随系统偏好。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'saas_theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');
  /** 实际生效的主题（system 模式下解析为 light/dark） */
  const resolved = ref<'light' | 'dark'>(mode.value === 'system' ? getSystemTheme() : mode.value);

  /** 应用主题到 <html> 根节点 */
  function applyTheme() {
    const target = mode.value === 'system' ? getSystemTheme() : mode.value;
    resolved.value = target;
    const root = document.documentElement;
    if (target === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  function setMode(next: ThemeMode) {
    mode.value = next;
    localStorage.setItem(THEME_KEY, next);
    applyTheme();
  }

  /** 切换 light/dark（system 模式下切换为反向的显式模式） */
  function toggle() {
    const next: ThemeMode = resolved.value === 'dark' ? 'light' : 'dark';
    setMode(next);
  }

  // 跟随系统主题变化
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    if (mode.value === 'system') applyTheme();
  });

  // 初始化应用
  applyTheme();

  return { mode, resolved, setMode, toggle, applyTheme };
});
