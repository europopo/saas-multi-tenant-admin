/**
 * 任务子系统认证状态（复用门户登录态）
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserInfo, LoginParams } from '@saas/shared';
import { authApi } from '@/api';

const TOKEN_KEY = 'saas_token';
const USER_KEY = 'saas_user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<UserInfo | null>(readStoredUser());

  const isLoggedIn = computed(() => !!token.value);

  function readStoredUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  async function login(params: LoginParams) {
    const result = await authApi.login(params).send();
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  }

  async function logout() {
    if (token.value) {
      try {
        await authApi.logout(token.value).send();
      } catch {
        // 忽略
      }
    }
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * 从跨应用跳转的 URL 参数导入登录态（跨端口单点登录）
   * 门户跳转到子系统时，通过 URL 携带 token 与用户信息，
   * 由于 localStorage 按 origin（含端口）隔离，需在此显式写入。
   */
  function importSession(tokenValue: string, userValue: string) {
    if (!tokenValue) return;
    token.value = tokenValue;
    localStorage.setItem(TOKEN_KEY, tokenValue);
    if (userValue) {
      try {
        const u = JSON.parse(decodeURIComponent(userValue)) as UserInfo;
        user.value = u;
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch {
        // 忽略 user 解析失败
      }
    }
  }

  async function fetchMe() {
    if (!token.value) return null;
    const me = await authApi.getMe(token.value).send();
    user.value = me;
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    return me;
  }

  function hasPermission(code: string): boolean {
    const perms = user.value?.permissions ?? [];
    return perms.some(
      (p) => p === '*' || p === code || (p.endsWith(':*') && code.startsWith(p.slice(0, -1))),
    );
  }

  return { token, user, isLoggedIn, login, logout, fetchMe, hasPermission, importSession };
});
