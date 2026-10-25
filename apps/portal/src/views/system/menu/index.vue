<script setup lang="ts">
/**
 * 菜单管理模块
 * 对齐 ruoyi-vue-pro：菜单作为一等实体，支持目录(dir)/菜单(menu)/按钮(button)三级，
 * 树形表格展示，增删改，按子系统筛选。数据驱动动态路由与侧边栏。
 */
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { MenuItem, MenuItemType, MenuScope, Subsystem } from '@saas/shared';
import { menuApi, subsystemApi } from '@/api';
import { PageHeader, StatusTag } from '@saas/ui';

const loading = ref(false);
const treeData = ref<MenuItem[]>([]);
const subsystems = ref<Subsystem[]>([]);

// 当前筛选子系统（portal 默认）
const currentSubsystem = ref('portal');

// 弹窗
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  id: '',
  name: '',
  code: '',
  type: 'menu' as MenuItemType,
  parentId: null as string | null,
  path: '',
  component: '',
  icon: '',
  sort: 99,
  visible: true,
  status: 'active' as 'active' | 'disabled',
  scope: 'common' as MenuScope,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9:_-]+$/, message: '仅支持字母数字与 : _ -', trigger: 'blur' },
  ],
};

const typeDict: { label: string; value: MenuItemType; color: 'primary' | 'success' | 'info' | 'danger' | 'warning' }[] = [
  { label: '目录', value: 'dir', color: 'primary' },
  { label: '菜单', value: 'menu', color: 'success' },
  { label: '按钮', value: 'button', color: 'info' },
];

const iconOptions = [
  'Odometer',
  'OfficeBuilding',
  'Grid',
  'User',
  'UserFilled',
  'Setting',
  'Menu',
  'List',
  'DataBoard',
  'Connection',
  'SetUp',
  'Tools',
];

/** 供「父级菜单」选择的目录/菜单节点（不含按钮） */
const parentOptions = computed<MenuItem[]>(() => {
  const all = treeData.value;
  const flatten = (items: MenuItem[]): MenuItem[] =>
    items.flatMap((m) => [m, ...(m.children ? flatten(m.children) : [])]);
  return flatten(all).filter((m) => m.type !== 'button');
});

const statusDict = [
  { label: '启用', value: 'active', color: 'success' },
  { label: '停用', value: 'disabled', color: 'info' },
];

/** 权限域选项 */
const scopeDict: { label: string; value: MenuScope; color: 'danger' | 'primary' | 'info' }[] = [
  { label: '平台级', value: 'platform', color: 'danger' },
  { label: '租户级', value: 'tenant', color: 'primary' },
  { label: '通用', value: 'common', color: 'info' },
];

/** 树形表格行样式：按节点类型区分层级视觉（目录/菜单/按钮） */
function rowClassName({ row }: { row: MenuItem }) {
  return `menu-row--${row.type}`;
}

async function loadSubsystems() {
  subsystems.value = await subsystemApi.list().send();
}

async function loadTree() {
  loading.value = true;
  try {
    treeData.value = await menuApi.tree({ subsystemCode: currentSubsystem.value }).send();
  } finally {
    loading.value = false;
  }
}

function switchSubsystem(code: string | number | boolean | undefined) {
  currentSubsystem.value = String(code ?? 'portal');
  loadTree();
}

function openCreate(parent?: MenuItem) {
  dialogMode.value = 'create';
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    type: parent ? 'menu' : 'dir',
    parentId: parent?.id ?? null,
    path: '',
    component: '',
    icon: '',
    sort: 99,
    visible: true,
    status: 'active',
    scope: 'common',
  });
  dialogVisible.value = true;
}

function openEdit(row: MenuItem) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type,
    parentId: row.parentId,
    path: row.path ?? '',
    component: row.component ?? '',
    icon: row.icon ?? '',
    sort: row.sort,
    visible: row.visible,
    status: row.status,
    scope: row.scope ?? 'common',
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const payload = {
        ...form,
        subsystemCode: currentSubsystem.value,
      };
      if (dialogMode.value === 'create') {
        await menuApi.create(payload).send();
        ElMessage.success('创建成功');
      } else {
        await menuApi.update(payload as Partial<MenuItem> & { id: string }).send();
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      loadTree();
      // 通知布局重新加载侧边栏（动态菜单即时生效）
      window.dispatchEvent(new CustomEvent('menu:changed'));
    } catch (e) {
      ElMessage.error((e as Error).message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
}

async function removeMenu(row: MenuItem) {
  await ElMessageBox.confirm(`确定删除菜单「${row.name}」及其子级吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  await menuApi.remove(row.id).send();
  ElMessage.success('删除成功');
  loadTree();
  window.dispatchEvent(new CustomEvent('menu:changed'));
}

onMounted(async () => {
  await loadSubsystems();
  await loadTree();
});
</script>

<template>
  <div>
    <PageHeader title="菜单管理" description="管理门户与各子系统的目录、菜单、按钮三级菜单，驱动动态路由与侧边栏">
      <template #actions>
        <el-button type="primary" @click="openCreate()">
          <el-icon class="mr-1"><component :is="'Plus'" /></el-icon>新增菜单
        </el-button>
      </template>
    </PageHeader>

    <!-- 子系统筛选 -->
    <div class="bg-white rounded-card shadow-card p-3 mb-4">
      <el-radio-group v-model="currentSubsystem" @change="switchSubsystem">
        <el-radio-button value="portal">门户</el-radio-button>
        <el-radio-button v-for="s in subsystems" :key="s.code" :value="s.code">
          {{ s.name }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="bg-white rounded-card shadow-card">
      <el-table
        v-loading="loading"
        :data="treeData"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children' }"
        :row-class-name="rowClassName"
      >
        <el-table-column prop="name" label="菜单名称" min-width="180">
          <template #default="{ row }">
            <span class="flex items-center gap-1.5">
              <el-icon
                v-if="row.icon"
                :size="row.type === 'dir' ? 16 : 14"
                :class="row.type === 'dir' ? 'text-[var(--el-color-primary)]' : 'text-[var(--el-text-color-secondary)]'"
              >
                <component :is="row.icon" />
              </el-icon>
              <span
                class="menu-name"
                :class="{
                  'font-semibold': row.type === 'dir',
                  'text-[var(--el-text-color-regular)]': row.type === 'button',
                }"
              >
                {{ row.name }}
              </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag
              :type="typeDict.find((t) => t.value === row.type)?.color"
              :size="row.type === 'button' ? 'small' : 'default'"
              :effect="row.type === 'button' ? 'plain' : 'light'"
            >
              {{ typeDict.find((t) => t.value === row.type)?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="权限标识" min-width="140" />
        <el-table-column prop="path" label="路由地址" min-width="140" />
        <el-table-column prop="component" label="组件" min-width="150" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="可见" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small" effect="plain">
              {{ row.visible ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <StatusTag :dict="statusDict" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="权限域" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="scopeDict.find((s) => s.value === (row.scope ?? 'common'))?.color"
              size="small"
              effect="light"
            >
              {{ scopeDict.find((s) => s.value === (row.scope ?? 'common'))?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openCreate(row as MenuItem)">新增下级</el-button>
            <el-button link type="primary" @click="openEdit(row as MenuItem)">编辑</el-button>
            <el-button link type="danger" @click="removeMenu(row as MenuItem)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增菜单' : '编辑菜单'"
      width="620px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="菜单类型">
          <el-radio-group v-model="form.type">
            <el-radio-button value="dir">目录</el-radio-button>
            <el-radio-button value="menu">菜单</el-radio-button>
            <el-radio-button value="button">按钮</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="权限域">
          <el-radio-group v-model="form.scope">
            <el-radio-button value="platform">平台级</el-radio-button>
            <el-radio-button value="tenant">租户级</el-radio-button>
            <el-radio-button value="common">通用</el-radio-button>
          </el-radio-group>
          <div class="text-xs text-gray-400 leading-tight mt-1">
            平台级菜单仅平台级角色可授权与可见；通用菜单所有角色可见。
          </div>
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="如：租户列表" />
        </el-form-item>
        <el-form-item label="权限标识" prop="code">
          <el-input v-model="form.code" placeholder="如 tenant-list / tenant:create" />
        </el-form-item>
        <el-form-item label="父级菜单">
          <el-select v-model="form.parentId" clearable placeholder="顶级" style="width: 100%">
            <el-option
              v-for="p in parentOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
              :disabled="p.id === form.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type !== 'button'" label="路由地址">
          <el-input v-model="form.path" placeholder="如 /tenant/list" />
        </el-form-item>
        <el-form-item v-if="form.type === 'menu'" label="组件路径">
          <el-input v-model="form.component" placeholder="如 tenant/index" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="form.icon" clearable filterable style="width: 100%">
            <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon">
              <el-icon class="mr-1"><component :is="icon" /></el-icon>{{ icon }}
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="可见性">
          <el-switch v-model="form.visible" active-text="显示" inactive-text="隐藏" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style>
/* 菜单管理树形表格 —— 按节点类型区分层级视觉 */
.el-table .menu-row--dir {
  --el-table-tr-bg-color: var(--el-fill-color-light);
}
.el-table .menu-row--dir td.el-table__cell {
  background-color: var(--el-fill-color-light);
}
.el-table .menu-row--dir .menu-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.el-table .menu-row--menu .menu-name {
  color: var(--el-text-color-regular);
}
.el-table .menu-row--button .menu-name {
  color: var(--el-text-color-secondary);
}
/* 子行（菜单/按钮）第一列整体向右偏移，强化层级辨识。
   el-table 第一列左内边距由 .cell 的 padding-left 控制（默认 12px），
   树形层级缩进由 .el-table__indent 控制；此处为子行 .cell 追加左偏移 */
.el-table .menu-row--menu td:first-child .cell,
.el-table .menu-row--button td:first-child .cell {
  padding-left: 32px;
}
</style>
