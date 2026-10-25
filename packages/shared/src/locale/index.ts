/**
 * 语言包纯数据类型与聚合导出（不依赖任何运行时，供 @saas/ui 的 i18n 运行时消费）
 *
 * 语言包按命名空间组织：common（跨应用共享）+ portal / task-system 等子系统。
 * 本模块只承载「语言包数据」，响应式 i18n 运行时（createI18n / useI18n）位于 @saas/ui。
 */
import zhCN from './messages/zh-CN';
import enUS from './messages/en-US';

/** 语言标识 */
export type Locale = 'zh-CN' | 'en-US';

/** 支持的语言列表 */
export const SUPPORTED_LOCALES: Locale[] = ['zh-CN', 'en-US'];

/** 语言包结构：顶层为命名空间，叶子为文案 key */
export type LocaleMessages = Record<string, Record<string, unknown>>;

export { zhCN, enUS };

/** 预组合的门户语言包（common + portal 命名空间） */
export const portalMessages: Record<Locale, LocaleMessages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};
