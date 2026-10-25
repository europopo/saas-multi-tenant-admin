/**
 * 中文语言包 —— 跨应用共享的通用文案（命名空间 common）
 * 各子系统业务文案放在各自的命名空间文件（如 portal、task-system）。
 */
export default {
  common: {
    actions: {
      save: '保存',
      cancel: '取消',
      confirm: '确定',
      delete: '删除',
      edit: '编辑',
      create: '新建',
      search: '搜索',
      reset: '重置',
      submit: '提交',
    },
    status: {
      active: '启用',
      disabled: '停用',
      enabled: '已启用',
      loading: '加载中',
    },
    message: {
      success: '操作成功',
      createSuccess: '创建成功',
      updateSuccess: '更新成功',
      deleteSuccess: '删除成功',
      confirmDelete: '确定要删除吗？',
      operationFailed: '操作失败',
    },
  },
} as const;
