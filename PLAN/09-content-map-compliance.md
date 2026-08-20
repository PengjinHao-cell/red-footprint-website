# Plan 09 — 内容与地图合规门禁

> 建议分支：`codex/09-compliance-gates`  
> 前置依赖：Plan 03、05  
> 可并行：可与 Plan 07 开发，但必须在公开部署前合并

## 目标

建立机器检查与人工复核双门禁，阻止名称、史实、媒体或中国地图不合规的版本公开上线。

## 文件

- 创建：`src/data/mapCompliance.json`
- 创建：`src/lib/mapCompliance.ts`
- 创建：`src/lib/mapCompliance.test.ts`
- 创建：`scripts/check-content.mjs`
- 创建：`scripts/check-map-compliance.mjs`
- 创建：`docs/release-checklist.md`

## 机器门禁

- 恰好八个唯一景点；
- 每个事实模块至少一条权威来源；
- 图片、封面、字幕和本地资源存在；
- 视频与来源使用HTTPS；
- 地图元数据包含来源名称、来源URL、审图号、使用说明、核验日期和核验人；
- 不允许用硬编码成功绕过检查。

## 执行步骤

- [ ] 先写缺少审图号、来源、字幕和第八景点时失败的测试。
- [ ] 实现 `check-content.mjs`。
- [ ] 实现 `check-map-compliance.mjs`。
- [ ] 写人工检查表：完整疆域、行政边界、来源及审图号可见、八坐标准确。
- [ ] 只在权威资料齐全后生成生产 `sites.json` 与地图元数据。

## 验证

```bash
npm run check:content
npm run check:map
npm run test:run -- src/lib/mapCompliance.test.ts
```

## 完成标准

- 任一门禁失败时构建流水线失败。
- 正式地图不使用来源不明数据，也不自行修改疆域边界。
- 发布负责人在人工检查表签字后才允许公开。

