# 2026-08-24 网站第二轮改进验收记录

## 结论

第二轮改进（省份悬停、红星命中与缩放归位、手机手势防误触、首页重排与连线动画、75% 等待式加载、八地点卡片目录）已在本地全部完成并通过发布门禁、跨浏览器 E2E 与真实浏览器（WebGL）自动化视觉验收。

本记录不代表网站已推送或部署。GitHub subtree 导出、远程 Actions 与 CloudBase 部署继续遵循独立授权门禁；本次未修改正式网站受控代码的线上版本，未重新推送或部署。

## 提交清单

对应基线 `fb18e40`（父仓库 main），截至本文档首次提交前共有 6 个功能/测试提交 + 1 个验收修正提交：

1. `6251f95 fix: align globe marker interaction`
2. `6b4d861 fix: prevent accidental globe marker taps`
3. `75df6b1 feat: restore sequential welcome route`
4. `4bb1926 feat: add staged globe loading progress`
5. `e04da0a feat: add responsive site directory`
6. `068ef20 test: cover refined globe interactions`
7. `e5628e6 fix: center welcome title in the approved visual band`

本文档本身对应后续提交 `e687fc0 docs: record round-2 maintenance acceptance`。

每次提交仅暂存计划列出的 `暑期网站/` 路径，无 `git add .`、无 amend、无 force push；`quiz-app` 与父仓库其他文件未纳入。

## 自动化证据

### 单元与组件测试

- `npm run test:run`：36 个文件、230 个测试全部通过
- `npm run lint`：0 警告 0 错误
- `npm run build`：生产构建通过
- 新增测试覆盖：
  - `markerPresentation.test.ts`：缩放进度、封顶 1.45、偏移归零（4 例）
  - `pointerIntent.test.ts`：10px 轻点阈值、pointerId 校验（2 例）
  - `globeLoadingProgress.test.ts`：0→75 封顶、75→100（2 例）
  - `WelcomeScreen/WelcomeRoute`：印章删除、内容顺序、4 段线 + 5 星锚点、session 短版移除（4 例）
  - `SiteDirectory` / `siteDirectoryOrder`：八卡排序、直达详情、完整名称（5 例）
  - `GlobeScene`：省份 label 移除、tooltip 绑定、zoom 呈现、触摸拖动拒绝（4 例）

### 发布门禁

`npm run verify:release` 八步全部通过：生产内容、媒体清单与权利声明、77 个 CloudBase 对象对账、发布内容、地图资源（GS(2023)2762 参考、34 省级 + 1 海界、8 坐标点、四视口完整性）、lint、单测、构建。

### 跨浏览器 E2E（合成地图适配器）

`npm run test:e2e`：24/24 通过（Desktop Chromium、Pixel Mobile Chromium、iPhone Mobile WebKit × 8 用例）。新增桌面用例验证八张卡片、长名称无截断、卡片直达详情无镜头飞行、键盘 Enter 打开；手机用例验证单列布局与卡片轻点直达。

### 真实浏览器 WebGL 自动化验收（Playwright + SwiftShader，1440×900 与 390×844）

22/22 通过：

- 首页：无“红迹”印章；顺序为 副标题→主标题→导语→连线动画→按钮；主标题中心 45.2%（桌面）/ 45.5%（手机），位于 43%–48% 视觉区间；4 段线 + 5 星按序出现（第 5 星 0ms 隐藏 → 1680ms 后出现）；减少动态效果下静态完整。
- 加载：地图未 ready 前进度条增长且未到 100；ready 后到 100、占位卸载、地图淡入（0→75 等待→100 的精确时序由单测覆盖）。
- 桌面地图：8 颗红星渲染；省份悬停无任何名称提示；红星 hover 提示文本与命中星 `aria-label` 一致、无原生 `title`；放大后红星 `--marker-scale` 封顶 1.45、`--marker-x/y` 归零；继续放大不再变大。
- 卡片：桌面 2 列 × 4 行；长名称（中共一大纪念馆）无截断（scrollWidth − clientWidth = 0）；hover 上移 3px + 阴影增强（砖红边框过渡由 CSS 变量驱动，headless 低帧率下已按 2.5s 等待验证过渡目标）。
- 手机：轻点红星后镜头飞行完成并打开与实际命中星一致的详情；拖动超过 10px 不打开详情；双指（多 pointerId）不触发；卡片单列 8 张。
- 减少动态效果：`prefers-reduced-motion` 下首页路线静态完整。

## 人工复现对照（计划 Task 1 四档问题的自动化替代）

| 原问题 | 修复 | 验证 |
| --- | --- | --- |
| 省份悬停显示省名 | 删除 `polygonLabel` | 真实浏览器悬停无提示 |
| 红星视觉与点击区域分离、错名称 | 位移/缩放移至按钮本体，tooltip 随按钮 | 组件测试 + 真实浏览器 hover 一致性 |
| 红星随放大漂移 | `onZoom` 计算缩放与偏移，精确阈值后归零封顶 | 真实浏览器 wheel 缩放验证 scale 1.45 / offset 0 |
| 手机拖动误触 | pointer 意图判断（10px 阈值 + pointerId） | 组件测试 + 真实浏览器拖动/双指模拟 |
| 首页动画不可见 | 删除印章与短版逻辑、SVG 锚点结构、`data-step` 时序 | 真实浏览器顺序播放 + 刷新仍播放 |
| 加载单调 | 0–75 等待 → ready 后 100 → 交叉淡化 | 单测时序 + 真实浏览器节流验证 |

## 视口与人工验收说明

- 桌面自动化视口：1440×900（含卡片 2×4、hover、缩放）。
- 手机自动化视口：390×844（含单列、轻点、拖动、双指）。
- 真机（iPhone 微信内置浏览器、安卓 Chrome）上的触觉反馈与真实触控仍建议在授权部署前由项目方人工抽验一次；自动化已覆盖全部功能路径。
- 红星 hover 与省份悬停的像素级观感由真实浏览器自动化与组件测试共同承担，未在合成降级 E2E 中伪造结论。

## 已知非阻断项

- Vite 构建提示 globe.gl 分包超过 500 kB（gzip 约 533 kB），为既有现象，不影响本轮功能。
- headless SwiftShader 帧率低导致 CSS 过渡推进缓慢，仅影响自动化等待时长，不影响真实浏览器表现。

## 验收后修正（2026-08-24）

- `c3c59bc fix: keep welcome entry visible on compact desktops`：为宽度至少 48rem、高度不超过 900px 的桌面加入紧凑开屏规则；不影响 390×844 手机布局。
- 新增回归测试直接访问网站根页面，并等待 800ms 开屏动画结束后测量，避免测试壳页面和动画瞬时位移产生误判。
- 稳定页面实测：1280×720、1366×768、1440×900 的主标题中心分别为 43.09%、44.00%、46.02%；路线与入口按钮均在首屏内，入口按钮高度为 48px。390×844 无横向溢出，主标题中心为 44.04%。
