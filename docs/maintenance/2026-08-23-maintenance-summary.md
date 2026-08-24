# 2026-08-23 网站问题修复维护总结

> 日期:2026-08-23
> 项目目录:`/Users/pengjinhao/Documents/AiPlace/暑期红色网站`
> 依据:2026-08-23-网站问题修复方案.md、2026-08-23-网站问题修复实施步骤.md
> 状态:本地验证完成,停在交付门禁;未上传、未部署、未 push

## 1. 背景与目标

本轮维护解决项目方确认的五类问题:

1. 三维地球进入后加载慢;
2. 页面视觉上只有 4~5 颗红星(实际 8 个站点);
3. 红星放大后呈现圆柱体;
4. 正式照片页面只展示 28 张,源文件有 45 张;
5. 开屏缺少"足迹连线"动画衔接。

技术路线:优先优化现有 globe.gl(路线 A),两轮优化后仍未达标再评估替代实现。

## 2. 提交清单(按实施顺序)

| 提交 | 阶段 | 内容 |
| --- | --- | --- |
| `47b3ccf` | Task 0 | 基线记录:测试/构建现状、资源体积、三档性能基线 |
| `974cfc2` | Task 1 | 长三角近景镜头(新 `globeView.ts`) |
| `84d08c9` | Task 2 | 8 颗扁平 SVG 红星 + 移除圆柱 points 层 + 近邻引线(新 `markerLayout.ts`) |
| `d60adcb` | Task 3 | 渐进加载:静态占位、空闲预取、8 秒超时降级(新 `ProgressiveGlobe.tsx`) |
| `4d9ab2a` | Task 4 | 性能预算 + 地图离线简化两轮优化(新 `renderBudget.ts`) |
| `f557a62` | Task 5 | 开屏"足迹连线"动画(新 `WelcomeRoute.tsx`) |
| `35fd440` | Task 6 | 正式照片 28→45 张,媒体对象 60→77 |
| `750813d` | Task 7 | 重新生成 8 站点数据,视频字段逐字段保持不变 |
| `fbf4cb6` | Task 8 | 本地验收:E2E 修复、QA 报告 |
| `66af643` | 追加 | 加载动画设计文档 |
| `82b7e13` | 追加 | 长三角加载动画占位(描边+星点亮起+呼吸光晕) |

## 3. 各任务改动详情

### Task 0 基线记录
- 记录原始状态:25 测试文件 / 185 测试通过,lint 0 错,build 成功。
- 资源体积:主代码块 1,065.93 kB、globe.gl 代码块 1,883.65 kB、`china-globe-map.json` 578,090 字节。
- 三档性能基线(中位数,ms):mobile 16,950 / tablet 31,030 / desktop 35,682(点击→8 星就绪)。
- 记录父仓库 git 异常状态(项目目录无 `.git`,解析到父仓库),不处理、不清理。

### Task 1 长三角近景镜头
- 新增 `src/components/globe/globeView.ts`:`getYangtzeDeltaOverview(width)` 按三档宽度返回 `{lat:32, lng:120}` 近景(altitude 0.65 / 0.78 / 0.9)。
- `GlobeScene` 删除 `getChinaOverview`,统一使用新视角;onGlobeReady 与关闭详情返回共用同一 overview。
- TDD:先写失败测试(找不到模块),再最小实现,全量回归。

### Task 2 8 颗扁平红星 + 移除圆柱体
- 新增 `src/components/globe/markerLayout.ts`:按站点 ID 排序,同城簇(经纬度距离 < 0.15°)分配固定偏移序列(中心/左上/右上/左下/右下,最大 28px),`anchor` 始终保留真实经纬度。
- `GlobeScene` 删除 `pointsData`/`pointLat`/`pointLng`/`pointLabel`/`pointColor`/`pointAltitude`/`pointRadius`/`onPointClick` 整条圆柱点层链式调用;markers 更新只保留 `htmlElementsData` + `ringsData`。
- 字符 `★` 替换为内联 SVG 五角星(主星 2rem、普通星 1.45rem,状态色填充);按钮 44×44 点击区。
- 引线:CSS 自定义属性 `--marker-x/--marker-y` 定位星,`--leader-length/--leader-angle` 绘制从真实锚点指向视觉星的短引线;选中站点归位。
- 测试:禁止 `pointsData` 调用断言、8 个 SVG 星、状态色、引线结构;交互测试从 pointClick 改为点击真实按钮。

### Task 3 渐进式地球加载
- 新增 `GlobeLoadingPlaceholder.tsx`:纯内联 SVG 长三角抽象轮廓 + 状态文字,不导入 globe.gl/Three/地图 JSON。
- 新增 `ProgressiveGlobe.tsx`:状态机 `loading / ready / failed / timed-out`;loading 时同时挂载占位与透明 GlobeScene,ready 后淡入,8 秒未就绪或 onError 降级为八站点列表 + 重试按钮;降级列表点击站点自动进入详情,关闭详情自动返回。
- `App.tsx` 改用 `ProgressiveGlobe`,保留 globeRetryKey、访问进度与详情状态机。
- 欢迎页空闲预取:新增 `globePrefetch.ts`(`prefetchGlobeModule` + `scheduleIdleTask`,requestIdleCallback 不可用时 setTimeout 250ms);预取失败仅 console.warn,不禁用"开启寻访"。

### Task 4 性能两轮优化
- 第一轮(渲染预算):新增 `renderBudget.ts`,只依赖 width 与 devicePixelRatio——移动端(宽 < 600)关闭抗锯齿、pixelRatio 1、关闭 rings 动画;桌面端保留抗锯齿、pixelRatio 上限 1.25、保留 rings。`GlobeScene` 创建实例传 `animateIn: false`。
- 第二轮(地图简化):`china-globe-map.json`(578 KB / 25,240 点)离线 Douglas-Peucker 简化 → `china-globe-map.simplified.json`(185 KB / 7,858 点,-69%);34 省 + 1 南海边界保留,闭合环与最短环(澳门 9 点)保持;`mapSource.json` 更新 runtimeResource 路径与 SHA-256;`npm run check:map` 通过。
- 主代码块 1,065.93 kB → 677.53 kB(-36%)。

### Task 5 开屏"足迹连线"动画
- 新增 `WelcomeRoute.tsx`:内联 SVG,5 个抽象星点 + 1 条主路径(星点不标注站点名,不冒充真实坐标);`aria-label="红色足迹路线动画"`,装饰子元素 `aria-hidden`。
- `WelcomeScreen` 集成:星点依次点亮(180ms 间隔)、路线 stroke-dash 绘制(900ms)、标题汇聚(600ms);点击按钮立即进入;动画完成后 sessionStorage 写入 `red-footprint:welcome-seen:v1`,同会话再进播放缩短版;`prefers-reduced-motion` 下直接静态显示;动画不等待三维地球、不阻塞按钮。

### Task 6 45 张正式照片全量接入
- 磁盘集合差确认遗漏恰好 17 张:渡江 +4、四行仓库 +6、一大会址 +5、梅园 +2。
- `process-media.mjs` 补齐 17 张 sourcePath 与可读 alt(依据 docs/media-selection.md 视觉描述撰写,只描述可见主体/环境/陈列)。
- 期望更新:`EXPECTED_PHOTO_COUNTS` 2/5/9/11/10/1/1/6 = 45;媒体对象 60 → 77(45 photos + 8 hero + 8 poster + 8 video + 8 VTT)。
- 本地处理生成 WebP 与 manifest;`media:dry-run`、`media:process`、`check:media` 通过;未上传 CloudBase。

### Task 7 站点数据生成与视频保护
- `siteSchema` 移除照片数量上限(`max(5)` 三处),superRefine 顺序/数量对账保持。
- 新增三方对账测试:manifest 照片数 = 站点 photos 数 = media 项数 - 1;视频第一项;再次生成视频 url/poster/captions/asset 逐字段不变。
- `generate:sites` 重新生成 `src/data/sites.json`(8 站点,45 照片,pre-upload 状态);`check:content` 通过。
- 上传对账脚本将硬编码 60 改为动态对象数(77),release 测试改为构造合成完整对账验证。

### Task 8 本地验收
- 静态验证:lint 0 错;202 单元测试通过;build 成功。
- 门禁:`check:content`、`check:map`、`check:media` 全部通过;`check:content --release` 按预期阻塞(45 张照片无对账记录,属"本地交付、不上传"边界)。
- E2E 18/18 通过(桌面 Chromium / 移动 Chromium / 移动 WebKit);为适配 ProgressiveGlobe,`GlobeScene` 在 WebGL 不可用/harness 降级时通知 onError,journey.spec 受控适配器挂载时调用 onReady。
- 三档视口验证:8 颗 SVG 星、引线、开屏动画均正确;headless 软渲染下 GSAP 飞行时间线被饿死,交互正确性由单测+E2E 覆盖,需真机复核。

### 追加:长三角加载动画占位
- 设计文档 `docs/superpowers/specs/2026-08-23-globe-loading-animation-design.md`。
- `GlobeLoadingPlaceholder` 升级为动画版:岸线 stroke-dash 描边绘制(900ms)→ 5 颗星点依次弹入(180ms×5)→ 背景呼吸光晕(2.4s 循环)→ 文字 3 个跳动圆点;`data-motion` 由 `useReducedMotion` 控制,reduced 下静态完整显示;颜色只用现有 token。
- 浏览器实测(延迟 globe.gl 4 秒):描边 560→0px、5 星全亮、ready 后无闪烁替换。

## 4. 性能结果(三档,中位数 ms)

| 视口 | 基线 click→ready | 第一轮 | 第二轮 | 总改善 |
| --- | ---: | ---: | ---: | ---: |
| 390×844 | 16,950 | 14,294 | 10,550 | -38% |
| 768×1024 | 31,030 | 21,732 | 15,688 | -49% |
| 1440×900 | 35,682 | 23,037 | 17,861 | -50% |

构建主代码块:1,065.93 kB → 677.53 kB(-36%)。
地图资源:578 KB → 185 KB(-69%)。

## 5. 验证汇总

| 验证 | 结果 |
| --- | --- |
| `npm run test:run` | 31 文件 / 204 测试通过 |
| `npm run lint` | 0 错误 0 警告 |
| `npm run build` | 通过 |
| `npm run check:content` | 通过 |
| `npm run check:map` | 通过(34 省 + 1 南海边界) |
| `npm run check:media` | 通过(45 照片 / 77 对象) |
| `npm run test:e2e` | 18/18 通过 |

## 6. 明确未执行事项

- 未上传 CloudBase 云存储,未修改托管配置,未创建云资源。
- 未部署当前优化版或任何借鉴版本。
- 未修改视频内容、编码、字幕与播放器交互。
- 未删除/移动/覆盖源照片、视频、文档与压缩包。
- 未改变地图合规结论(继续使用 GS(2023)2762号 记录,未声称新审图批准)。
- 未创建 Mapbox token 或其他第三方资源。
- 未替换为 Three.js / Mapbox 实现(路线 B / C 未启动)。

## 7. 待项目方决策

1. **路线决策**:在真实 GPU 设备上复测性能;达标 → `ACCEPT_ROUTE_A`;不达标 → 批准制作路线 B(直接 Three.js 本地对照版)。
2. **媒体上传**:45 张照片与 17 个新对象是否上传 CloudBase(需单独授权)。
3. **部署**:本地版本验收后是否部署、部署到哪个环境(需单独授权)。
4. **照片细节**:新增 17 张照片的 alt 文本是否需要人工复核;梅园"图片1"(含正面人物)的肖像授权确认。
5. **近邻星偏移**:真机确认上海/南京/扬州簇星标偏移量与引线效果,必要时调整。

## 8. 相关文档

- 基线数据:`docs/maintenance/2026-08-23-baseline.md`
- 验收报告:`docs/maintenance/2026-08-23-maintenance-qa.md`
- 加载动画设计:`docs/superpowers/specs/2026-08-23-globe-loading-animation-design.md`
