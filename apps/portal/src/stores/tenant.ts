/**
 * 租户上下文状态管理
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Tenant } from '@saas/shared';
import { tenantApi } from '@/api';
import { useAuthStore } from '@/stores/auth';

export const useTenantStore = defineStore('tenant', () => {
  const currentTenant = ref<Tenant | null>(null);
  const allTenants = ref<Tenant[]>([]);

  async function loadTenants() {
    const auth = useAuthStore();
    // 传入当前用户 id，租户级用户仅返回本租户（数据行级隔离）
    const result = await tenantApi
      .list({ page: 1, pageSize: 100, userId: auth.user?.id })
      .send();
    allTenants.value = result.list;
  }

  function setCurrentTenant(tenant: Tenant | null) {
    currentTenant.value = tenant;
  }

  return { currentTenant, allTenants, loadTenants, setCurrentTenant };
});
