import { test, expect } from '@playwright/test';

/**
 * UI 优化二期 E2E 测试
 * 验证：主题切换、租户切换器、角色权限树、侧边栏收起按钮、套餐移除。
 */

test.describe('主题切换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('点击主题切换按钮可切换深浅色', async ({ page }) => {
    // 初始为浅色（html 无 dark class）
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // 点击主题切换按钮（圆形按钮，Sunny/Moon 图标）
    await page.locator('.el-button.is-circle').first().click();

    // 切换到深色，html 添加 dark class
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});

test.describe('租户切换器', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('顶栏展示当前租户并可切换', async ({ page }) => {
    // 顶栏展示当前租户名称（租户切换器）
    const tenantSwitcher = page.locator('header .el-dropdown').first();
    await expect(tenantSwitcher.getByText('示例科技有限公司', { exact: true })).toBeVisible();

    // 点击租户切换器展开下拉
    await tenantSwitcher.click();
    // 下拉展示租户列表（搜索框 + 租户项）
    const popper = page.locator('.tenant-switcher');
    await expect(popper.getByPlaceholder('搜索租户')).toBeVisible();
    const betaItem = popper.getByText('Beta 零售', { exact: true });
    await expect(betaItem).toBeVisible();

    // 选择另一个租户
    await betaItem.click();
    // 切换后出现成功提示
    await expect(page.locator('.el-message').first()).toBeVisible();
  });
});

test.describe('角色权限树', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/role/list');
    await expect(page.getByText('角色管理', { exact: true }).first()).toBeVisible();
  });

  test('编辑角色展示按子系统分组的权限树', async ({ page }) => {
    // 点击第一行的「编辑」
    await page.getByRole('button', { name: '编辑' }).first().click();
    // 弹窗中应出现权限树（按子系统分组 Tab）
    await expect(page.locator('.el-tree').first()).toBeVisible();
    // 默认「门户」分组树中应包含菜单节点
    await expect(page.locator('.el-tree').getByText('租户管理')).toBeVisible();
    // 存在子系统分组 Tab（如「任务管理」）
    await expect(page.locator('.el-tabs__item').filter({ hasText: '任务管理' })).toBeVisible();
    // 关闭弹窗
    await page.getByRole('button', { name: '取消' }).click();
  });

  test('角色权限按子系统分组配置并保存', async ({ page }) => {
    await page.getByRole('button', { name: '新建角色' }).click();
    await page.getByPlaceholder('如：租户管理员').fill('分组测试角色');
    await page.getByPlaceholder('如：tenant_admin').fill('group_test');
    // 门户分组下勾选「仪表盘」
    await page.locator('.el-tree').first().getByText('仪表盘').click();
    // 切换到「任务管理」分组
    await page.locator('.el-tabs__item').filter({ hasText: '任务管理' }).click();
    // 该分组树中应出现任务子系统菜单（如「任务看板」，来自菜单表）
    await expect(page.locator('.el-tree').getByText('任务看板')).toBeVisible();
    // 保存
    await page.getByRole('button', { name: '确定' }).click();
    await expect(page.locator('.el-message').first()).toBeVisible();
    // 列表出现新角色
    await expect(page.getByText('分组测试角色', { exact: true })).toBeVisible();
  });
});

test.describe('侧边栏收起按钮', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('收起按钮位于侧边栏底部且可切换', async ({ page }) => {
    // 收起菜单按钮存在
    const collapseBtn = page.getByText('收起菜单', { exact: true });
    await expect(collapseBtn).toBeVisible();

    // 点击收起
    await collapseBtn.click();
    // 收起后按钮文字消失（仅图标）
    await expect(page.getByText('收起菜单', { exact: true })).toHaveCount(0);
  });
});
