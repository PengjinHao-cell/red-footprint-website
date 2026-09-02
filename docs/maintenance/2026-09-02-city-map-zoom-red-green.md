# 城市地图缩放与红星点击修复 RED / GREEN 证据

> 记录每个关键用例的失败与通过证据；本文件只据实归档，不事后伪造 RED。

## 提交记录（自基线 `292c797` 起）

| 提交 | 说明 |
| --- | --- |
| `869bae3` | Task 1 复现重叠红星误点契约（组件契约 + 浏览器 RED） |
| `b6d932a` | Task 2 分离星体命中与名称入口，44px 星体命中区 |
| `db3c487` | Task 3 纯函数缩放状态（1—2.5 限制、锚点缩放、复位） |
| `8522b38` | 校正 `getByRole` 名称匹配类型（移除无效 `exact` 选项） |
| `da9a5ef` | Task 4 城市地图缩放控件（放大/缩小/复位、滚轮、双指） |
| `e3da0f0` | Task 5 隔离永久视口缩放与详情过渡（`--motion-scale`） |
| （Task 6） | 浏览器矩阵与发布门禁证据 |

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
- **GREEN**（Task 2 分层标记后）：`CityStarMarker` 拆为锚点容器
  `.city-star`（`pointer-events:none`）与两个真实按钮——`.city-star__hit`
  （`44px × 44px`，aria-label `定位并查看{官方名}`）与 `.city-star__label-button`
  （`min-height:44px`，aria-label `{官方名}`）。星体与名称各自独立 `onClick`，
  名称按钮不再依赖星体冒泡；三个浏览器工程 `three Nanjing labels` 用例 3/3 通过。

## 最终四项命令（2026-09-02）

- `npm run lint` → 退出码 0（`verify:release` 7/9）
- `npm run test:run` → 36 文件 / 216 用例全部通过
- `npm run test:e2e` → 32 通过 / 7 跳过（Desktop Chromium、Pixel Mobile Chromium、iPhone Mobile WebKit）
- `npm run verify:release` → 9/9 门禁全部通过，构建产物不重新引入 `globe.gl` 或 `three`

## 浏览器矩阵与发布门禁证据（Task 6）

- `three Nanjing labels` 用例连续运行 `--repeat-each=10`：3 浏览器 × 10 = 30/30 通过。
- 缩放控件用例（放大、缩小、复位）在三浏览器工程通过；`data-scale` 复位恢复 `1`。
- 红星命中区缩放前后保持约 44px（`≥44px` 且 `≤46px`）。
- 移动端无横向页面溢出（沿用 `mobile map has 44px targets` 用例）。
- `check:map` 新增 `zoom range passed: 1—2.5` 与 `hit targets passed: 44px star hit`
  两道源码护栏，`check-map-resource.test.ts` 断言其输出。
