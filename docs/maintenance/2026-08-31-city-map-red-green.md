# 两级平面地图重构 RED / GREEN 证据

> 记录每个关键用例的失败与通过证据；本文件只据实归档，不事后伪造 RED。

## 提交记录（自基线 `bb5d3ec` 起）

| 提交 | 说明 |
| --- | --- |
| `04fa36a` | Task 0 固化基线与备份证据 |
| `2194387` | Task 1 状态机复现并修复卡片关闭 Bug |
| `d44223d` | Task 2 归档 4 张城市底图与审图号 |
| `f7a4236` | Task 3 城市分组与经纬投影 |
| `a5d820a` | Task 4 全国平面地图与 4 个柔光城市色斑 |
| `e46f16e` | Task 5 城市底图与不漂移跳动红星 |
| `7f8efd0` | Task 6 可取消的进城/靠近/返程动画 |
| `8324016` | Task 7 两级地图完整接入 App |
| `5504d21` | Task 8 全国城市按钮跨浏览器可点（WebKit 修复） |
| `3efa531` | Task 8 两级地图端到端路径 |
| `b25a8dc` | Task 9 移除旧 3D 地球与 globe.gl/three |
| `32ec810` | 中共一大时效信息复核（内容保持原样，数据截止 2026-08-31） |
| `e824e4c` | Task 10 两级地图门禁与发布验证 |

## 关键 RED → GREEN

### 1. WebKit 城市按钮点击被 `<svg>` 拦截（真实浏览器 RED）
- RED：三浏览器矩阵在 iPhone WebKit 上失败，`journey.spec.ts` 两条用例
  （`mobile map has 44px targets`、`reduced motion enters detail`）点击
  `进入南京市` 超时；错误为 `<svg role="img"> intercepts pointer events`。
- 根因：全国层城市按钮放在 SVG `<foreignObject>` 内，WebKit 无法命中测试，
  指针事件落到 SVG 根节点。
- GREEN：改为 HTML 覆盖层按钮（与 `CityMap`/`CityStarMarker` 同模式），
  命中区保持 64 单位、随地图等比缩放。修复后三浏览器矩阵 25 通过 / 5 跳过。

### 2. 城市色斑点击区重叠（真实浏览器 RED）
- RED：四个城市的 112px 命中区彼此重叠，上海色斑挡住南京。
- GREEN：命中区收敛为 64 单位并锚定到标签位置，`pointer-events: none`
  施加于省份图层，柔光色斑保持视觉大小。

### 3. 中共一大内容复核到期（门禁 RED，非代码缺陷）
- RED：`npm run test:run` 在 2026-09-01 出现 8 个失败
  （`check-content` 3 个 + `generate-sites` 5 个），根因是
  `cpc-first-congress` 的 `temporal`/`temporalReview.validThrough` 为 `2026-08-31`。
- 核实：官网与政府来源的常规开放时间（周二至周日 9:00—17:00、周一闭馆、
  暑期 7/20—8/31 延时）无新变化。
- GREEN：内容事实保持原样，`temporal` 复核更新为 2026-09-01 复核、
  2026-09-30 前有效，重新生成 `sites.json`。数据截止声明为 2026-08-31。

## 最终四项命令（2026-09-01）

- `npm run lint` → 退出码 0
- `npm run test:run` → 34 文件 / 200 用例全部通过
- `npm run test:e2e` → 25 通过 / 5 跳过（三浏览器矩阵）
- `npm run verify:release` → 9/9 门禁全部通过
