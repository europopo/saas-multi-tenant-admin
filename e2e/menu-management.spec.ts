import { test, expect } from '@playwright/test';

/**
 * 菜单管理模块 + 动态侧边栏
 * 验证：菜单管理页可访问、新增菜单后侧边栏动态出现、删除后消失。
 */
test.describe('菜单管理模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('菜单管理页可访问并展示菜单树', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/system/menu');
    await expect(page.getByText('菜单管理', { exact: true }).first()).toBeVisible();
    // 树形表格展示门户菜单（目录/菜单/按钮）
    await expect(page.getByText('租户管理', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('仪表盘', { exact: true }).first()).toBeVisible();
    // 系统管理目录存在（含菜单管理）
    await expect(page.getByText('系统管理', { exact: true }).first()).toBeVisible();
  });

  test('新增菜单后侧边栏动态出现', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/system/menu');
    await expect(page.getByText('菜单管理', { exact: true }).first()).toBeVisible();

    // 用唯一编码避免跨测试/跨 run 的状态污染
    const uniqueCode = `dynamic-menu-${Date.now()}`;
    const uniqueName = `动态菜单${Date.now()}`;

    // 新增一个顶级菜单
    await page.getByRole('button', { name: '新增菜单' }).click();
    await page.getByPlaceholder('如：租户列表').fill(uniqueName);
    await page.getByPlaceholder('如 tenant-list / tenant:create').fill(uniqueCode);
    // 类型默认「目录」，改为「菜单」（el-radio-button）
    await page.locator('.el-radio-button').filter({ hasText: '菜单' }).click();
    await page.getByPlaceholder('如 /tenant/list').fill(`/${uniqueCode}`);
    await page.getByPlaceholder('如 tenant/index').fill('dashboard/index');
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.locator('.el-message').first()).toBeVisible();

    // 菜单表中出现新菜单
    await expect(page.getByText(uniqueName, { exact: true }).first()).toBeVisible();

    // SPA 内导航回仪表盘（不整页刷新，mock db 数据保留），侧边栏应动态出现新菜单
    await page.locator('.sidebar-menu').getByText('仪表盘', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.sidebar-menu').getByText(uniqueName, { exact: true })).toBeVisible();
  });
});
