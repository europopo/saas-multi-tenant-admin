import { test, expect } from '@playwright/test';

/**
 * 子系统管理：新增、编辑、动态路由跳转、顶部导航刷新
 * 卡片定位策略：grid 容器的直接子 div，以唯一编码文本（如 test-subsystem）锚定卡片
 */
test.describe('子系统动态路由与编辑', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('新增子系统后出现在顶部导航并可跳转', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/subsystem/list');
    await expect(page.getByText('子系统管理', { exact: true }).first()).toBeVisible();

    // 新建子系统
    await page.getByRole('button', { name: '新建子系统' }).click();
    await page.getByPlaceholder('请输入子系统名称').fill('测试子系统');
    await page.getByPlaceholder('如 task-system').fill('test-subsystem');
    await page.getByPlaceholder('如 /task').fill('/test-subsystem');
    await page.getByPlaceholder('子系统功能描述').fill('用于验证动态路由的测试子系统');
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.locator('.el-message').first()).toBeVisible();

    // 新子系统卡片出现在列表（以唯一编码锚定）
    const card = page.locator('.grid > div').filter({ hasText: 'test-subsystem' });
    await expect(card).toBeVisible();

    // 新子系统出现在顶部导航栏（头部的导航区域）
    const header = page.locator('header');
    await expect(header.getByText('测试子系统', { exact: true })).toBeVisible();

    // 点击顶部导航的「测试子系统」跳转到动态路由内嵌页
    await header.getByText('测试子系统', { exact: true }).click();
    await expect(page).toHaveURL(/\/subsystem\/test-subsystem/);
    await expect(page.getByText('子系统内嵌页', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /返回门户/ })).toBeVisible();
  });

  test('编辑子系统名称后顶部导航同步更新', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/subsystem/list');
    await expect(page.getByText('子系统管理', { exact: true }).first()).toBeVisible();

    // 用唯一编码锚定「数据分析」卡片并点击其「编辑」按钮
    const card = page.locator('.grid > div').filter({ hasText: 'analytics' });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: '编辑' }).click();

    const nameInput = page.getByPlaceholder('请输入子系统名称');
    await nameInput.fill('数据分析（新版）');
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.locator('.el-message').first()).toBeVisible();

    // 顶部导航出现更新后的名称
    const header = page.locator('header');
    await expect(header.getByText('数据分析（新版）', { exact: true })).toBeVisible();
  });

  test('从子系统列表「进入应用」走动态路由', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/subsystem/list');

    // 用唯一编码锚定「数据分析」卡片并点击「进入应用」
    const card = page.locator('.grid > div').filter({ hasText: 'analytics' });
    await card.getByRole('button', { name: '进入应用' }).click();
    await expect(page).toHaveURL(/\/subsystem\/analytics/);
    await expect(page.getByText('子系统内嵌页', { exact: true })).toBeVisible();
  });
});
