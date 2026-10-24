/**
 * 门户仪表盘领域 Mock 接口
 */
import { defineMock } from '@alova/mock';
import type { PortalDashboardData } from '@saas/shared';
import { RESPONSE } from '@saas/shared';
import { db } from '../db';

export default defineMock({
  /** 门户仪表盘数据 */
  '/portal/dashboard': () => {
    const activeTenants = db.tenants.filter((t) => t.status === 'active').length;

    // 租户增长趋势（近 6 个月）
    const tenantGrowth = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.now() - (5 - i) * 30 * 86_400_000);
      const count = db.tenants.filter((t) => {
        const created = new Date(t.createdAt).getTime();
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        return created >= monthStart && created < monthStart + 30 * 86_400_000;
      }).length;
      return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, count };
    });

    // 子系统使用情况
    const subsystemUsage = db.subsystems.map((s) => ({
      subsystemId: s.id,
      subsystemName: s.name,
      tenantCount: db.tenants.filter((t) => t.subsystemIds.includes(s.id)).length,
    }));

    const data: PortalDashboardData = {
      stats: {
        totalTenants: db.tenants.length,
        activeTenants,
        totalSubsystems: db.subsystems.length,
        totalUsers: db.users.length,
      },
      tenantGrowth,
      subsystemUsage,
      recentTenants: [...db.tenants]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
      recentActivities: [...db.activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    };
    return RESPONSE.success<PortalDashboardData>(data);
  },
});
