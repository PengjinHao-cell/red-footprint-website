# Plan 02 — B 视觉系统与欢迎页

> 建议分支：`codex/02-visual-shell`  
> 前置依赖：Plan 01  
> 可并行：可与 Plan 03 同时开发

## 目标

实现已批准的 B“青春人文感”视觉令牌、全局可访问性规则和欢迎加载页。页面必须明亮，避免黑色太空背景。

## 视觉约束

- 米白 `#fbf7ee`
- 砂岩 `#e7d4b5`
- 砖红 `#982e2d`
- 深棕 `#54201d`
- 正文墨色 `#3f2925`
- 红色只用于点位、按钮和重点信息

## 文件

- 创建：`src/styles/tokens.css`
- 创建：`src/styles/global.css`
- 创建：`src/components/welcome/WelcomeScreen.tsx`
- 创建：`src/components/welcome/WelcomeScreen.test.tsx`
- 修改：`src/main.tsx`

## 执行步骤

- [ ] 写失败测试：学校副标题可见、未就绪时按钮禁用、加载状态为“正在载入实践足迹”。
- [ ] 运行测试，确认组件不存在导致失败。
- [ ] 创建 CSS 变量与基础排版。
- [ ] 实现 `WelcomeScreen({ ready, onEnter })`。
- [ ] 添加清晰焦点样式与最小 44px 触控目标。
- [ ] 为 `prefers-reduced-motion: reduce` 禁用非必要动画。
- [ ] 在 390×844 与 1366×768 视口人工检查。

## 验证

```bash
npm run test:run -- src/components/welcome/WelcomeScreen.test.tsx
npm run build
```

## 完成标准

- `ready=false` 时不可进入。
- `ready=true` 时点击按钮只调用一次 `onEnter`。
- 欢迎页无多余导航、广告或冗余板块。

