# Plan 06 — 可取消镜头飞行动画

> 建议分支：`codex/06-camera-flight`  
> 前置依赖：Plan 05  
> 可并行：可与 Plan 07 在接口确定后并行

## 目标

实现点位点击后的拉远、旋转、拉近、打开详情与返回总览流程，防止连续点击造成镜头状态错乱。

## 文件

- 创建：`src/components/globe/cameraFlight.ts`
- 创建：`src/components/globe/cameraFlight.test.ts`
- 创建：`src/hooks/useReducedMotion.ts`
- 创建：`src/hooks/useReducedMotion.test.ts`

## 状态模型

`idle → departing → arriving → open → returning → idle`

## 执行步骤

- [ ] 用伪相机适配器与假定时器写失败测试。
- [ ] 验证飞行中第二次点击被忽略。
- [ ] 导出 `flyTo(site)`、`returnToOverview()`、`cancel()`、`getState()`。
- [ ] 使用 GSAP 时间线，正常总时长控制在1.8–2.5秒。
- [ ] 组件卸载和路线切换时必须取消时间线。
- [ ] 减少动态效果模式改用短淡入淡出，不进行空间飞行。

## 验证

```bash
npm run test:run -- src/components/globe/cameraFlight.test.ts src/hooks/useReducedMotion.test.ts
```

## 完成标准

- 无重复回调、无悬挂动画、无卸载后状态更新。
- 键盘用户和减少动态效果用户可以完成相同内容流程。

