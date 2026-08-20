# Plan 01 — 项目脚手架

> 建议分支：`codex/01-project-scaffold`  
> 前置依赖：无  
> 后续消费者：其余全部计划

## 目标

创建可测试、可构建的 React + TypeScript + Vite 静态站基础工程。此阶段只建立工程边界和首页烟雾测试，不实现业务页面。

## 技术栈

React 19、TypeScript、Vite、Vitest、Testing Library、Playwright、ESLint。预先加入后续使用的 Globe.gl、Three.js、GSAP 和 Zod，避免各分支重复调整依赖。

## 文件

- 创建：`package.json`
- 创建：`package-lock.json`
- 创建：`vite.config.ts`
- 创建：`tsconfig.json`
- 创建：`tsconfig.app.json`
- 创建：`index.html`
- 创建：`src/main.tsx`
- 创建：`src/App.tsx`
- 创建：`src/App.test.tsx`
- 创建：`src/test/setup.ts`

## 执行步骤

- [ ] 创建 Vite React TypeScript 工程配置。
- [ ] 在 `package.json` 中提供 `dev`、`build`、`lint`、`test`、`test:run`、`test:e2e`、`check:content`、`check:map` 命令。
- [ ] 先写失败测试：页面应出现一级标题“青春寻访·红色足迹”。
- [ ] 运行 `npm install && npm run test:run -- src/App.test.tsx`，确认测试因标题不存在而失败。
- [ ] 实现最小 `App`，只渲染该一级标题。
- [ ] 运行全部单测与生产构建。
- [ ] 提交本分支。

## 最小实现

```tsx
export default function App() {
  return <h1>青春寻访·红色足迹</h1>;
}
```

## 验证

```bash
npm run lint
npm run test:run
npm run build
```

预期：全部命令退出码为 0，且生成 `dist/index.html`。

## 完成标准

- 新环境执行 `npm ci` 后可以测试和构建。
- 测试环境包含 DOM matcher。
- 不包含景点、地图或媒体占位实现。

