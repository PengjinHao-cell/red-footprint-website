# Plan 11 — CI与静态部署

> 建议分支：`codex/11-ci-deployment`  
> 前置依赖：Plan 08、09  
> 可并行：可与 Plan 10 同时开发

## 目标

连接 GitHub 自动检查与 CloudBase/EdgeOne Pages 静态发布，不创建服务器、数据库或后台。

## 文件

- 创建：`.github/workflows/ci.yml`
- 创建：`cloudbaserc.json`
- 创建：`edgeone.json`
- 修改：`README.md`

## CI顺序

`npm ci → lint → unit tests → content gate → map gate → build → Playwright`

## 执行步骤

- [ ] 为 PR 和 `main` 推送创建CI。
- [ ] 任一内容或地图门禁失败时禁止部署。
- [ ] 部署目录设为 `dist`，SPA回退到 `/index.html`。
- [ ] 哈希静态资源使用长期缓存；`index.html` 和 `sites.json` 使用短缓存。
- [ ] 生产强制HTTPS。
- [ ] README记录GitHub自动构建、COS视频上传、自定义域名/ICP备案和回滚步骤。
- [ ] 明确开发预览可以用Railway，正式站优先CloudBase或EdgeOne Pages。

## 验证

```bash
npm run lint
npm run test:run
npm run check:content
npm run check:map
npm run build
npm run test:e2e
```

## 完成标准

- 本地与CI使用同一组门禁命令。
- 前端发布与视频存储解耦但仍属于同一站点体验。
- 未备案域名不得指向中国大陆正式生产节点。

