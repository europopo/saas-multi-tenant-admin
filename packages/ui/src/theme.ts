/**
 * 主题切换组合式函数（依赖 Vue 响应式，位于 @saas/ui）
 *
 * 管理浅色/深色主题，通过给 <html> 添加/移除 dark class 生效，
 * 偏好持久化到 localStorage，与多语言偏好切换保持一致。
 * 未来若接入 Element Plus 主题或其他主题引擎，只需在此文件内替换实现。
 */
import { ref } from 'vue';

const THEME_KEY = 'saas_theme';

/** 读取持久化的主题偏好（默认跟随系统当前状态） */
function readStoredTheme(): boolean {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === 'dark') return true;
  if (raw === 'light') return false;
  return document.documentElement.classList.contains('dark');
}

/** 应用主题到 <html>，并持久化 */
function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
}

export type ThemeMode = 'light' | 'dark';

/**
 * 主题组合式函数。
 * 由于主题是全局单例（作用于 document.documentElement），
 * 使用模块级 ref 保证多个组件间状态一致。
 */
const isDark = ref(readStoredTheme());

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
  }

  function setTheme(mode: ThemeMode) {
    isDark.value = mode === 'dark';
    applyTheme(isDark.value);
  }

  return { isDark, toggleTheme, setTheme };
}
