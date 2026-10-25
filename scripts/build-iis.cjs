/**
 * IIS 一键打包脚本
 *
 * 功能：
 *   1. 构建 portal 与 task-system 两个应用；
 *   2. 将各应用根目录下的 web.config（URL 重写 + MIME）注入对应 dist 产物；
 *   3. 输出 IIS 站点配置指引。
 *
 * 发布目录：构建完成后直接使用 apps/portal/dist 与 apps/task-system/dist，
 * 将整个 dist 目录内容上传到 IIS 站点物理路径即可。
 *
 * 用法（在项目根目录执行）：
 *   node scripts/build-iis.cjs                # 生产模式（加载 .env.production）
 *   node scripts/build-iis.cjs --mode test    # 测试模式（加载 .env.test，子目录部署）
 *   pnpm build:iis -- --mode test
 *
 * mode 说明：透传给 vite build 的 --mode 参数，决定加载哪个 .env 文件
 *   - 默认 production → apps 下各应用的 .env.production
 *   - test           → apps 下各应用的 .env.test（子目录部署测试）
 *   - development    → apps 下各应用的 .env.development
 *
 * 环境变量（可选，优先级高于 .env 文件）：
 *   PORTAL_BASE   portal 的部署路径前缀，如 /portal/
 *   TASK_BASE     task-system 的部署路径前缀，如 /task/
 *   VITE_TASK_URL / VITE_PORTAL_URL 跨应用单点登录地址（通常写在 .env 文件里）
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 解析 --mode xxx 参数
const modeIdx = process.argv.indexOf('--mode');
const mode = modeIdx !== -1 ? process.argv[modeIdx + 1] : 'production';
const modeSuffix = ` --mode ${mode}`;

// 环境变量快捷覆盖（可选）
const portalBase = process.env.PORTAL_BASE || '';
const taskBase = process.env.TASK_BASE || '';

function run(cmd, cwd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env } });
}

function injectWebConfig(appDir, appName) {
  const src = path.join(appDir, 'web.config');
  const dest = path.join(appDir, 'dist', 'web.config');
  if (!fs.existsSync(src)) {
    console.warn(`  ! 未找到 ${src}，请确认已创建 URL 重写配置`);
    return;
  }
  fs.copyFileSync(src, dest);
  console.log(`  ✓ 已将 web.config 注入 ${appName} 的 dist`);
}

// 拼装 base 透传（若设置了 PORTAL_BASE/TASK_BASE 则覆盖，否则交给 .env 文件）
const portalBaseEnv = portalBase ? `VITE_APP_BASE=${portalBase} ` : '';
const taskBaseEnv = taskBase ? `VITE_APP_BASE=${taskBase} ` : '';

console.log(`=== IIS 打包（mode = ${mode}）===`);

// 1. 构建 portal
console.log('\n=== [1/3] 构建 portal ===');
run(`pnpm --filter @saas/portal exec vite build${modeSuffix}`, ROOT);

// 2. 构建 task-system
console.log('\n=== [2/3] 构建 task-system ===');
run(`pnpm --filter @saas/task-system exec vite build${modeSuffix}`, ROOT);

// 3. 注入 web.config
console.log('\n=== [3/3] 注入 web.config ===');
injectWebConfig(path.join(ROOT, 'apps/portal'), 'portal');
injectWebConfig(path.join(ROOT, 'apps/task-system'), 'task-system');

console.log('\n=== 完成 ===');
console.log('发布目录（将目录内全部内容上传到 IIS 站点物理路径）：');
console.log(`  portal      → ${path.join(ROOT, 'apps/portal/dist')}`);
console.log(`  task-system → ${path.join(ROOT, 'apps/task-system/dist')}`);
console.log('\nIIS 配置指引：');
console.log('  1. portal / task-system 各建一个站点（或虚拟目录），物理路径指向上述 dist');
console.log('  2. 站点需安装并启用「URL 重写」模块（web.config 已内置 SPA fallback 与 MIME 规则）');
console.log('  3. 子目录部署时用 --mode test（读 .env.test），或在各 app 的 .env 里配 VITE_TASK_URL / VITE_PORTAL_URL 支持跨应用单点登录');
