# Plan 08 — 完整应用状态整合

> 建议分支：`codex/08-app-integration`  
> 前置依赖：Plan 02–07  
> 后续消费者：Plan 10–12

## 目标

把欢迎页、地球、飞行、详情、进度和异常降级连接为完整单页旅程。

## 文件

- 修改：`src/App.tsx`
- 修改：`src/App.test.tsx`
- 创建：`src/components/AppErrorBoundary.tsx`
- 创建：`src/components/AppErrorBoundary.test.tsx`

## 页面状态

`welcome`、`map`、`travelling`、`detail`。`App`只持有所选景点ID和页面状态；相机内部状态留在地球组件；详情真正打开时才记录已浏览。

## 执行步骤

- [ ] 写失败集成测试：欢迎→地图→点位→旅行提示→详情→关闭→地图。
- [ ] 验证进度从0/8变为1/8。
- [ ] 实现四态应用流程和选择事件。
- [ ] 飞行期间禁用其他点位。
- [ ] 3D异常时显示八景点列表且内容仍能打开。
- [ ] 提供“重新加载3D地图”，不整页刷新。

## 验证

```bash
npm run test:run
npm run build
```

## 完成标准

- 正常和降级路径都能访问八处内容。
- 状态切换无竞态、无空白屏。
- 不在 `App.tsx` 中堆积地球或详情内部实现。

