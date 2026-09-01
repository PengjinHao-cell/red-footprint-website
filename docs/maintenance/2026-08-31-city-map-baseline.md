# 2026-08-31 基线记录:两级平面地图重构前

> 日期:2026-09-01(执行日)
> 阶段:维护 Task 0(基线记录),本阶段只新增本文件,不改动业务代码
> 项目目录:`/Users/pengjinhao/Documents/AiPlace/暑期网站`
> Git 顶层:`/Users/pengjinhao/Documents/AiPlace`
> 依据:暑期红色网站维护/2026-08-31-两级平面地图重构详细实施步骤.md

## 1. Git 与工作区状态(Step 1)

| 项目 | 记录 |
| --- | --- |
| 分支 | `main` |
| HEAD | `bb5d3ec06eb24442f69e335f7be1386464006f03` |
| `暑期网站/` 已跟踪文件改动 | 无(M=0、D=0) |
| `暑期网站/` 未跟踪素材 | `.DS_Store`、`.superpowers/`、`PROMPTS/.DS_Store`、`TASK2-TODO-HANDOFF.md`、`Videos/`、`Weixin Image_*.jpg`、`content/.DS_Store`、`docs/.DS_Store`、`docs/compliance/`、`docs/superpowers/.DS_Store`、`node_modules/`、`playwright-report/`、`src/.DS_Store`、`test-results/`、`总体大纲.png`、`暑期实践注意事项.docx`、`红色教育基地经纬度坐标.xlsx`、`网址设想(1).docx` |
| 处理 | 按计划不对未跟踪素材做清理;后续任务仅暂存计划列出的路径 |

## 2. 现有验证结果(Step 2)

| 验证 | 退出码 | 结果 |
| --- | --- | --- |
| `npm run lint` | 0 | eslint 0 错误 0 警告 |
| `npm run test:run` | 1 | **已有失败**:36 个测试文件 2 失败、230 个测试 8 失败(vitest) |
| `npm run build` | 0 | `tsc -b` + `vite build` 成功 |
| `npm run verify:release` | 1 | **已有失败**:第 1/8 步 `check:production-content` 失败即停 |

### 2.1 已有失败定位(不归因于本轮改动)

失败测试:

- `scripts/check-content.test.ts`(3 个):`content production gate > chains Task 3...`、`passes a clean export when CI explicitly selects release mode`、`passes explicit release mode in a fully reconciled project export`
- `scripts/generate-sites.test.ts`(5 个):`deterministically generates the eight reviewed sites...`、`emits a video-first sequence...`、`preserves reviewed facts...`、`reconciles manifest, site, and media items...`、`uses reconciled production URLs...`

根因(已定位):内容时效校验过期。`scripts/check-production-content.mjs` 断言以下字段未过期,而今天是 2026-09-01:

- `content/sources/cpc-first-congress.json` `sources[0].temporal`、`sources[1].temporal` 于 2026-08-31 过期
- `content/reviews/cpc-first-congress.json` `temporalReview.validThrough` 为 2026-08-31(checkedAt 2026-08-22)

结论:这是既有的内容数据维护问题(中共一大会址来源/审核时效到期),与 Task 0—3 的文件范围无关;按「不修改方案未列出的文件」约束,本轮不修复,在最终报告中上报。Task 1—3 的定向回归测试均限定在 `src/components/map`、`src/App.test.tsx` 与新增脚本,不受该失败影响。

### 2.2 构建产物(生产构建)

| 资源 | 体积 | gzip |
| --- | --- | --- |
| `dist/index.html` | 0.41 kB | 0.31 kB |
| `dist/assets/index-*.css` | 17.88 kB | 4.28 kB |
| `dist/assets/index-*.js`(主代码块) | 704.92 kB | 206.67 kB |
| `dist/assets/globe.gl-*.js`(地球代码块,动态导入) | 1,883.65 kB | 532.59 kB |

## 3. 备份证据核对(Step 3)

| 项目 | 记录 |
| --- | --- |
| 备份目录 | `/Users/pengjinhao/Documents/AiPlace/暑期红色网站维护/代码备份-2026-08-31-城市地图重构前` |
| `find ... -type f \| wc -l` | 182 |
| 期望 | 182(181 个 Git 快照文件 + 1 个备份说明) |
| 备份说明 | 备份日期 2026-08-31,对应 `main` @ `bb5d3ec06eb24442f69e335f7be1386464006f03`,受控文件数 181 |
| 结论 | 与期望一致,备份证据完好 |
