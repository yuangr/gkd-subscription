# GKD 个人订阅规则 (667 同步 + 定制增强版)

本仓库为个人专属的 **[GKD](https://gkd.li/)** 自动化订阅源。
每天定时同步 upstream [Lin-arm/GKD_subscription (id: 667)](https://github.com/Lin-arm/GKD_subscription) 的最新上游规则，并自动与本地定制的高级补丁（如京东开屏广告坐标穿透等）深度合并。换机、刷 ROM 后直接导入本订阅链接即可长期生效。

---

## 🚀 订阅地址

在手机 GKD 应用中，点击右下角 **+** 导入以下任一订阅地址：

### 1. jsDelivr CDN 源（国内免代理推荐，直连极速）
```txt
https://cdn.jsdelivr.net/gh/yuangr/gkd-subscription@main/dist/gkd.json5
```

### 2. GitHub Raw 源（实时同步）
```txt
https://raw.githubusercontent.com/yuangr/gkd-subscription/main/dist/gkd.json5
```

### 3. GitHub 镜像加速源（国内备用）
```txt
https://ghfast.top/https://raw.githubusercontent.com/yuangr/gkd-subscription/main/dist/gkd.json5
```

---

## 🛠️ 当前已定制的规则列表

| 应用包名 | 应用名称 | 定制规则组 | 定制改进说明 |
| :--- | :--- | :--- | :--- |
| `com.jingdong.app.mall` | 京东 | `key: 0` (开屏广告) | 解决原 667 规则跳过失败问题：<br>1. 注入 `action: "clickCenter"` 物理坐标点击，穿透 `clickable: false` 节点。<br>2. 移除 `< 300` 像素高度限制，完美适配 1.5K / 2K 高分辨率屏。<br>3. 多重父容器与描述文本选择器，0 秒秒跳过开屏倒计时广告。 |

---

## 💡 如何添加新的应用定制规则？

如果后续发现其他应用的开屏广告或弹窗失效，无需修改复杂代码：

1. 在 `custom/` 目录下新建 `<应用包名>.json`（例如 `custom/com.taobao.taobao.json`）。
2. 参考 `custom/com.jingdong.app.mall.json` 的格式填入优化规则。
3. `git commit` 并 `git push` 到 `main` 分支。
4. GitHub Actions 会自动触发构建、合并并发布新的规则版本，手机端下拉订阅即可自动更新。

---

## ⏰ 自动同步机制

* **定时构建**：每天北京时间 **04:00 (UTC 20:00)** 自动运行（在 667 每日 03:00 发布更新后执行）。
* **手动触发**：支持在 GitHub 仓库 Actions 界面点击 `Run workflow` 一键手动同步构建。
