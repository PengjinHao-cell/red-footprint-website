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
| `ee3f0f4` | Task 6 浏览器矩阵与发布门禁证据 |
| `fed462a` | 红星本体最近命中解析（验收驳回后修复） |
| （本提交） | 红星 E2E 改真实触屏点击 + 消除 ref 抖动导致的桌面转场偶发 |

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

### 2. 红星本体仍被重叠命中区拦截（验收驳回后的 RED）

- **驳回事实**：Task 2 把星体命中区从 `64px` 缩到 `44px`，但 390×844 下南京三颗星
  中心距离仅约 `15—27px`，`44px` 命中区仍严重重叠；点击「雨花台」或「渡江胜利纪念馆」
  红星本体仍被梅园新村纪念馆红星拦截，只有梅园可正常点击。此前的 E2E 只逐一点击
  名称、未逐一点击红星，因此 30/30 未覆盖原始问题。
- **RED（真实浏览器）**：`journey.spec.ts` 新增
  `three Nanjing stars open their own details on mobile`，在 Pixel / iPhone 逐个
  点击三颗红星命中按钮并断言对话框标题。修复前 2 失败（移动端）：
  点「渡江胜利纪念馆」红星未打开对应详情。
- **修复**：保持红星坐标与视觉大小不变，新增纯函数
  `nearestSiteId(candidates, x, y, maxDistance)`（`nearestSite.ts`）。
  `CityMap` 用画布容器的 `querySelectorAll('.city-star[data-site-id]')` 取当前屏幕锚点，
  `handleStarSelect` 用 `getBoundingClientRect()` 以 `24px` 半径选「离点击位置最近的红星」；
  键盘（`clientX/clientY` 为 0）或锚点缺失时回退到按钮自身 `site.id`。
  `CityStarMarker` 的星体按钮改为经 `onSelectStar(clientX, clientY, site.id)` 走解析，
  名称按钮仍直接 `onSelect(site.id)`。
- **真实触屏验收**：`three Nanjing stars` 用例不再用 `force`（会绕过真实遮挡），改为
  取每颗红星中心坐标后用 `page.touchscreen.tap(x, y)` 真实触屏点击；移动端 2 工程
  `--repeat-each=10` = 20/20 通过。单测新增 `nearestSite`（4 用例）、
  `CityStarMarker` 坐标透传、`CityMap` 最近锚点路由。
- **附带修复**：首次实现用每标记 `registerAnchor` ref 回调（每次渲染身份变化 → ref
  抖动），导致桌面 `desktop completes` 转场偶发卡在 `travelling-site`（`--repeat-each=10`
  出现 3/10 失败）。改为 `querySelectorAll` 一次性查询后，该用例 10/10 通过。

## 最终四项命令（2026-09-02）

- `npm run lint` → 退出码 0（`verify:release` 7/9）
- `npm run test:run` → 37 文件 / 222 用例全部通过
- `npm run test:e2e` → 34 通过 / 8 跳过（Desktop Chromium、Pixel Mobile Chromium、iPhone Mobile WebKit）
- `npm run verify:release` → 9/9 门禁全部通过，构建产物不重新引入 `globe.gl` 或 `three`

## 浏览器矩阵与发布门禁证据（Task 6）

- `three Nanjing labels` 用例连续运行 `--repeat-each=10`：3 浏览器 × 10 = 30/30 通过。
- `three Nanjing stars` 用例连续运行 `--repeat-each=10`：2 移动工程 × 10 = 20/20 通过。
- 缩放控件用例（放大、缩小、复位）在三浏览器工程通过；`data-scale` 复位恢复 `1`。
- 红星命中区缩放前后保持约 44px（`≥44px` 且 `≤46px`）。
- 移动端无横向页面溢出（沿用 `mobile map has 44px targets` 用例）。
- `check:map` 新增 `zoom range passed: 1—2.5` 与 `hit targets passed: 44px star hit`
  两道源码护栏，`check-map-resource.test.ts` 断言其输出。
