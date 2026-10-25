/**
 * 内存数据仓库
 *
 * 用内存数组模拟后端数据库，所有 Mock 接口处理器均读写此仓库，
 * 保证同一份业务数据在不同接口间保持一致。
 * 仅用于开发/演示环境。
 */
import type {
  UserInfo,
  Role,
  Tenant,
  Subsystem,
  Task,
  ThirdSystem,
  TaskTypeRule,
  SystemSettings,
  TaskLog,
  TaskStatusHistory,
  TaskRetryRecord,
  ActivityRecord,
  SsoProvider,
  MenuItem,
  SubsystemPermission,
  DictType,
  DictData,
  NoticeMessage,
  MessageReadState,
} from '@saas/shared';
import { generateId, ALL_MENU_SEED } from '@saas/shared';

/** 内存数据库结构 */
export interface Database {
  users: UserInfo[];
  roles: Role[];
  tenants: Tenant[];
  subsystems: Subsystem[];
  tasks: Task[];
  thirdSystems: ThirdSystem[];
  taskTypeRules: TaskTypeRule[];
  systemSettings: SystemSettings;
  taskLogs: TaskLog[];
  taskStatusHistories: TaskStatusHistory[];
  taskRetryRecords: TaskRetryRecord[];
  activities: ActivityRecord[];
  /** SSO 身份提供商 */
  ssoProviders: SsoProvider[];
  /** 菜单表（唯一菜单数据源，含门户 + 各子系统） */
  menus: MenuItem[];
  /** SSO 授权码 → 模拟 IdP 返回的用户信息 */
  ssoAuthCodes: Map<string, { provider: string; username: string; nickname: string; email: string }>;
  /** 认证 token → 用户 id */
  tokens: Map<string, string>;
  /** 用户名 → 密码（登录凭据，内置演示账号 + 一键开通租户时动态登记） */
  credentials: Record<string, string>;
  /** 字典类型表（纯租户级） */
  dictTypes: DictType[];
  /** 字典数据表 */
  dictData: DictData[];
  /** 站内信消息本体表 */
  notices: NoticeMessage[];
  /** 站内信用户已读状态表（用户 × 消息） */
  messageReadStates: MessageReadState[];
}

const now = Date.now();
const day = 86_400_000;

/** 生成 ISO 时间字符串 */
function iso(offsetMs = 0): string {
  return new Date(now + offsetMs).toISOString();
}

/** 初始化数据库 */
function initDatabase(): Database {
  // 子系统
  const subsystems: Subsystem[] = [
    {
      id: 'sub-task',
      name: '任务管理',
      code: 'task-system',
      description: '第三方任务管理子系统，管理不同业务系统之间的任务执行与结果。',
      icon: 'List',
      entryUrl: '/task',
      status: 'active',
      isDefault: true,
      createdAt: iso(-160 * day),
    },
    {
      id: 'sub-analytics',
      name: '数据分析',
      code: 'analytics',
      description: '多维度数据分析与可视化报表平台。',
      icon: 'DataAnalysis',
      entryUrl: '/analytics',
      status: 'active',
      createdAt: iso(-120 * day),
    },
    {
      id: 'sub-im',
      name: '消息中心',
      code: 'im-center',
      description: '统一消息通知与站内信管理。',
      icon: 'Message',
      entryUrl: '/im',
      status: 'disabled',
      createdAt: iso(-90 * day),
    },
  ];

  // 租户
  const tenants: Tenant[] = [
    {
      id: 'tenant-demo',
      name: '示例科技有限公司',
      code: 'demo-tech',
      status: 'active',
      contact: '张三',
      email: 'admin@demo-tech.com',
      subsystemIds: ['sub-task', 'sub-analytics'],
      createdAt: iso(-150 * day),
      expiredAt: iso(215 * day),
      userCount: 23,
    },
    {
      id: 'tenant-alpha',
      name: 'Alpha 网络',
      code: 'alpha-net',
      status: 'active',
      contact: '李四',
      email: 'ops@alpha-net.com',
      subsystemIds: ['sub-task', 'sub-analytics', 'sub-im'],
      createdAt: iso(-120 * day),
      expiredAt: iso(245 * day),
      userCount: 120,
    },
    {
      id: 'tenant-beta',
      name: 'Beta 零售',
      code: 'beta-retail',
      status: 'pending',
      contact: '王五',
      email: 'owner@beta-retail.com',
      subsystemIds: ['sub-task'],
      createdAt: iso(-10 * day),
      expiredAt: iso(355 * day),
      userCount: 3,
    },
    {
      id: 'tenant-gamma',
      name: 'Gamma 制造',
      code: 'gamma-mfg',
      status: 'disabled',
      contact: '赵六',
      email: 'it@gamma-mfg.com',
      subsystemIds: ['sub-task'],
      createdAt: iso(-200 * day),
      expiredAt: iso(-5 * day),
      userCount: 45,
    },
    {
      id: 'tenant-delta',
      name: 'Delta 教育',
      code: 'delta-edu',
      status: 'active',
      contact: '孙七',
      email: 'admin@delta-edu.com',
      subsystemIds: ['sub-task'],
      createdAt: iso(-60 * day),
      expiredAt: iso(305 * day),
      userCount: 31,
    },
    {
      id: 'tenant-epsilon',
      name: 'Epsilon 医疗',
      code: 'epsilon-med',
      status: 'active',
      contact: '周八',
      email: 'info@epsilon-med.com',
      subsystemIds: ['sub-task', 'sub-analytics'],
      createdAt: iso(-30 * day),
      expiredAt: iso(335 * day),
      userCount: 88,
    },
  ];

  // 角色
  const roles: Role[] = [
    {
      id: 'role-platform-admin',
      code: 'platform_admin',
      name: '平台管理员',
      description: '拥有平台全部权限，可管理租户、子系统',
      scope: 'platform',
      tenantId: null,
      menuCodes: ['*'],
      permissionCodes: ['*'],
      status: 'active',
      createdAt: iso(-160 * day),
    },
    {
      id: 'role-tenant-admin',
      code: 'tenant_admin',
      name: '租户管理员',
      description: '管理租户内用户、角色与资源',
      scope: 'tenant',
      tenantId: 'tenant-demo',
      menuCodes: ['dashboard', 'tenant', 'subsystem', 'user', 'role', 'dict', 'notice', 'task'],
      permissionCodes: [
        'tenant:read',
        'tenant:write',
        'subsystem:read',
        'user:read',
        'user:write',
        'role:read',
        'role:write',
        'task:*',
      ],
      subsystemPermissions: [
        { subsystemCode: 'portal', menuCodes: ['dashboard', 'tenant', 'subsystem', 'user', 'role', 'dict', 'notice'], permissionCodes: ['tenant:read', 'tenant:write', 'subsystem:read', 'user:read', 'user:write', 'role:read', 'role:write'] },
        { subsystemCode: 'task-system', menuCodes: ['task-system:dashboard', 'task-system:list'], permissionCodes: ['task:*'] },
      ],
      status: 'active',
      createdAt: iso(-160 * day),
    },
    {
      id: 'role-tenant-user',
      code: 'tenant_user',
      name: '租户成员',
      description: '普通成员，可访问被授权的子系统与任务',
      scope: 'tenant',
      tenantId: 'tenant-demo',
      menuCodes: ['dashboard', 'notice', 'task'],
      permissionCodes: ['task:read', 'task:write'],
      subsystemPermissions: [
        { subsystemCode: 'portal', menuCodes: ['dashboard', 'notice'], permissionCodes: [] },
        { subsystemCode: 'task-system', menuCodes: ['task-system:dashboard', 'task-system:list'], permissionCodes: ['task-system:create', 'task-system:edit'] },
      ],
      status: 'active',
      createdAt: iso(-160 * day),
    },
  ];

  // 用户
  const users: UserInfo[] = [
    {
      id: 'user-admin',
      username: 'admin',
      nickname: '平台管理员',
      avatar: '',
      email: 'admin@saas.com',
      status: 'active',
      roleIds: ['role-platform-admin'],
      roles: ['platform_admin'],
      permissions: ['*'],
      tenantId: null,
      isPlatformAdmin: true,
      createdAt: iso(-160 * day),
      lastLoginAt: iso(-1 * day),
    },
    {
      id: 'user-tenant-admin',
      username: 'tenant_admin',
      nickname: '租户管理员',
      avatar: '',
      email: 'tenant@saas.com',
      status: 'active',
      roleIds: ['role-tenant-admin'],
      roles: ['tenant_admin'],
      permissions: [
        // 菜单码（菜单可见性）
        'dashboard',
        'tenant',
        'tenant-list',
        'subsystem',
        'subsystem-list',
        'user',
        'user-list',
        'role',
        'role-list',
        'dict',
        'notice',
        // 操作码（按钮级）
        'tenant:read',
        'tenant:write',
        'tenant:create',
        'tenant:edit',
        'tenant:toggle',
        'tenant:delete',
        'subsystem:read',
        'subsystem:create',
        'subsystem:edit',
        'subsystem:toggle',
        'user:read',
        'user:write',
        'user:create',
        'user:edit',
        'user:toggle',
        'user:delete',
        'role:read',
        'role:write',
        'role:create',
        'role:edit',
        'role:delete',
        'task:read',
        'task:write',
        'task:trigger',
        'task:cancel',
        'task:retry',
        'task:delete',
      ],
      tenantId: 'tenant-demo',
      isPlatformAdmin: false,
      createdAt: iso(-150 * day),
      lastLoginAt: iso(-2 * day),
    },
    {
      id: 'user-member',
      username: 'member',
      nickname: '普通成员',
      avatar: '',
      email: 'member@saas.com',
      status: 'active',
      roleIds: ['role-tenant-user'],
      roles: ['tenant_user'],
      permissions: [
        // 菜单码
        'dashboard',
        'notice',
        'task',
        // 操作码
        'task:read',
        'task:write',
      ],
      tenantId: 'tenant-demo',
      isPlatformAdmin: false,
      createdAt: iso(-100 * day),
      lastLoginAt: iso(-3 * day),
    },
  ];

  // 第三方系统
  const thirdSystems: ThirdSystem[] = [
    {
      id: 'ts-erp',
      name: '金蝶 ERP',
      code: 'kingdee-erp',
      description: '企业资源计划系统，提供采购、库存、财务数据。',
      type: 'erp',
      status: 'active',
      endpoint: 'https://erp.example.com/api',
      owner: '张三',
      credentialMasked: 'ak_****_8f2a',
      createdAt: iso(-140 * day),
    },
    {
      id: 'ts-crm',
      name: 'Salesforce CRM',
      code: 'salesforce-crm',
      description: '客户关系管理系统，提供客户与商机数据。',
      type: 'crm',
      status: 'active',
      endpoint: 'https://crm.example.com/api',
      owner: '李四',
      credentialMasked: 'sk_****_1b3d',
      createdAt: iso(-130 * day),
    },
    {
      id: 'ts-bi',
      name: 'Power BI',
      code: 'powerbi',
      description: '商业智能分析平台，提供报表与数据集。',
      type: 'bi',
      status: 'active',
      endpoint: 'https://bi.example.com/api',
      owner: '王五',
      credentialMasked: 'pk_****_9c7e',
      createdAt: iso(-100 * day),
    },
    {
      id: 'ts-custom',
      name: '自定义数据源',
      code: 'custom-source',
      description: '企业内部自定义数据接入源。',
      type: 'custom',
      status: 'disabled',
      endpoint: 'https://custom.example.com/api',
      owner: '赵六',
      credentialMasked: 'sk_****_4a6b',
      createdAt: iso(-80 * day),
    },
  ];

  // 任务类型规则
  const taskTypeRules: TaskTypeRule[] = [
    {
      id: 'rule-data-sync',
      type: 'data-sync',
      name: '数据同步',
      defaultPriority: 'medium',
      maxRetry: 3,
      retryStrategy: 'exponential',
      timeout: 600,
      allowManual: true,
      allowCancel: true,
      enabled: true,
      description: '在第三方系统之间同步数据',
    },
    {
      id: 'rule-report',
      type: 'report',
      name: '报表生成',
      defaultPriority: 'low',
      maxRetry: 1,
      retryStrategy: 'fixed',
      timeout: 300,
      allowManual: true,
      allowCancel: true,
      enabled: true,
      description: '定时生成业务报表',
    },
    {
      id: 'rule-backup',
      type: 'backup',
      name: '数据备份',
      defaultPriority: 'high',
      maxRetry: 2,
      retryStrategy: 'fixed',
      timeout: 1800,
      allowManual: true,
      allowCancel: false,
      enabled: true,
      description: '定期备份第三方系统数据',
    },
    {
      id: 'rule-notify',
      type: 'notify',
      name: '消息通知',
      defaultPriority: 'medium',
      maxRetry: 5,
      retryStrategy: 'exponential',
      timeout: 60,
      allowManual: false,
      allowCancel: true,
      enabled: true,
      description: '向用户推送消息通知',
    },
  ];

  // 系统设置
  const systemSettings: SystemSettings = {
    systemName: '任务管理子系统',
    systemDescription: '统一管理不同第三方系统之间的任务记录、执行状态与结果。',
    defaultPageSize: 10,
    defaultTaskFilter: { status: '', priority: '' },
    logRetentionDays: 30,
    taskStatusGuide:
      '任务状态包括：待执行（已创建未开始）、执行中（正在执行）、成功（执行完成）、失败（执行出错）、已取消（被手动取消）。',
    executionStrategyGuide:
      '任务按优先级调度；失败任务按类型规则自动重试；备份类任务不允许手动取消以保证数据完整性。',
  };

  // 任务（用 Mock 生成一批）
  const taskNames = [
    '库存同步到 ERP',
    '销售日报生成',
    '客户数据全量备份',
    '订单状态通知',
    '财务报表月度汇总',
    '商品价格批量更新',
    '会员积分同步',
    '工单状态推送',
    '门店销售数据同步',
    '供应商对账单生成',
  ];
  const statusPool: Array<{ status: Task['status']; weight: number }> = [
    { status: 'success', weight: 45 },
    { status: 'pending', weight: 20 },
    { status: 'running', weight: 10 },
    { status: 'failed', weight: 20 },
    { status: 'canceled', weight: 5 },
  ];

  const tasks: Task[] = Array.from({ length: 86 }, (_, i) => {
    const name = taskNames[i % taskNames.length]!;
    const third = thirdSystems[i % thirdSystems.length]!;
    // 加权随机状态
    const total = statusPool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    let status: Task['status'] = 'success';
    for (const p of statusPool) {
      r -= p.weight;
      if (r <= 0) {
        status = p.status;
        break;
      }
    }
    const createdAt = iso(-(30 - (i % 30)) * day - (i % 24) * 3_600_000);
    const startedAt =
      status === 'pending'
        ? undefined
        : iso(-(30 - (i % 30)) * day - (i % 24) * 3_600_000 + 60_000);
    const duration =
      status === 'pending' || status === 'running'
        ? undefined
        : Math.floor(Math.random() * 120_000) + 1_000;
    const finishedAt =
      startedAt && duration !== undefined
        ? new Date(new Date(startedAt).getTime() + duration).toISOString()
        : undefined;
    const types = ['data-sync', 'report', 'backup', 'notify', 'custom'] as const;
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;
    const type = types[i % types.length]!;
    const priority = priorities[i % priorities.length]!;
    const retryCount = status === 'failed' ? Math.floor(Math.random() * 3) : 0;

    return {
      id: `task-${String(i + 1).padStart(4, '0')}`,
      name,
      code: `TASK-${String(1000 + i)}`,
      thirdSystemId: third.id,
      thirdSystemName: third.name,
      type,
      status,
      priority,
      createdAt,
      startedAt,
      finishedAt,
      duration,
      retryCount,
      resultSummary:
        status === 'success'
          ? `同步完成，共处理 ${Math.floor(Math.random() * 5000) + 100} 条记录`
          : undefined,
      errorMessage: status === 'failed' ? '连接第三方系统超时，请检查网络或凭证配置' : undefined,
      config: {
        params: { source: third.code, mode: 'incremental' },
        timeout: 600,
        maxRetry: 3,
        retryStrategy: 'exponential',
        allowManual: true,
        allowCancel: true,
      },
      creator: ['平台管理员', '租户管理员', '普通成员'][i % 3]!,
      remark: i % 7 === 0 ? '演示任务数据' : undefined,
    };
  });

  // 任务日志
  const taskLogs: TaskLog[] = [];
  tasks.slice(0, 10).forEach((t) => {
    taskLogs.push(
      {
        id: generateId('log'),
        taskId: t.id,
        level: 'info',
        message: '任务已创建并入队',
        timestamp: t.createdAt,
      },
      {
        id: generateId('log'),
        taskId: t.id,
        level: 'info',
        message: '开始执行任务',
        timestamp: t.startedAt ?? t.createdAt,
      },
    );
    if (t.status === 'success') {
      taskLogs.push({
        id: generateId('log'),
        taskId: t.id,
        level: 'info',
        message: t.resultSummary ?? '执行成功',
        timestamp: t.finishedAt!,
      });
    } else if (t.status === 'failed') {
      taskLogs.push({
        id: generateId('log'),
        taskId: t.id,
        level: 'error',
        message: t.errorMessage ?? '执行失败',
        timestamp: t.finishedAt ?? t.createdAt,
      });
    }
  });

  // 状态历史
  const taskStatusHistories: TaskStatusHistory[] = [];
  tasks.slice(0, 8).forEach((t) => {
    taskStatusHistories.push({
      id: generateId('hist'),
      taskId: t.id,
      from: 'pending',
      to: t.status,
      operator: '系统',
      timestamp: t.startedAt ?? t.createdAt,
    });
  });

  // 重试记录
  const taskRetryRecords: TaskRetryRecord[] = [];
  tasks
    .filter((t) => t.retryCount > 0)
    .slice(0, 6)
    .forEach((t) => {
      for (let a = 1; a <= t.retryCount; a++) {
        taskRetryRecords.push({
          id: generateId('retry'),
          taskId: t.id,
          attempt: a,
          result: 'failed',
          errorMessage: t.errorMessage,
          timestamp: iso(-a * 3_600_000),
        });
      }
    });

  // 活动记录
  const activities: ActivityRecord[] = [
    {
      id: generateId('act'),
      type: 'tenant',
      description: '创建了新租户「Epsilon 医疗」',
      operator: '平台管理员',
      timestamp: iso(-2 * 3_600_000),
    },
    {
      id: generateId('act'),
      type: 'subsystem',
      description: '停用了子系统「消息中心」',
      operator: '平台管理员',
      timestamp: iso(-5 * 3_600_000),
    },
    {
      id: generateId('act'),
      type: 'task',
      description: '任务「客户数据全量备份」执行失败',
      operator: '系统',
      timestamp: iso(-8 * 3_600_000),
    },
    {
      id: generateId('act'),
      type: 'login',
      description: '租户管理员登录了系统',
      operator: '租户管理员',
      timestamp: iso(-10 * 3_600_000),
    },
    {
      id: generateId('act'),
      type: 'user',
      description: '新增用户「普通成员」',
      operator: '租户管理员',
      timestamp: iso(-1 * day),
    },
    {
      id: generateId('act'),
      type: 'tenant',
      description: '更新了租户「Alpha 网络」的授权子系统',
      operator: '平台管理员',
      timestamp: iso(-2 * day),
    },
  ];

  // SSO 身份提供商
  const ssoProviders: SsoProvider[] = [
    {
      id: 'sso-oidc',
      name: '企业统一认证 (OIDC)',
      type: 'oidc',
      code: 'oidc',
      icon: 'Key',
      color: '#2563eb',
      description: '基于 OIDC 协议的企业统一身份认证，支持多租户。',
      authorizeUrl: '/sso/authorize',
      redirectUri: '/sso/callback',
      status: 'active',
      isDefault: true,
      createdAt: iso(-150 * day),
    },
    {
      id: 'sso-wecom',
      name: '企业微信',
      type: 'wecom',
      code: 'wecom',
      icon: 'ChatDotRound',
      color: '#07c160',
      description: '使用企业微信扫码或工作台免密登录。',
      authorizeUrl: '/sso/authorize',
      redirectUri: '/sso/callback',
      status: 'active',
      isDefault: true,
      createdAt: iso(-140 * day),
    },
    {
      id: 'sso-feishu',
      name: '飞书',
      type: 'feishu',
      code: 'feishu',
      icon: 'Promotion',
      color: '#3370ff',
      description: '使用飞书账号免密登录。',
      authorizeUrl: '/sso/authorize',
      redirectUri: '/sso/callback',
      status: 'active',
      isDefault: true,
      createdAt: iso(-130 * day),
    },
    {
      id: 'sso-dingtalk',
      name: '钉钉',
      type: 'dingtalk',
      code: 'dingtalk',
      icon: 'OfficeBuilding',
      color: '#1677ff',
      description: '使用钉钉账号免密登录。',
      authorizeUrl: '/sso/authorize',
      redirectUri: '/sso/callback',
      status: 'disabled',
      isDefault: false,
      createdAt: iso(-120 * day),
    },
    {
      id: 'sso-ldap',
      name: 'LDAP 目录服务',
      type: 'ldap',
      code: 'ldap',
      icon: 'User',
      color: '#7c3aed',
      description: '企业内网 LDAP 目录服务认证。',
      authorizeUrl: '/sso/authorize',
      redirectUri: '/sso/callback',
      status: 'disabled',
      isDefault: false,
      createdAt: iso(-110 * day),
    },
  ];

  // 数据字典（纯租户级种子：示例科技租户的任务优先级 / 任务状态 / 行业类型）
  const dictTypes: DictType[] = [
    {
      id: 'dict-type-priority',
      name: '任务优先级',
      type: 'task_priority',
      status: 'active',
      tenantId: 'tenant-demo',
      remark: '任务管理子系统的优先级枚举',
      createdAt: iso(-100 * day),
    },
    {
      id: 'dict-type-status',
      name: '任务状态',
      type: 'task_status',
      status: 'active',
      tenantId: 'tenant-demo',
      remark: '任务生命周期状态',
      createdAt: iso(-100 * day),
    },
    {
      id: 'dict-type-industry',
      name: '行业类型',
      type: 'industry_type',
      status: 'active',
      tenantId: 'tenant-demo',
      remark: '客户所属行业分类',
      createdAt: iso(-90 * day),
    },
  ];

  const dictData: DictData[] = [
    { id: 'dict-data-p0', typeId: 'dict-type-priority', label: '紧急', value: 'urgent', sort: 1, status: 'active', tenantId: 'tenant-demo', color: 'danger', createdAt: iso(-99 * day) },
    { id: 'dict-data-p1', typeId: 'dict-type-priority', label: '高', value: 'high', sort: 2, status: 'active', tenantId: 'tenant-demo', color: 'warning', createdAt: iso(-99 * day) },
    { id: 'dict-data-p2', typeId: 'dict-type-priority', label: '中', value: 'medium', sort: 3, status: 'active', tenantId: 'tenant-demo', color: 'primary', createdAt: iso(-99 * day) },
    { id: 'dict-data-p3', typeId: 'dict-type-priority', label: '低', value: 'low', sort: 4, status: 'active', tenantId: 'tenant-demo', color: 'info', createdAt: iso(-99 * day) },
    { id: 'dict-data-s1', typeId: 'dict-type-status', label: '待执行', value: 'pending', sort: 1, status: 'active', tenantId: 'tenant-demo', color: 'info', createdAt: iso(-98 * day) },
    { id: 'dict-data-s2', typeId: 'dict-type-status', label: '执行中', value: 'running', sort: 2, status: 'active', tenantId: 'tenant-demo', color: 'primary', createdAt: iso(-98 * day) },
    { id: 'dict-data-s3', typeId: 'dict-type-status', label: '已完成', value: 'success', sort: 3, status: 'active', tenantId: 'tenant-demo', color: 'success', createdAt: iso(-98 * day) },
    { id: 'dict-data-s4', typeId: 'dict-type-status', label: '已失败', value: 'failed', sort: 4, status: 'active', tenantId: 'tenant-demo', color: 'danger', createdAt: iso(-98 * day) },
    { id: 'dict-data-i1', typeId: 'dict-type-industry', label: '互联网', value: 'internet', sort: 1, status: 'active', tenantId: 'tenant-demo', createdAt: iso(-89 * day) },
    { id: 'dict-data-i2', typeId: 'dict-type-industry', label: '制造业', value: 'manufacturing', sort: 2, status: 'active', tenantId: 'tenant-demo', createdAt: iso(-89 * day) },
    { id: 'dict-data-i3', typeId: 'dict-type-industry', label: '金融', value: 'finance', sort: 3, status: 'active', tenantId: 'tenant-demo', createdAt: iso(-89 * day) },
  ];

  // 站内信（消息本体种子）
  const notices: NoticeMessage[] = [
    {
      id: 'notice-welcome',
      title: '欢迎使用 SaaS 平台',
      content: '欢迎加入 SaaS 多租户管理平台，您可以从仪表盘开始熟悉系统功能。',
      type: 'system',
      targetType: 'all',
      sender: 'system',
      tenantId: null,
      createdAt: iso(-5 * day),
    },
    {
      id: 'notice-tenant-expire',
      title: '租户到期提醒',
      content: '「Gamma 制造」租户已到期，请及时联系客户续费或停用该租户。',
      type: 'warning',
      targetType: 'all',
      sender: 'system',
      tenantId: null,
      createdAt: iso(-2 * day),
    },
    {
      id: 'notice-feature',
      title: '新功能上线：数据字典',
      content: '平台新增「数据字典」模块，租户管理员可自行配置业务枚举，无需等待平台下发。',
      type: 'business',
      targetType: 'tenant',
      targetIds: ['tenant-demo'],
      sender: 'system',
      tenantId: null,
      createdAt: iso(-1 * day),
    },
  ];

  // 站内信已读状态（演示：管理员已读欢迎通知，其余未读）
  const messageReadStates: MessageReadState[] = [
    { id: 'read-1', messageId: 'notice-welcome', userId: 'user-admin', isRead: true, readAt: iso(-4 * day) },
    { id: 'read-2', messageId: 'notice-welcome', userId: 'user-tenant-admin', isRead: true, readAt: iso(-3 * day) },
  ];

  return {
    users,
    roles,
    tenants,
    subsystems,
    tasks,
    thirdSystems,
    taskTypeRules,
    systemSettings,
    taskLogs,
    taskStatusHistories,
    taskRetryRecords,
    activities,
    ssoProviders,
    menus: [...ALL_MENU_SEED],
    ssoAuthCodes: new Map(),
    tokens: new Map(),
    credentials: {
      admin: 'admin123',
      tenant_admin: 'tenant123',
      member: 'member123',
    },
    dictTypes,
    dictData,
    notices,
    messageReadStates,
  };
}

/** 全局数据库单例 */
export const db: Database = initDatabase();

/** 重置数据库（用于测试） */
export function resetDatabase(): void {
  const fresh = initDatabase();
  Object.assign(db, fresh);
}

/**
 * 根据用户的角色，动态聚合其「权限域 scope」与「可访问子系统 accessibleSubsystems」。
 * 由于 UserInfo.scope / accessibleSubsystems 是运行时派生值，此处统一注入，
 * 保证登录态、用户列表、角色变更后三处结果一致。
 */
export function resolveUserAuth(user: UserInfo): UserInfo {
  const roles = user.roleIds
    .map((rid) => db.roles.find((r) => r.id === rid))
    .filter((r): r is Role => Boolean(r));
  const isPlatform = roles.some((r) => r.scope === 'platform');
  const scope: Role['scope'] = isPlatform ? 'platform' : 'tenant';
  // 平台级：可访问全部子系统；租户级：取角色授权的子系统编码并集
  let accessibleSubsystems: string[];
  if (isPlatform) {
    accessibleSubsystems = db.subsystems.map((s) => s.code);
  } else {
    const codes = new Set<string>();
    for (const r of roles) {
      for (const sp of r.subsystemPermissions ?? []) {
        if (sp.subsystemCode) codes.add(sp.subsystemCode);
      }
    }
    accessibleSubsystems = Array.from(codes);
  }
  return { ...user, scope, accessibleSubsystems };
}

/**
 * 根据「已开通的子系统 id 列表」构建租户管理员（TENANT_ADMIN）角色的权限：
 * - portal 分组：仅授予 dashboard 通用菜单
 * - 每个已开通子系统：授予该子系统下的全部菜单/按钮编码
 * 返回该角色的 menuCodes / permissionCodes / subsystemPermissions。
 */
export function buildTenantAdminPermissions(
  subsystemIds: string[],
): Pick<Role, 'menuCodes' | 'permissionCodes' | 'subsystemPermissions'> {
  const subsystemCodes = subsystemIds
    .map((sid) => db.subsystems.find((s) => s.id === sid)?.code)
    .filter((c): c is string => Boolean(c));

  const subsystemPermissions: SubsystemPermission[] = [];
  const menuCodes = new Set<string>();
  const permissionCodes = new Set<string>();

  // 门户：dashboard 通用菜单 + 「用户与角色」管理菜单（租户管理员默认可管理本租户成员）
  const portalMenus = db.menus.filter((m) => m.subsystemCode === 'portal');
  const portalCommonCodes = portalMenus
    .filter((m) => m.scope === 'common') // dashboard + user/role 管理（scope=common）
    .map((m) => m.code);
  const portalMenusList: string[] = [];
  const portalPermsList: string[] = [];
  for (const code of portalCommonCodes) {
    const menu = portalMenus.find((m) => m.code === code);
    if (!menu) continue;
    if (menu.type === 'button') {
      portalPermsList.push(code);
      permissionCodes.add(code);
    } else {
      portalMenusList.push(code);
      menuCodes.add(code);
    }
  }
  subsystemPermissions.push({
    subsystemCode: 'portal',
    menuCodes: portalMenusList,
    permissionCodes: portalPermsList,
  });

  // 每个已开通子系统：授予全部菜单码 + 按钮码
  for (const code of subsystemCodes) {
    const menus = db.menus.filter((m) => m.subsystemCode === code);
    if (menus.length === 0) continue;
    const mcodes: string[] = [];
    const pcodes: string[] = [];
    for (const m of menus) {
      if (m.type === 'button') {
        pcodes.push(m.code);
        permissionCodes.add(m.code);
      } else {
        mcodes.push(m.code);
        menuCodes.add(m.code);
      }
    }
    subsystemPermissions.push({
      subsystemCode: code,
      menuCodes: mcodes,
      permissionCodes: pcodes,
    });
  }

  return {
    menuCodes: Array.from(menuCodes),
    permissionCodes: Array.from(permissionCodes),
    subsystemPermissions,
  };
}
