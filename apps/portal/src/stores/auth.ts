/**
 * 认证状态管理
 * 管理登录状态、当前用户信息、token，以及登录/退出逻辑。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserInfo, LoginParams, SsoCallbackParams, SsoLoginResult } from '@saas/shared';
import { authApi, ssoApi } from '@/api';

const TOKEN_KEY = 'saas_token';
const USER_KEY = 'saas_user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<UserInfo | null>(readStoredUser());

  const isLoggedIn = computed(() => !!token.value);
  const isPlatformAdmin = computed(() => user.value?.isPlatformAdmin ?? false);

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

  /**
   * SSO 登录（携带回调授权码换取 token 与用户信息）
   * 与普通登录共用登录态写入逻辑，首次 SSO 登录会在 mock 层自动创建账号。
   */
  async function loginBySso(params: SsoCallbackParams): Promise<SsoLoginResult> {
    const result = await ssoApi.callback(params).send();
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
        // 忽略退出接口错误
      }
    }
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * 从跨应用跳转的 URL 参数导入登录态（跨端口单点登录）
   * 子系统跳回门户时，通过 URL 携带 token 与用户信息。
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

  /** 判断是否拥有权限 */
  function hasPermission(code: string): boolean {
    const perms = user.value?.permissions ?? [];
    return perms.some(
      (p) => p === '*' || p === code || (p.endsWith(':*') && code.startsWith(p.slice(0, -1))),
    );
  }

  return {
    token,
    user,
    isLoggedIn,
    isPlatformAdmin,
    login,
    loginBySso,
    logout,
    fetchMe,
    hasPermission,
    importSession,
  };
});
