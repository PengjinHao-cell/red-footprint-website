# CloudBase GitHub 构建与部署配置

> 状态：本地配置已完成；GitHub 仓库绑定已取得授权但尚未执行。CloudBase 首次部署未授权、不得执行。

## 固定目标

| 配置项 | 拟绑定值 |
| --- | --- |
| CloudBase 环境 | `red-footprint-preview-d5322636bd` |
| GitHub 仓库 | `PengjinHao-cell/red-footprint-website` |
| 分支 | `main` |
| 仓库内项目目录 | `/`（从父仓库仅提取 `暑期网站` 的独立历史） |
| Node.js | `24.x`；GitHub CI 精确锁定 `24.19.0` |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run verify:release` |
| 输出目录 | `dist` |
| 部署路径 | `/` |
| 环境变量/密钥 | 无 |

CloudBase 官方静态托管文档确认 Git 仓库部署支持安装命令、构建命令、Node.js 版本和输出目录，且当前可选 Node.js 最高为 24.x：<https://cloud.tencent.com/document/product/876/46900>。Node.js 官方当前 v24 LTS 为 24.19.0：<https://nodejs.org/download/release/latest-v24.x/>。

## 权限边界

GitHub 绑定只申请 CloudBase 导入指定仓库和读取 `main` 源码所必需的最小仓库访问权限。不授予代码写入、Actions secrets 管理、packages 写入或仓库管理权限。如 GitHub 安装页要求更广权限，立即停止并单独报告，不自行接受。

GitHub Actions 工作流在仓库中声明 `contents: read`，只安装锁定依赖、安装 E2E 浏览器并运行本地门禁；不部署、不上传产物、不使用 CloudBase API Key 或临时凭证。

## 授权门

1. 用户已确认精确仓库 `PengjinHao-cell/red-footprint-website`；绑定仍需按授权范围执行。
2. 绑定后只核对仓库、`main`、项目目录、Node 24.x、安装/构建命令、`dist` 和 `/`；不启动部署。
3. 再单独申请 CloudBase 首次部署授权。GitHub 绑定授权不包含部署授权。
4. 部署成功和 QA 通过也不构成最终公开发布授权。

## 部署记录与回滚

首次部署前必须记录 CloudBase 现有托管状态和可恢复的上一个成功版本（如有）。部署后在 `docs/qa-report.md` 记录：

- Task 7 提交 SHA；
- CloudBase 应用版本/部署记录 ID 与构建状态；
- 实际 HTTPS 地址；
- 部署时间和操作人；
- 部署前版本 ID（如有）。

回滚使用已记录的上一个成功版本；如控制台不提供直接恢复入口，则从上一个已知良好提交重建同一 `dist` 并重新部署到 `/`。任何回滚部署都是新的云写入，必须重新取得明确授权；不通过删除托管文件或改权限回滚。
