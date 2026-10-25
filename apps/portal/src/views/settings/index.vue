<script setup lang="ts">
/**
 * 系统设置页
 * 承载主题切换与多语言切换（从顶栏迁移至此，统一管理个性化偏好）。
 */
import { useI18n, useTheme } from '@saas/ui';
import { PageHeader } from '@saas/ui';
import { SUPPORTED_LOCALES } from '@saas/shared';

const { t, locale, setLocale } = useI18n();
const { isDark, setTheme } = useTheme();

function handleThemeChange(val: string | number | boolean | undefined) {
  setTheme(val === 'dark' ? 'dark' : 'light');
}

function handleLanguageChange(val: string | number | boolean | undefined) {
  if (val === 'zh-CN' || val === 'en-US') setLocale(val);
}
</script>

<template>
  <div>
    <PageHeader :title="t('portal.settings.title')" :description="t('portal.settings.description')" />

    <div class="max-w-2xl space-y-4">
      <!-- 主题设置 -->
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="mb-4">
          <div class="font-medium text-gray-800">{{ t('portal.settings.theme.title') }}</div>
          <div class="text-sm text-gray-500 mt-0.5">
            {{ t('portal.settings.theme.description') }}
          </div>
        </div>
        <div class="flex gap-3">
          <el-radio-group :model-value="isDark ? 'dark' : 'light'" @change="handleThemeChange">
            <el-radio-button value="light">
              <el-icon class="mr-1"><Sunny /></el-icon>{{ t('portal.settings.theme.light') }}
            </el-radio-button>
            <el-radio-button value="dark">
              <el-icon class="mr-1"><Moon /></el-icon>{{ t('portal.settings.theme.dark') }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 语言设置 -->
      <div class="bg-white rounded-card shadow-card p-5">
        <div class="mb-4">
          <div class="font-medium text-gray-800">{{ t('portal.settings.language.title') }}</div>
          <div class="text-sm text-gray-500 mt-0.5">
            {{ t('portal.settings.language.description') }}
          </div>
        </div>
        <div class="flex gap-3">
          <el-radio-group :model-value="locale" @change="handleLanguageChange">
            <el-radio-button v-for="l in SUPPORTED_LOCALES" :key="l" :value="l">
              {{ l === 'zh-CN' ? '简体中文' : 'English' }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>
  </div>
</template>
