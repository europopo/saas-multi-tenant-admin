/**
 * 门户专属中文语言包（命名空间 portal）
 * 仅包含本次示范范围（登录页 + 顶栏 + 侧边栏标题）的文案，后续可逐步扩充。
 */
export default {
  portal: {
    login: {
      title: 'SaaS 多租户管理平台',
      subtitle: '统一管理租户、子系统与任务',
      accountLogin: '账号登录',
      username: '用户名',
      password: '密码',
      usernamePlaceholder: '请输入用户名',
      passwordPlaceholder: '请输入密码',
      loginButton: '登录',
      ssoButton: '企业 SSO 单点登录',
      demoAccount: '演示账号',
    },
    layout: {
      dashboard: '仪表盘',
      tenant: '租户管理',
      subsystem: '子系统管理',
      user: '用户与角色',
      dict: '数据字典',
      notice: '站内信',
      system: '系统管理',
      menu: '菜单管理',
      logout: '退出登录',
      profile: '个人中心',
      settings: '设置',
      theme: '主题切换',
    },
    settings: {
      title: '系统设置',
      description: '个性化你的使用体验',
      theme: {
        title: '主题',
        description: '切换浅色 / 深色外观',
        light: '浅色',
        dark: '深色',
      },
      language: {
        title: '语言',
        description: '切换界面显示语言',
      },
    },
    profile: {
      title: '个人中心',
      description: '查看与编辑你的账号信息',
      basic: '基本信息',
      username: '用户名',
      nickname: '昵称',
      email: '邮箱',
      phone: '手机号',
      role: '角色',
      tenant: '所属租户',
      status: '状态',
      createdAt: '创建时间',
      lastLoginAt: '最近登录',
      edit: '编辑资料',
      save: '保存',
      nicknamePlaceholder: '请输入昵称',
      emailPlaceholder: '请输入邮箱',
      phonePlaceholder: '请输入手机号',
      nicknameRequired: '昵称不能为空',
    },
  },
} as const;
