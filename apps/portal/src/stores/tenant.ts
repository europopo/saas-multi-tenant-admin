/**
 * 租户上下文状态管理
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Tenant } from '@saas/shared';
import { tenantApi } from '@/api';

export const useTenantStore = defineStore('tenant', () => {
  const currentTenant = ref<Tenant | null>(null);
  const allTenants = ref<Tenant[]>([]);

  async function loadTenants() {
    const result = await tenantApi.list({ page: 1, pageSize: 100 }).send();
    allTenants.value = result.list;
  }

  function setCurrentTenant(tenant: Tenant | null) {
    currentTenant.value = tenant;
  }

  return { currentTenant, allTenants, loadTenants, setCurrentTenant };
});
