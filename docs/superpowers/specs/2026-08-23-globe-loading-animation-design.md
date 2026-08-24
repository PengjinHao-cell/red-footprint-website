# 长三角加载动画占位设计

> 日期:2026-08-23
> 状态:已与项目方确认,批准实施
> 项目目录:`/Users/pengjinhao/Documents/AiPlace/暑期红色网站`
> 关联文档:2026-08-23-网站问题修复方案.md、2026-08-23-网站问题修复实施步骤.md

## 1. 目标

把现有静态 `GlobeLoadingPlaceholder`(长三角轮廓 + 一行文字)升级为动画版加载界面:等待三维地球 ready 期间,在地图区域内播放与欢迎页"足迹连线"同视觉语言的描边与星点亮起动画。色调沿用全局暖纸色/砖红/沙色,不改变渐进加载状态机、超时降级与重试逻辑。

## 2. 交互与视觉(已确认)

- **位置**:地图区域内动画占位(点击"开启寻访"后进入地图页,ready 前显示),非全屏独立页,非欢迎页内等待。
- **动画内容**(用户确认):轮廓描边绘制 + 5 颗星点依次点亮。
- **色调**:只使用现有 token(`--paper`、`--sand`、`--brick`、`--brick-dark`、`--ink`),不新增色值。

## 3. 动画明细

| 元素 | 动画 | 时长/节奏 |
| --- | --- | --- |
| 长三角两条岸线(实线 + 虚线) | `stroke-dashoffset` 从右向左绘出 | 约 900ms,单一方向 |
| 5 颗抽象星点(沿轮廓放置,不标注站点名) | `scale 0.6→1` + `opacity 0→1` 依次弹入 | 每颗 180ms,依次延迟 0/180/360/540/720ms |
| 背景光晕 | 沙色径向渐变 `opacity` 呼吸 | 2.4s 循环,不抢注意力 |
| 状态文字 | "正在载入长三角红色足迹" + 尾部 3 个跳动圆点 | 圆点与现有 `loading-pulse` 同风格 |
| 收束 | 所有动画 `forwards` 停在完整状态,等 ready 淡入替换 | 与 ProgressiveGlobe `opacity 300ms` 过渡衔接 |

## 4. 约束

- 只用 CSS transform / opacity / stroke-dashoffset;不引入 GSAP 或新依赖。
- `prefers-reduced-motion: reduce` 下不播放描边/星点/呼吸,直接显示完整静态轮廓 + 文字。
- 星点仅装饰,`aria-hidden`,不冒充真实站点经纬度。
- 不修改 `ProgressiveGlobe` 状态机、8 秒超时、降级列表、重试逻辑。
- 不修改 `WelcomeScreen`、欢迎页动画、tokens.css。

## 5. 文件改动

| 文件 | 改动 |
| --- | --- |
| `src/components/globe/GlobeLoadingPlaceholder.tsx` | SVG 岸线加描边动画 class;5 颗星点加弹入动画 class 与延迟;背景加光晕层;容器加 `data-motion` 属性 |
| `src/styles/global.css` | 新增 `.globe-placeholder__*` 动画与 keyframes(描边、星点、呼吸、文字圆点);reduced-motion 覆盖 |
| `src/components/globe/GlobeLoadingPlaceholder.test.tsx` | 保留现有断言;新增:容器 `data-motion="full"`;模拟 matchMedia 后 `data-motion="reduced"` 且静态;5 颗装饰星存在且 `aria-hidden` |

## 6. 测试与验收

- 单元测试:全部通过(含新增动画结构断言)。
- `npm run lint`、`npm run build` 通过。
- E2E 18/18 保持通过(动画不影响渐进状态机)。
- 三档视口(390/768/1440):动画可重复播放、ready 后无闪烁替换、reduced-motion 下静态。
- 无新增依赖、无新色值、无控制台错误。
