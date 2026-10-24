import { test, expect } from '@playwright/test';

/**
 * 登录与 SSO 核心流程 E2E 测试
 * 数据全部来自前端 Mock，验证构建产物下功能可用。
 */

test.describe('登录功能', () => {
  test('使用 admin 账号登录成功并进入仪表盘', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // 填写账号密码
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');

    // 点击登录（exact 精确匹配，避免命中「企业 SSO 单点登录」）
    await page.getByRole('button', { name: '登录', exact: true }).click();

    // 登录成功后跳转到仪表盘
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('仪表盘', { exact: true }).first()).toBeVisible();
    // 统计卡片渲染（mock 数据已加载）
    await expect(page.getByText('租户总数')).toBeVisible();
  });

  test('错误密码提示登录失败', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('wrong-password');
    await page.getByRole('button', { name: '登录', exact: true }).click();

    // 应弹出错误提示且不跳转
    await expect(page.getByText('用户名或密码错误')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('未登录访问受保护页面跳转登录页', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('SSO 单点登录', () => {
  test('SSO 登录页展示提供商并可完成登录', async ({ page }) => {
    await page.goto('/sso/login');

    // 展示提供商列表（企业统一认证 OIDC 等）
    await expect(page.getByText('选择登录方式')).toBeVisible();
    const oidc = page.getByText('企业统一认证', { exact: false }).first();
    await expect(oidc).toBeVisible();

    // 点击第一个启用的提供商发起登录
    await oidc.click();

    // 进入回调页，模拟授权成功后跳转到仪表盘
    await expect(page.getByText('正在跳转…')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText('租户总数')).toBeVisible();
  });
});
