/**
 * 英文语言包 —— 跨应用共享的通用文案（命名空间 common）
 */
export default {
  common: {
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      reset: 'Reset',
      submit: 'Submit',
    },
    status: {
      active: 'Active',
      disabled: 'Disabled',
      enabled: 'Enabled',
      loading: 'Loading',
    },
    message: {
      success: 'Success',
      createSuccess: 'Created successfully',
      updateSuccess: 'Updated successfully',
      deleteSuccess: 'Deleted successfully',
      confirmDelete: 'Are you sure to delete?',
      operationFailed: 'Operation failed',
    },
  },
} as const;
