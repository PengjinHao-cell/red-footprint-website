# Plan 10 — 手机与桌面端到端测试

> 建议分支：`codex/10-e2e-tests`  
> 前置依赖：Plan 08  
> 可并行：可与 Plan 11 同时开发

## 目标

用 Playwright 覆盖电脑答辩、安卓手机和 iPhone 主要旅程，以及3D和媒体失败的降级路径。

## 文件

- 创建：`playwright.config.ts`
- 创建：`tests/e2e/journey.spec.ts`
- 创建：`tests/e2e/fallback.spec.ts`

## 浏览器项目

- Desktop Chromium
- Pixel级移动 Chromium
- iPhone级移动 WebKit

## 执行步骤

- [ ] 配置固定端口的生产预览服务器。
- [ ] 测试欢迎页进入地图。
- [ ] 点击雨花台点位，验证详情和1/8进度。
- [ ] 关闭详情，验证回到地图且进度保留。
- [ ] 阻断地球资源，验证八景点列表出现。
- [ ] 验证详情打开前不请求完整视频，点击播放后才请求。
- [ ] 验证键盘 Escape 和手机触控关闭详情。

## 验证

```bash
npx playwright install chromium webkit
npm run test:e2e
```

## 完成标准

- 三个浏览器项目全部通过。
- 测试不依赖外部不稳定媒体；使用受控测试路由。
- 失败时保留截图、trace和HTML报告。

