<script setup lang="ts">
/**
 * 角色管理（RBAC）— 子系统级菜单权限
 * 权限配置按「子系统」分组：每个子系统一套独立菜单/按钮权限树，
 * 分组数据源来自 /menu/for-role（与菜单管理同源，新增子系统自动出现）。
 */
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { Role, PermissionGroup, SubsystemPermission, MenuItem } from '@saas/shared';
import { isPlatformMenuItem } from '@saas/shared';
import { roleApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const loading = ref(false);
const list = ref<Role[]>([]);

// 当前用户是否为平台级（租户级用户仅能创建/编辑租户级角色）
const isPlatformUser = computed(() => auth.user?.scope === 'platform' || auth.isPlatformAdmin);

// 权限数据源（按子系统分组的菜单树）
const permissionGroups = ref<PermissionGroup[]>([]);
const activeGroup = ref('portal');

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();
const submitting = ref(false);

// 每个子系统分组的树实例（key: subsystemCode -> treeRef）
const treeRefs = ref<Record<string, any>>({});

const form = reactive({
  id: '',
  code: '',
  name: '',
  description: '',
  scope: 'tenant' as Role['scope'],
});

/**
 * 权限数据源（含 scope 约束）：
 * 当角色为「租户级」时，平台级菜单（租户/子系统/用户/角色/菜单管理等）节点禁用，
 * 无法被勾选 —— 保证租户级角色不会被授予平台级权限。
 */
const displayGroups = computed<PermissionGroup[]>(() => {
  if (form.scope === 'platform') return permissionGroups.value;
  const markDisabled = (items: MenuItem[]): MenuItem[] =>
    items.map((m) => ({
      ...m,
      disabled: isPlatformMenuItem(m),
      children: m.children ? markDisabled(m.children) : undefined,
    }));
  return permissionGroups.value.map((g) => ({
    ...g,
    menus: markDisabled(g.menus),
  }));
});

/** 每个子系统分组的已勾选编码集合（含半选父级） */
const checkedByGroup = ref<Record<string, string[]>>({});

const rules: FormRules = {
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
};

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

function setTreeRef(code: string) {
  return (el: any) => {
    if (el) treeRefs.value[code] = el;
  };
}

/** 获取某个分组已勾选（含半选）的编码 */
function getGroupChecked(code: string): string[] {
  const tree = treeRefs.value[code];
  if (!tree) return checkedByGroup.value[code] ?? [];
  const checked = (tree.getCheckedKeys(false) as string[]) ?? [];
  const half = (tree.getHalfCheckedKeys() as string[]) ?? [];
  return Array.from(new Set([...checked, ...half]));
}

async function load() {
  loading.value = true;
  try {
    // 租户级用户按当前用户做数据隔离（只看到本租户角色）
    list.value = await roleApi.list(auth.user?.id).send();
  } finally {
    loading.value = false;
  }
}

async function loadPermissionGroups() {
  permissionGroups.value = await roleApi.menus().send();
  if (permissionGroups.value.length && !permissionGroups.value.some((g) => g.subsystemCode === activeGroup.value)) {
    activeGroup.value = permissionGroups.value[0]!.subsystemCode;
  }
}

function openCreate() {
  dialogMode.value = 'create';
  Object.assign(form, { id: '', code: '', name: '', description: '', scope: 'tenant' });
  checkedByGroup.value = {};
  dialogVisible.value = true;
  nextTick(() => {
    // 清空所有分组的树勾选
    for (const code of Object.keys(treeRefs.value)) {
      treeRefs.value[code]?.setCheckedKeys([]);
    }
  });
}

function openEdit(row: Role) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    scope: row.scope,
  });
  // 从 subsystemPermissions 反填各分组勾选；若无分组数据则回退到扁平码
  const byGroup: Record<string, string[]> = {};
  const sp = row.subsystemPermissions ?? [];
  for (const g of permissionGroups.value) {
    const matched = sp.find((s) => s.subsystemCode === g.subsystemCode);
    if (matched) {
      byGroup[g.subsystemCode] = Array.from(
        new Set([...(matched.menuCodes ?? []), ...(matched.permissionCodes ?? [])]),
      );
    } else {
      byGroup[g.subsystemCode] = [];
    }
  }
  // 无 subsystemPermissions 时，用扁平 menuCodes/permissionCodes 兜底到 portal 分组
  if (sp.length === 0) {
    byGroup['portal'] = Array.from(
      new Set([...(row.menuCodes ?? []), ...(row.permissionCodes ?? [])]),
    );
  }
  checkedByGroup.value = byGroup;
  dialogVisible.value = true;
  nextTick(() => {
    for (const code of Object.keys(checkedByGroup.value)) {
      treeRefs.value[code]?.setCheckedKeys(checkedByGroup.value[code] ?? []);
    }
  });
}

/** 树节点勾选变化（同步到 checkedByGroup） */
function onCheckChange(code: string) {
  checkedByGroup.value[code] = getGroupChecked(code);
}

/** 切换权限域：切到「租户级」时清理各分组已勾选的平台级节点 */
function onScopeChange() {
  if (form.scope !== 'tenant') return;
  for (const g of permissionGroups.value) {
    const platformCodes = new Set(
      g.menus
        .flatMap((m) => [m, ...(m.children ?? [])])
        .filter((n) => isPlatformMenuItem(n))
        .map((n) => n.code),
    );
    if (platformCodes.size === 0) continue;
    const current = checkedByGroup.value[g.subsystemCode] ?? [];
    checkedByGroup.value[g.subsystemCode] = current.filter((c) => !platformCodes.has(c));
    // 同步树勾选态
    nextTick(() => {
      treeRefs.value[g.subsystemCode]?.setCheckedKeys(
        checkedByGroup.value[g.subsystemCode] ?? [],
      );
    });
  }
}

/** 获取某分组「可勾选」的节点编码（排除 scope 约束下的平台级禁用节点） */
function getSelectableCodes(code: string): string[] {
  const group = displayGroups.value.find((g) => g.subsystemCode === code);
  if (!group) return [];
  const flatten = (items: MenuItem[]): MenuItem[] =>
    items.flatMap((m) => [m, ...(m.children ? flatten(m.children) : [])]);
  return flatten(group.menus)
    .filter((m) => !m.disabled)
    .map((m) => m.code);
}

/** 全选/清空某个分组 */
function isGroupAllSelected(code: string): boolean {
  const allCodes = getSelectableCodes(code);
  const current = checkedByGroup.value[code] ?? [];
  return allCodes.length > 0 && allCodes.every((c) => current.includes(c));
}

/** 全选/清空某个分组 */
function toggleSelectAll(code: string) {
  const tree = treeRefs.value[code];
  if (!tree) return;
  const allCodes = getSelectableCodes(code);
  const current = checkedByGroup.value[code] ?? [];
  const isAllSelected = allCodes.length > 0 && allCodes.every((c) => current.includes(c));
  if (isAllSelected) {
    tree.setCheckedKeys([]);
    checkedByGroup.value[code] = [];
  } else {
    tree.setCheckedKeys(allCodes);
    checkedByGroup.value[code] = allCodes;
  }
}

/** 从按分组的勾选结果组装 subsystemPermissions + 聚合扁平码 */
function buildPermissions(): {
  subsystemPermissions: SubsystemPermission[];
  menuCodes: string[];
  permissionCodes: string[];
} {
  const subsystemPermissions: SubsystemPermission[] = [];
  const flatMenu = new Set<string>();
  const flatPerm = new Set<string>();

  for (const g of permissionGroups.value) {
    const codes = checkedByGroup.value[g.subsystemCode] ?? [];
    if (codes.length === 0) continue;
    // scope 兜底：租户级角色过滤掉平台级禁用节点的编码
    const disabledCodes =
      form.scope === 'tenant'
        ? new Set(
            g.menus
              .flatMap((m) => [m, ...(m.children ?? [])])
              .filter((n) => isPlatformMenuItem(n))
              .map((n) => n.code),
          )
        : new Set<string>();
    // 该分组内全部按钮码（type === 'button'）
    const buttonCodes = new Set(
      g.menus
        .flatMap((m) => [m, ...(m.children ?? [])])
        .filter((n) => n.type === 'button')
        .map((n) => n.code),
    );
    const menu: string[] = [];
    const perm: string[] = [];
    for (const c of codes) {
      if (disabledCodes.has(c)) continue;
      if (buttonCodes.has(c)) {
        perm.push(c);
        flatPerm.add(c);
      } else {
        menu.push(c);
        flatMenu.add(c);
      }
    }
    if (menu.length === 0 && perm.length === 0) continue;
    subsystemPermissions.push({
      subsystemCode: g.subsystemCode,
      menuCodes: menu,
      permissionCodes: perm,
    });
  }

  return {
    subsystemPermissions,
    menuCodes: Array.from(flatMenu),
    permissionCodes: Array.from(flatPerm),
  };
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const { subsystemPermissions, menuCodes, permissionCodes } = buildPermissions();
      const payload = {
        id: form.id,
        code: form.code,
        name: form.name,
        description: form.description,
        scope: form.scope,
        // 平台级角色 tenantId 恒为 null；租户级角色归属当前用户所在租户
        tenantId: form.scope === 'platform' ? null : (auth.user?.tenantId ?? null),
        menuCodes,
        permissionCodes,
        subsystemPermissions,
      };
      if (dialogMode.value === 'create') {
        await roleApi.create(payload).send();
        ElMessage.success('创建成功');
      } else {
        await roleApi.update(payload).send();
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      load();
    } catch (e) {
      ElMessage.error((e as Error).message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
}

async function removeRole(row: Role) {
  await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  await roleApi.remove(row.id).send();
  ElMessage.success('删除成功');
  load();
}

onMounted(async () => {
  await loadPermissionGroups();
  await load();
});
</script>

<template>
  <div>
    <PageHeader title="角色管理" description="基于角色的访问控制（RBAC），按子系统分组配置菜单级与按钮级权限">
      <template #actions>
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新建角色
        </el-button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-card shadow-card">
      <el-table v-loading="loading" :data="list" row-key="id">
        <el-table-column prop="name" label="角色名称" width="140" />
        <el-table-column prop="code" label="编码" width="160" />
        <el-table-column label="权限域" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.scope === 'platform' ? 'danger' : 'primary'"
              size="small"
              effect="light"
            >
              {{ row.scope === 'platform' ? '平台级' : '租户级' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="授权子系统" min-width="140">
          <template #default="{ row }">
            <el-tag
              v-for="sp in (row.subsystemPermissions ?? [])"
              :key="sp.subsystemCode"
              size="small"
              class="mr-1"
              effect="plain"
            >
              {{ sp.subsystemCode }}
            </el-tag>
            <span v-if="!(row.subsystemPermissions ?? []).length" class="text-xs text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :dict="statusDict" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row as Role)">编辑</el-button>
            <el-button link type="danger" @click="removeRole(row as Role)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建角色' : '编辑角色'"
      width="720px"
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="如：租户管理员" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" :disabled="dialogMode === 'edit'" placeholder="如：tenant_admin" />
        </el-form-item>
        <el-form-item label="权限域">
          <el-radio-group v-model="form.scope" @change="onScopeChange">
            <el-radio value="platform" :disabled="!isPlatformUser">平台级</el-radio>
            <el-radio value="tenant">租户级</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="权限配置">
          <div class="w-full border border-gray-200 rounded-md overflow-hidden">
            <!-- 子系统分组 Tab -->
            <el-tabs v-model="activeGroup" class="permission-tabs">
              <el-tab-pane
                v-for="g in displayGroups"
                :key="g.subsystemCode"
                :label="g.name"
                :name="g.subsystemCode"
              >
                <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <span class="text-xs text-gray-400">
                    {{ g.name }} · 菜单与操作权限（父子联动）
                  </span>
                  <el-button link type="primary" size="small" @click="toggleSelectAll(g.subsystemCode)">
                    {{ isGroupAllSelected(g.subsystemCode) ? '清空' : '全选' }}
                  </el-button>
                </div>
                <div class="p-3 max-h-72 overflow-y-auto">
                  <el-tree
                    :ref="setTreeRef(g.subsystemCode)"
                    :data="g.menus"
                    show-checkbox
                    node-key="code"
                    default-expand-all
                    :props="{ label: 'name', children: 'children', disabled: 'disabled' }"
                    @check="onCheckChange(g.subsystemCode)"
                  >
                    <template #default="{ data }">
                      <span class="flex items-center gap-1">
                        <el-icon v-if="data.icon" :size="14"><component :is="data.icon" /></el-icon>
                        <span>{{ data.name }}</span>
                        <el-tag v-if="data.type === 'dir'" size="small" type="primary" effect="plain" class="ml-1"
                          >目录</el-tag
                        >
                        <el-tag v-if="data.type === 'button'" size="small" type="info" effect="plain" class="ml-1"
                          >操作</el-tag
                        >
                      </span>
                    </template>
                  </el-tree>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.permission-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
}
.permission-tabs :deep(.el-tabs__nav-wrap)::after {
  height: 1px;
}
</style>
