import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const customDir = path.join(rootDir, 'custom');
const distDir = path.join(rootDir, 'dist');
const versionStateFile = path.join(rootDir, 'version.json');

const UPSTREAM_URLS = [
  'https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.json5',
  'https://cdn.jsdelivr.net/gh/Lin-arm/GKD_subscription@main/dist/gkd.json5',
  'https://gkd667.vv.ax/gkd.json5'
];

const UPSTREAM_VERSION_URL = 'https://raw.githubusercontent.com/Lin-arm/GKD_subscription/main/dist/gkd.version.json5';

async function fetchWithFallback(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      console.log(`正在从 ${url} 获取 upstream 规则...`);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GkdSync/1.0)' }
      });
      if (res.ok) {
        return await res.text();
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      console.warn(`从 ${url} 获取失败: ${err.message}，尝试备用地址...`);
      lastError = err;
    }
  }
  throw new Error(`所有 upstream 规则源获取均失败: ${lastError?.message}`);
}

function parseJson5(text) {
  return (new Function('return ' + text))();
}

function computeCustomHash() {
  const hash = crypto.createHash('sha256');
  if (!fs.existsSync(customDir)) return '';
  const files = fs.readdirSync(customDir).filter(f => f.endsWith('.json')).sort();
  for (const f of files) {
    hash.update(f);
    hash.update(fs.readFileSync(path.join(customDir, f)));
  }
  return hash.digest('hex').slice(0, 8);
}

async function main() {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. 获取 upstream 数据
  const upstreamRaw = await fetchWithFallback(UPSTREAM_URLS);
  const upstreamData = parseJson5(upstreamRaw);
  const upstreamVersion = Number(upstreamData.version) || 1;
  console.log(`成功获取 667 规则，upstream 版本: v${upstreamVersion}，应用总数: ${upstreamData.apps.length}`);

  // 2. 读取并合并 custom 目录中的增强规则
  const customFiles = fs.existsSync(customDir)
    ? fs.readdirSync(customDir).filter(f => f.endsWith('.json')).sort()
    : [];

  let mergedCount = 0;
  for (const file of customFiles) {
    const filePath = path.join(customDir, file);
    const customApp = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const appId = customApp.id;

    const existingAppIndex = upstreamData.apps.findIndex(a => a.id === appId);
    if (existingAppIndex !== -1) {
      const existingApp = upstreamData.apps[existingAppIndex];
      // 合并或替换 groups
      for (const customGroup of customApp.groups || []) {
        const groupIndex = existingApp.groups.findIndex(g => g.key === customGroup.key);
        if (groupIndex !== -1) {
          existingApp.groups[groupIndex] = customGroup;
          console.log(`[已覆盖规则组] ${appId} -> group key: ${customGroup.key} (${customGroup.name})`);
        } else {
          existingApp.groups.push(customGroup);
          console.log(`[已新增规则组] ${appId} -> group key: ${customGroup.key} (${customGroup.name})`);
        }
      }
      mergedCount++;
    } else {
      upstreamData.apps.push(customApp);
      console.log(`[已新增应用] ${appId}`);
      mergedCount++;
    }
  }

  // 3. 计算稳定递增的版本号
  const customHash = computeCustomHash();
  let state = { upstreamVersion: 0, patchVersion: 1, lastHash: '' };
  if (fs.existsSync(versionStateFile)) {
    try {
      state = JSON.parse(fs.readFileSync(versionStateFile, 'utf-8'));
    } catch {
      // ignore
    }
  }

  if (state.upstreamVersion !== upstreamVersion) {
    state.upstreamVersion = upstreamVersion;
    state.patchVersion = 1;
    state.lastHash = customHash;
  } else if (state.lastHash !== customHash) {
    state.patchVersion = (state.patchVersion || 0) + 1;
    state.lastHash = customHash;
  }

  // 生成递增整数版本号，例如 v584 -> 58401, patch+1 -> 58402
  const buildVersion = upstreamVersion * 100 + state.patchVersion;
  fs.writeFileSync(versionStateFile, JSON.stringify(state, null, 2), 'utf-8');

  // 4. 重置元数据
  upstreamData.id = 6670;
  upstreamData.name = 'id667+定制增强版 (yuangr)';
  upstreamData.version = buildVersion;
  upstreamData.author = 'yuangr';
  upstreamData.supportUri = 'https://github.com/yuangr/gkd-subscription';
  upstreamData.checkUpdateUrl = './gkd.version.json5';

  // 5. 写入 dist/ 目录
  const json5Content = JSON.stringify(upstreamData, null, 2);
  fs.writeFileSync(path.join(distDir, 'gkd.json5'), json5Content, 'utf-8');

  const versionContent = JSON.stringify({ id: upstreamData.id, version: buildVersion }, null, 2);
  fs.writeFileSync(path.join(distDir, 'gkd.version.json5'), versionContent, 'utf-8');

  console.log(`\n构建成功！`);
  console.log(`- 订阅 ID: ${upstreamData.id}`);
  console.log(`- 当前版本: ${buildVersion} (upstream: v${upstreamVersion}, patch: ${state.patchVersion})`);
  console.log(`- 合并自定义应用: ${mergedCount}`);
  console.log(`- 输出文件: dist/gkd.json5, dist/gkd.version.json5`);
}

main().catch(err => {
  console.error('构建失败:', err);
  process.exit(1);
});
