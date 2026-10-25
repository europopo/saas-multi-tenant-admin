/**
 * i18n 运行时（依赖 Vue 响应式，位于 @saas/ui）
 *
 * 语言包数据位于 @saas/shared（零依赖），本模块提供响应式 i18n 实例工厂与组合式函数。
 * 设计目标：
 * 1. 命名空间化语言包：common（跨应用共享）+ portal / task-system 等子系统独立命名空间；
 * 2. 工厂函数 createI18n(messages, defaultLocale)：每个应用传入自己的语言包组合；
 * 3. 响应式：locale 变化后所有使用 t() 的地方自动更新；
 * 4. 持久化：语言偏好存 localStorage，与主题切换一致。
 * 未来若引入 vue-i18n，只需在此文件内替换实现，业务层 t('xxx.yyy') 用法不变。
 */
import { ref, computed, inject } from 'vue';
import type { Locale, LocaleMessages } from '@saas/shared';
import { SUPPORTED_LOCALES } from '@saas/shared';

const LOCALE_KEY = 'saas_locale';

/** 读取持久化的语言偏好 */
function readStoredLocale(defaultLocale: Locale): Locale {
  const raw = localStorage.getItem(LOCALE_KEY);
  return raw === 'en-US' ? 'en-US' : defaultLocale;
}

/** 按点号路径取值：t('portal.login.title') → messages.portal.login.title */
function resolveByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * 创建 i18n 实例。
 * @param messages 全部语言包：{ 'zh-CN': {...}, 'en-US': {...} }
 * @param defaultLocale 默认语言
 */
export function createI18n(
  messages: Record<Locale, LocaleMessages>,
  defaultLocale: Locale = 'zh-CN',
) {
  const locale = ref<Locale>(readStoredLocale(defaultLocale));

  const messagesMap = ref(messages);

  /** 当前语言包 */
  const current = computed(() => messagesMap.value[locale.value] ?? {});

  /** 翻译函数：t('common.actions.save') */
  function t(path: string): string {
    return resolveByPath(current.value as Record<string, unknown>, path) ?? path;
  }

  /** 切换语言并持久化 */
  function setLocale(next: Locale) {
    locale.value = next;
    localStorage.setItem(LOCALE_KEY, next);
  }

  /** 动态注册某语言的命名空间消息（供子系统后续补充语言包） */
  function mergeMessages(next: Record<Locale, LocaleMessages>) {
    for (const loc of SUPPORTED_LOCALES) {
      messagesMap.value[loc] = { ...messagesMap.value[loc], ...(next[loc] ?? {}) };
    }
  }

  return { locale, current, t, setLocale, mergeMessages };
}

export type I18n = ReturnType<typeof createI18n>;

/**
 * 组合式函数：从注入的 i18n 实例取响应式的翻译能力。
 * 用法：const { t, locale, setLocale } = useI18n()
 * 模板中 t('portal.login.title') 会随 locale 变化自动更新。
 */
export function useI18n(): I18n {
  const i18n = inject<I18n | null>('i18n', null);
  if (!i18n) {
    // 兜底：无注入时返回空实例（避免组件报错）
    return createI18n({ 'zh-CN': {}, 'en-US': {} }, 'zh-CN');
  }
  return i18n;
}
