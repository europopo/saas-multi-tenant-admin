import { test, expect } from '@playwright/test';

/**
 * 门户核心功能页面导航 E2E 测试
 * 以平台管理员身份登录后，验证各核心页面可正常加载（数据来自 Mock）。
 */

test.describe('门户核心页面导航', () => {
  test.beforeEach(async ({ page }) => {
    // 登录（admin 平台管理员，拥有全部权限）
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('仪表盘展示统计卡片与图表', async ({ page }) => {
    await expect(page.getByText('租户总数')).toBeVisible();
    await expect(page.getByText('活跃租户')).toBeVisible();
    await expect(page.getByText('子系统数量')).toBeVisible();
    await expect(page.getByText('用户数量')).toBeVisible();
    // 图表区域
    await expect(page.getByText('租户增长趋势')).toBeVisible();
    await expect(page.getByText('最近创建的租户')).toBeVisible();
  });

  test('租户列表页面可访问并加载数据', async ({ page }) => {
    await page.goto('/tenant/list');
    await expect(page.getByText('租户列表').first()).toBeVisible();
    // 表格加载出至少一个租户（演示数据）
    await expect(page.locator('.el-table__row').first()).toBeVisible({ timeout: 10_000 });
  });

  test('用户管理页面可访问', async ({ page }) => {
    await page.goto('/user/list');
    await expect(page.getByText('用户管理').first()).toBeVisible();
    await expect(page.locator('.el-table__row').first()).toBeVisible({ timeout: 10_000 });
  });

  test('角色管理页面可访问', async ({ page }) => {
    await page.goto('/role/list');
    await expect(page.getByText('角色管理').first()).toBeVisible();
    await expect(page.locator('.el-table__row').first()).toBeVisible({ timeout: 10_000 });
  });

  test('子系统管理页面可访问', async ({ page }) => {
    await page.goto('/subsystem/list');
    await expect(page.getByText('子系统管理', { exact: true }).first()).toBeVisible();
  });

  test('套餐管理已移除', async ({ page }) => {
    // 套餐管理入口已从系统移除，侧边栏不应出现「套餐管理」
    await expect(page.getByText('套餐管理', { exact: true })).toHaveCount(0);
  });

  test('退出登录后回到登录页', async ({ page }) => {
    // 点击右上角用户名展开下拉菜单
    await page.getByText('平台管理员', { exact: true }).click();
    // 点击「退出登录」
    await page.getByText('退出登录', { exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
