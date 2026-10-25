/**
 * 子系统上下文状态管理
 * 维护平台全部子系统列表与当前激活的子系统，供顶部导航栏与布局使用。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Subsystem } from '@saas/shared';
import { subsystemApi } from '@/api';
import { useAuthStore } from '@/stores/auth';

export const useSubsystemStore = defineStore('subsystem', () => {
  const subsystems = ref<Subsystem[]>([]);
  const loaded = ref(false);

  async function loadSubsystems(force = false) {
    if (loaded.value && !force) return;
    try {
      const auth = useAuthStore();
      // 按当前用户角色过滤子系统可见性（平台级返回全部）
      subsystems.value = await subsystemApi.list(auth.user?.id).send();
      loaded.value = true;
    } catch {
      // 忽略加载失败，保持空列表
    }
  }

  /** 重新拉取子系统列表（增删改后调用，刷新顶部导航栏） */
  async function reload() {
    await loadSubsystems(true);
  }

  return { subsystems, loaded, loadSubsystems, reload };
});
