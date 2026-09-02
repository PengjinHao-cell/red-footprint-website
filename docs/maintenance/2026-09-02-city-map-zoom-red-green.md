# 城市地图缩放与红星点击修复 RED / GREEN 证据

> 记录每个关键用例的失败与通过证据；本文件只据实归档，不事后伪造 RED。

## 提交记录（自基线 `292c797` 起）

| 提交 | 说明 |
| --- | --- |
| （Task 1） | 复现重叠红星误点契约 |

## 关键 RED → GREEN

### 1. 南京红星重叠误点（真实浏览器 RED）

- **根因**：每颗红星使用 `64px × 64px` 点击区，且 `z-index` 相同。
  在窄视口（Pixel 7 / iPhone 15 / 390×844）下三颗星的按钮中心距离被压缩到
  `32px` 半径以内，后渲染的「中国共产党代表团梅园新村纪念馆」按钮覆盖其余两颗，
  点击「雨花台烈士陵园」或「渡江胜利纪念馆」实际命中梅园新村纪念馆。
- **RED（组件级）**：`CityMap.test.tsx` 新增 `it.each` 三名称→三 `site.id` 契约。
  jsdom 中 `fireEvent.click` 直接命中目标按钮、绕过浏览器命中测试，因此该契约
  初始即通过，作为长期回归契约存在；真实失败只能由真实浏览器复现。
- **RED（浏览器级）**：`journey.spec.ts` 新增
  `three Nanjing labels open their own matching details`，在全部三个浏览器工程运行。
  首次运行 3/3 失败：
  - Desktop Chromium：`expect(getByRole('dialog', { name: '雨花台烈士陵园' })).toBeVisible()`
    失败，`element(s) not found`——点击雨花台后未出现雨花台详情（命中冲突，桌面边界态）。
  - Pixel Mobile Chromium：点击 `雨花台烈士陵园` 超时，
    `中国共产党代表团梅园新村纪念馆` 按钮 `intercepts pointer events`。
  - iPhone Mobile WebKit：点击 `雨花台烈士陵园` 超时，
    `中国共产党代表团梅园新村纪念馆` 按钮 `intercepts pointer events`。
- **期望详情**：点击「雨花台烈士陵园」→ 对话框标题「雨花台烈士陵园」；
  点击「渡江胜利纪念馆」→ 「渡江胜利纪念馆」；点击「中国共产党代表团梅园新村纪念馆」→ 同名。
- **实际详情**：桌面点击雨花台未打开对应对话框；移动端点击雨花台/渡江被梅园按钮拦截。
- **GREEN**：（待 Task 2 分层标记后补记）

## 最终四项命令

（完成全部 Task 后补记）
