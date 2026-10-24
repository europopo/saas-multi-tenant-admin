/**
 * 任务领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type {
  Task,
  TaskQuery,
  TaskLog,
  TaskStatusHistory,
  TaskRetryRecord,
  PageResult,
  DashboardData,
  ThirdSystem,
  TaskTypeRule,
  SystemSettings,
} from '@saas/shared';
import { RESPONSE, BUSINESS_CODE, generateId, paginate } from '@saas/shared';
import { db } from '../db';

/** 任务类型到规则默认值的映射 */
function ruleFor(type: Task['type']): TaskTypeRule | undefined {
  return db.taskTypeRules.find((r) => r.type === type && r.enabled);
}

export default defineMock({
  /** 任务列表（分页 + 多维筛选 + 排序） */
  '/task/list': ({ query }) => {
    const q = query as unknown as TaskQuery & Record<string, string>;
    const keyword = (q.keyword ?? '').trim();
    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 10;

    let list = [...db.tasks];

    // 关键词
    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(k) ||
          t.code.toLowerCase().includes(k) ||
          t.id.toLowerCase().includes(k),
      );
    }
    // 多维筛选
    if (q.thirdSystemId) list = list.filter((t) => t.thirdSystemId === q.thirdSystemId);
    if (q.type) list = list.filter((t) => t.type === q.type);
    if (q.status) list = list.filter((t) => t.status === q.status);
    if (q.priority) list = list.filter((t) => t.priority === q.priority);
    if (q.startTime) list = list.filter((t) => t.createdAt >= q.startTime!);
    if (q.endTime) list = list.filter((t) => t.createdAt <= q.endTime!);

    // 排序
    const sortField = q.sortField ?? 'createdAt';
    const sortOrder = q.sortOrder ?? 'desc';
    list.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortField] as
        string | number | undefined;
      const bv = (b as unknown as Record<string, unknown>)[sortField] as
        string | number | undefined;
      const cmp =
        av === undefined || bv === undefined
          ? 0
          : typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const result = paginate(list, page, pageSize);
    return RESPONSE.success<PageResult<Task>>({
      list: result.list,
      total: result.total,
      page,
      pageSize,
    });
  },

  /** 任务详情 */
  '/task/{id}': ({ params }) => {
    const task = db.tasks.find((t) => t.id === params.id);
    if (!task) return RESPONSE.error('任务不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<Task>(task);
  },

  /** 任务执行日志 */
  '/task/{id}/logs': ({ params }) => {
    const logs = db.taskLogs
      .filter((l) => l.taskId === params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return RESPONSE.success<TaskLog[]>(logs);
  },

  /** 任务状态变更历史 */
  '/task/{id}/history': ({ params }) => {
    const history = db.taskStatusHistories
      .filter((h) => h.taskId === params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return RESPONSE.success<TaskStatusHistory[]>(history);
  },

  /** 任务重试记录 */
  '/task/{id}/retries': ({ params }) => {
    const records = db.taskRetryRecords
      .filter((r) => r.taskId === params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return RESPONSE.success<TaskRetryRecord[]>(records);
  },

  /** 创建任务 */
  '[POST]/task/create': ({ data }) => {
    const body = data as Partial<Task>;
    if (!body.name || !body.code || !body.thirdSystemId || !body.type) {
      return RESPONSE.error(
        '任务名称、编码、第三方系统和类型不能为空',
        BUSINESS_CODE.VALIDATION_ERROR,
      );
    }
    if (db.tasks.some((t) => t.code === body.code)) {
      return RESPONSE.error('任务编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const rule = ruleFor(body.type);
    const task: Task = {
      id: generateId('task'),
      name: body.name,
      code: body.code,
      thirdSystemId: body.thirdSystemId,
      thirdSystemName: db.thirdSystems.find((s) => s.id === body.thirdSystemId)?.name,
      type: body.type,
      status: 'pending',
      priority: body.priority ?? rule?.defaultPriority ?? 'medium',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      config: {
        params: body.config?.params ?? {},
        timeout: body.config?.timeout ?? rule?.timeout ?? 600,
        maxRetry: body.config?.maxRetry ?? rule?.maxRetry ?? 3,
        retryStrategy: body.config?.retryStrategy ?? rule?.retryStrategy ?? 'fixed',
        allowManual: body.config?.allowManual ?? rule?.allowManual ?? true,
        allowCancel: body.config?.allowCancel ?? rule?.allowCancel ?? true,
        cron: body.config?.cron,
      },
      creator: body.creator ?? '当前用户',
      remark: body.remark,
    };
    db.tasks.unshift(task);
    db.taskLogs.unshift({
      id: generateId('log'),
      taskId: task.id,
      level: 'info',
      message: '任务已创建并入队',
      timestamp: task.createdAt,
    });
    return RESPONSE.success<Task>(task, '创建成功');
  },

  /** 编辑任务配置（仅允许 pending 状态） */
  '[PUT]/task/update': ({ data }) => {
    const body = data as Partial<Task> & { id: string };
    const idx = db.tasks.findIndex((t) => t.id === body.id);
    if (idx === -1) return RESPONSE.error('任务不存在', BUSINESS_CODE.NOT_FOUND);
    const task = db.tasks[idx]!;
    if (task.status !== 'pending') {
      return RESPONSE.error('仅待执行状态的任务允许编辑配置', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (body.code && db.tasks.some((t) => t.code === body.code && t.id !== body.id)) {
      return RESPONSE.error('任务编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    db.tasks[idx] = { ...task, ...body, id: body.id, status: 'pending' };
    return RESPONSE.success<Task>(db.tasks[idx]!, '更新成功');
  },

  /** 手动触发任务 */
  '[POST]/task/trigger': ({ data }) => {
    const { id } = data as { id: string };
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return RESPONSE.error('任务不存在', BUSINESS_CODE.NOT_FOUND);
    if (!task.config.allowManual) {
      return RESPONSE.error('该任务类型不允许手动触发', BUSINESS_CODE.FORBIDDEN);
    }
    if (task.status === 'running') {
      return RESPONSE.error('任务正在执行中', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (task.status === 'success') {
      return RESPONSE.error('任务已成功完成，无需重复触发', BUSINESS_CODE.VALIDATION_ERROR);
    }
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.finishedAt = undefined;
    db.taskStatusHistories.unshift({
      id: generateId('hist'),
      taskId: id,
      from: 'pending',
      to: 'running',
      operator: '当前用户',
      timestamp: new Date().toISOString(),
    });
    return RESPONSE.success<Task>(task, '任务已触发');
  },

  /** 取消任务 */
  '[POST]/task/cancel': ({ data }) => {
    const { id } = data as { id: string };
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return RESPONSE.error('任务不存在', BUSINESS_CODE.NOT_FOUND);
    if (!task.config.allowCancel) {
      return RESPONSE.error('该任务类型不允许取消', BUSINESS_CODE.FORBIDDEN);
    }
    if (task.status === 'success' || task.status === 'canceled') {
      return RESPONSE.error('任务已结束，无法取消', BUSINESS_CODE.VALIDATION_ERROR);
    }
    task.status = 'canceled';
    task.finishedAt = new Date().toISOString();
    return RESPONSE.success<Task>(task, '任务已取消');
  },

  /** 重试失败任务 */
  '[POST]/task/retry': ({ data }) => {
    const { id } = data as { id: string };
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return RESPONSE.error('任务不存在', BUSINESS_CODE.NOT_FOUND);
    if (task.status !== 'failed') {
      return RESPONSE.error('仅失败的任务允许重试', BUSINESS_CODE.VALIDATION_ERROR);
    }
    task.status = 'pending';
    task.startedAt = undefined;
    task.finishedAt = undefined;
    task.errorMessage = undefined;
    db.taskRetryRecords.unshift({
      id: generateId('retry'),
      taskId: id,
      attempt: task.retryCount + 1,
      result: 'failed',
      errorMessage: '由用户手动触发重试',
      timestamp: new Date().toISOString(),
    });
    return RESPONSE.success<Task>(task, '任务已重新入队');
  },

  /** 删除任务 */
  '[DELETE]/task/{id}': ({ params }) => {
    const idx = db.tasks.findIndex((t) => t.id === params.id);
    if (idx === -1) return RESPONSE.error('任务不存在', BUSINESS_CODE.NOT_FOUND);
    const [removed] = db.tasks.splice(idx, 1);
    // 清理关联数据
    db.taskLogs = db.taskLogs.filter((l) => l.taskId !== params.id);
    db.taskStatusHistories = db.taskStatusHistories.filter((h) => h.taskId !== params.id);
    db.taskRetryRecords = db.taskRetryRecords.filter((r) => r.taskId !== params.id);
    return RESPONSE.success<Task>(removed!, '删除成功');
  },

  /** 批量删除 */
  '[POST]/task/batch-delete': ({ data }) => {
    const { ids } = data as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return RESPONSE.error('请选择要删除的任务', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const removed = db.tasks.filter((t) => ids.includes(t.id));
    db.tasks = db.tasks.filter((t) => !ids.includes(t.id));
    db.taskLogs = db.taskLogs.filter((l) => !ids.includes(l.taskId));
    db.taskStatusHistories = db.taskStatusHistories.filter((h) => !ids.includes(h.taskId));
    db.taskRetryRecords = db.taskRetryRecords.filter((r) => !ids.includes(r.taskId));
    return RESPONSE.success<number>(removed.length, `已删除 ${removed.length} 个任务`);
  },

  /** 任务看板统计 */
  '/task/dashboard': ({ query }) => {
    const q = query as { thirdSystemId?: string; startTime?: string; endTime?: string };
    let tasks = [...db.tasks];
    if (q.thirdSystemId) tasks = tasks.filter((t) => t.thirdSystemId === q.thirdSystemId);
    if (q.startTime) tasks = tasks.filter((t) => t.createdAt >= q.startTime!);
    if (q.endTime) tasks = tasks.filter((t) => t.createdAt <= q.endTime!);

    const total = tasks.length;
    const success = tasks.filter((t) => t.status === 'success').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    const today = new Date().toDateString();
    const todayTasks = tasks.filter((t) => new Date(t.createdAt).toDateString() === today).length;

    // 近期趋势（近 7 天）
    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86_400_000);
      const dayTasks = tasks.filter(
        (t) => new Date(t.createdAt).toDateString() === d.toDateString(),
      );
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        total: dayTasks.length,
        success: dayTasks.filter((t) => t.status === 'success').length,
        failed: dayTasks.filter((t) => t.status === 'failed').length,
      };
    });

    // 第三方系统分布
    const distribution = db.thirdSystems
      .filter((s) => s.status === 'active')
      .map((s) => ({
        thirdSystemId: s.id,
        thirdSystemName: s.name,
        count: tasks.filter((t) => t.thirdSystemId === s.id).length,
      }))
      .filter((d) => d.count > 0);

    const recentTasks = [...tasks]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
    const recentFailedTasks = tasks.filter((t) => t.status === 'failed').slice(0, 8);

    const data: DashboardData = {
      stats: {
        totalTasks: total,
        pendingTasks: tasks.filter((t) => t.status === 'pending').length,
        runningTasks: tasks.filter((t) => t.status === 'running').length,
        successTasks: success,
        failedTasks: failed,
        todayTasks,
        successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
      },
      trend,
      distribution,
      recentTasks,
      recentFailedTasks,
    };
    return RESPONSE.success<DashboardData>(data);
  },

  /** 第三方系统列表 */
  '/third-system/list': ({ query }) => {
    const q = query as { keyword?: string; status?: string };
    let list = [...db.thirdSystems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (q.keyword) {
      const k = q.keyword.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(k) || s.code.toLowerCase().includes(k),
      );
    }
    if (q.status) list = list.filter((s) => s.status === q.status);
    const withCount = list.map((s) => ({
      ...s,
      taskCount: db.tasks.filter((t) => t.thirdSystemId === s.id).length,
    }));
    return RESPONSE.success<ThirdSystem[]>(withCount);
  },

  /** 第三方系统详情 */
  '/third-system/{id}': ({ params }) => {
    const sys = db.thirdSystems.find((s) => s.id === params.id);
    if (!sys) return RESPONSE.error('第三方系统不存在', BUSINESS_CODE.NOT_FOUND);
    return RESPONSE.success<ThirdSystem>({
      ...sys,
      taskCount: db.tasks.filter((t) => t.thirdSystemId === sys.id).length,
    });
  },

  /** 创建第三方系统 */
  '[POST]/third-system/create': ({ data }) => {
    const body = data as Partial<ThirdSystem>;
    if (!body.name || !body.code || !body.type) {
      return RESPONSE.error('系统名称、编码和类型不能为空', BUSINESS_CODE.VALIDATION_ERROR);
    }
    if (db.thirdSystems.some((s) => s.code === body.code)) {
      return RESPONSE.error('编码已存在', BUSINESS_CODE.VALIDATION_ERROR);
    }
    const sys: ThirdSystem = {
      id: generateId('ts'),
      name: body.name,
      code: body.code,
      description: body.description ?? '',
      type: body.type,
      status: body.status ?? 'active',
      endpoint: body.endpoint ?? '',
      owner: body.owner ?? '',
      credentialMasked: 'sk_****_demo',
      createdAt: new Date().toISOString(),
    };
    db.thirdSystems.push(sys);
    return RESPONSE.success<ThirdSystem>(sys, '创建成功');
  },

  /** 更新第三方系统 */
  '[PUT]/third-system/update': ({ data }) => {
    const body = data as Partial<ThirdSystem> & { id: string };
    const idx = db.thirdSystems.findIndex((s) => s.id === body.id);
    if (idx === -1) return RESPONSE.error('第三方系统不存在', BUSINESS_CODE.NOT_FOUND);
    db.thirdSystems[idx] = { ...db.thirdSystems[idx]!, ...body, id: body.id };
    return RESPONSE.success<ThirdSystem>(db.thirdSystems[idx]!, '更新成功');
  },

  /** 第三方系统启停 */
  '[POST]/third-system/toggle-status': ({ data }) => {
    const { id, status } = data as { id: string; status: 'active' | 'disabled' };
    const sys = db.thirdSystems.find((s) => s.id === id);
    if (!sys) return RESPONSE.error('第三方系统不存在', BUSINESS_CODE.NOT_FOUND);
    sys.status = status;
    return RESPONSE.success<ThirdSystem>(sys, status === 'active' ? '已启用' : '已停用');
  },

  /** 任务类型规则列表 */
  '/task-type/list': () => {
    return RESPONSE.success<TaskTypeRule[]>(db.taskTypeRules);
  },

  /** 更新任务类型规则 */
  '[PUT]/task-type/update': ({ data }) => {
    const body = data as Partial<TaskTypeRule> & { id: string };
    const idx = db.taskTypeRules.findIndex((r) => r.id === body.id);
    if (idx === -1) return RESPONSE.error('规则不存在', BUSINESS_CODE.NOT_FOUND);
    db.taskTypeRules[idx] = { ...db.taskTypeRules[idx]!, ...body, id: body.id };
    return RESPONSE.success<TaskTypeRule>(db.taskTypeRules[idx]!, '更新成功');
  },

  /** 任务类型规则启停 */
  '[POST]/task-type/toggle-status': ({ data }) => {
    const { id, enabled } = data as { id: string; enabled: boolean };
    const rule = db.taskTypeRules.find((r) => r.id === id);
    if (!rule) return RESPONSE.error('规则不存在', BUSINESS_CODE.NOT_FOUND);
    rule.enabled = enabled;
    return RESPONSE.success<TaskTypeRule>(rule, enabled ? '已启用' : '已停用');
  },

  /** 系统基础设置 */
  '/settings': () => {
    return RESPONSE.success<SystemSettings>(db.systemSettings);
  },

  /** 更新系统设置 */
  '[PUT]/settings': ({ data }) => {
    const body = data as Partial<SystemSettings>;
    db.systemSettings = { ...db.systemSettings, ...body };
    return RESPONSE.success<SystemSettings>(db.systemSettings, '保存成功');
  },
});
