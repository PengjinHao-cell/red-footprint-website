# Plan 04 — 浏览进度

> 建议分支：`codex/04-journey-progress`  
> 前置依赖：Plan 01  
> 可并行：可与 Plan 02、03 同时开发

## 目标

实现当前浏览器会话内的“已点亮 N / 8 处红色坐标”，不引入数据库、不上传个人信息。

## 文件

- 创建：`src/hooks/useJourneyProgress.ts`
- 创建：`src/hooks/useJourneyProgress.test.ts`
- 创建：`src/components/progress/JourneyProgress.tsx`
- 创建：`src/components/progress/JourneyProgress.test.tsx`

## 执行步骤

- [ ] 写失败测试：初始为0、重复访问只计一次、三处显示3/8、损坏存储数据可恢复。
- [ ] 使用 `sessionStorage` 键 `red-footprint:visited:v1`。
- [ ] 导出 `visitedIds`、`markVisited`、`isVisited`、`resetJourney`。
- [ ] 组件同时显示文字和原生 `<progress max={8}>`。
- [ ] 对无法访问存储的环境安全降级到内存状态。

## 验证

```bash
npm run test:run -- src/hooks/useJourneyProgress.test.ts src/components/progress/JourneyProgress.test.tsx
```

## 完成标准

- 计数范围始终是0–8。
- 刷新当前标签页时保留，关闭会话后无需永久保留。
- 不使用 cookie、账号或远程存储。

