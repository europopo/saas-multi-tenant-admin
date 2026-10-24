import { test, expect } from '@playwright/test';

/**
 * 导航栏与子系统 E2E 测试
 * 验证：侧边栏显示、顶部子系统导航栏、子系统跳转。
 */

test.describe('侧边栏导航', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('侧边栏展示门户菜单', async ({ page }) => {
    // 侧边栏应展示各菜单项（套餐管理已移除）
    await expect(page.getByText('仪表盘', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('租户管理', { exact: true })).toBeVisible();
    await expect(page.getByText('子系统管理', { exact: true })).toBeVisible();
    await expect(page.getByText('用户与角色', { exact: true })).toBeVisible();
    await expect(page.getByText('套餐管理', { exact: true })).toHaveCount(0);
  });

  test('侧边栏点击可切换页面', async ({ page }) => {
    // 点击「租户管理」展开子菜单，点击「租户列表」
    await page.getByText('租户管理', { exact: true }).click();
    await page.getByText('租户列表', { exact: true }).click();
    await expect(page).toHaveURL(/\/tenant\/list/);
  });
});

test.describe('顶部子系统导航栏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('顶部导航栏展示门户与子系统', async ({ page }) => {
    // 顶部导航应展示「门户」+ 各子系统
    const topnav = page.locator('.topnav-item');
    await expect(topnav.first()).toBeVisible();
    await expect(page.getByText('门户', { exact: true })).toBeVisible();
    await expect(page.getByText('任务管理', { exact: true })).toBeVisible();
    await expect(page.getByText('数据分析', { exact: true })).toBeVisible();
  });

  test('点击任务管理子系统跳转到任务子系统', async ({ page }) => {
    // 点击顶部「任务管理」
    await page.getByText('任务管理', { exact: true }).click();
    // 跳转到 task-system（5174 端口），进入任务看板而非登录页
    await page.waitForURL(/5174/, { timeout: 15_000 });
    // 登录态保留（未跳回登录页），任务看板菜单加载
    await expect(page.getByText('任务看板', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    // 顶部导航在子系统内同样展示
    await expect(page.locator('.topnav-item').first()).toBeVisible();
  });
});
