# 取色器 · EyeDropper Picker

一个基于 **Manifest V3** 的浏览器取色插件。点击工具栏图标弹出小窗，按下「开始取色」后鼠标变成十字准星，单击屏幕上任意位置即可拾取颜色，自动得到 **HEX** 与 **RGB** 色值，并复制到剪贴板。

- 纯本地运行，不联网、不上传、不做任何存储
- 唯一申请权限：`activeTab`
- 支持 `ESC` 取消取色
- 对不支持 EyeDropper API 的浏览器给出明确提示

## 功能

| 功能 | 说明 |
| --- | --- |
| 系统级取色 | 调用浏览器原生 `EyeDropper` API，可吸取页面、图片、视频乃至其他窗口的颜色 |
| 色值转换 | 取色后将 `sRGBHex` 转为 HEX 与 `rgb(r, g, b)` 两种格式展示 |
| 自动复制 | 取色成功后写入剪贴板，并提示「已复制」；被拦截时可点按钮手动复制 |
| 取消取色 | 取色过程中按 `ESC` 退出，回到未取色状态 |
| 兼容提示 | 检测 `window.EyeDropper`，不支持时禁用按钮并提示升级浏览器 |

## 目录结构

```
eyedropper-picker/
├── manifest.json           # MV3 配置：action 弹窗、activeTab 权限、图标
├── popup.html              # 弹窗界面结构
├── popup.css               # 深色主题样式
├── popup.js                # 取色 / 格式转换 / 剪贴板 / 异常处理
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── index.html              # 插件介绍页（部署到 GitHub Pages）
├── eyedropper-picker.zip   # 插件安装包（官网下载按钮指向此文件）
└── README.md
```

## 安装（开发者模式）

1. 下载并解压本项目，得到 `eyedropper-picker` 文件夹；
2. Chrome 地址栏打开 `chrome://extensions`；
3. 打开右上角「开发者模式」；
4. 点击「加载已解压的扩展程序」，选择包含 `manifest.json` 的那一层文件夹；
5. 工具栏出现橙色水滴图标，点击即可使用。

## 使用

1. 点击工具栏图标，弹出插件小窗；
2. 点击「开始取色」，会打开一个 420 × 560 的独立取色窗口；
3. 在取色窗口中点击「开始取色」，鼠标变为十字准星；
4. 单击屏幕上任意位置，立即显示颜色块、HEX、RGB，并自动复制到剪贴板；
5. 取色过程中按 `ESC` 可取消。

## 技术说明：为什么取色要放在独立窗口里

`EyeDropper` 启动时会接管焦点并进入全屏取色状态，浏览器的工具栏弹窗（action popup）会因此被系统关闭，取色结果无法回传给已关闭的弹窗。

因此插件做了如下处理：

- 在工具栏弹窗里点「开始取色」时，通过 `chrome.windows.create()` 打开一个 `type: "popup"` 的独立窗口；
- 独立窗口加载同一个 `popup.html`（带 `?mode=window` 参数），在窗口内调用 `EyeDropper`；
- 独立窗口不会因失焦而关闭，取色完成后可以正常展示色值、写入剪贴板，并支持连续取色。

## 权限与隐私

| 项 | 说明 |
| --- | --- |
| `activeTab` | 仅在用户点击插件时临时授予，用于标识当前标签页；插件本身不读取页面内容 |
| 网络请求 | 无。`manifest.json` 未声明 `host_permissions`，也未申请任何网络权限 |
| 数据存储 | 无。不使用 `localStorage`、`chrome.storage`、Cookie，取色结果只存在于内存 |
| 剪贴板 | 仅在用户主动取色后写入一次色值，且由用户操作触发 |

## 部署介绍页（GitHub Pages）

```bash
# 1. 在项目根目录初始化仓库
git init
git add .
git commit -m "feat: 完成取色插件与介绍页"

# 2. 关联远程仓库（换成你自己的地址）
git remote add origin https://github.com/<你的用户名>/eyedropper-picker.git
git branch -M main
git push -u origin main
```

推送后在 GitHub 仓库依次进入 **Settings → Pages**：

- Source 选择 `Deploy from a branch`
- Branch 选择 `main`，目录选择 `/ (root)`
- 保存后等待约 1 分钟，访问 `https://<你的用户名>.github.io/eyedropper-picker/`

介绍页与下载按钮（指向仓库根目录的 `eyedropper-picker.zip`）会一起生效。

## 版本

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| 1.0.0 | 2026-10-27 | 首个版本：取色、HEX/RGB 转换、自动复制、ESC 取消、兼容提示 |
