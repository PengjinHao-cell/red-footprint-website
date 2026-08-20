# Plan 05 — 合规地球外壳与列表降级

> 建议分支：`codex/05-globe-fallback`  
> 前置依赖：Plan 01、03  
> 后续消费者：Plan 06、08、09

## 目标

用 Globe.gl/Three.js 创建暖色3D地球、八个点位和无 WebGL 时仍可浏览的列表。此计划不自行编制中国疆域数据。

## 文件

- 创建：`src/components/globe/GlobeScene.tsx`
- 创建：`src/components/globe/GlobeScene.test.tsx`
- 创建：`src/components/globe/SiteListFallback.tsx`
- 创建：`src/components/globe/SiteListFallback.test.tsx`
- 创建：`src/hooks/useWebGLSupport.ts`
- 创建：`src/hooks/useWebGLSupport.test.ts`

## 组件接口

`GlobeScene` 接收 `sites`、`visitedIds`、`selectedId`、`onSelect`、`onReady`、`onError`。列表降级接收 `sites` 与 `onSelect`，渲染八个可键盘操作的景点按钮。

## 执行步骤

- [ ] 先写 WebGL 支持/不支持与八按钮降级测试。
- [ ] 实现 WebGL2→WebGL检测，捕获上下文创建异常。
- [ ] 先完成 `SiteListFallback`，再接 Globe.gl。
- [ ] 地球采用明亮米白环境、暖色材质、砖红点位，限制设备像素比。
- [ ] 已浏览点位使用稳态暗红，未浏览点位使用克制脉冲。
- [ ] 未提供地图来源和审图号时，生产边界层拒绝初始化并进入列表模式。

## 验证

```bash
npm run test:run -- src/components/globe src/hooks/useWebGLSupport.test.ts
npm run build
```

## 完成标准

- 不支持 WebGL 仍能浏览八景点。
- 不使用来源不明的 GeoJSON、纹理或边界。
- 所有点位具备正式名称的可访问标签。

