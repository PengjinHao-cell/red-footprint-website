# 红色足迹 09B：精简生产化实施计划

> 逐 Task 在当前 `main` 执行；禁止使用子代理。每个 Task 独立本地提交，不 amend、不 push。

**目标：** 用官方平面标准地图校准三维地球，完成八馆生产内容和媒体，并通过 CloudBase 静态托管交付纯静态网站。

**架构：** React/Vite + Globe.gl 保留现有三维旅程；运行时只读取构建内 `sites.json` 和 CloudBase HTTPS 静态媒体；不用数据库、云函数、云托管容器或运行时 CloudBase SDK。

**地图决定：** 不再设置审图/签字门禁。`check:map` 改为来源、资源、点位和人工视觉完整性检查，并允许 CI/部署通过。不得声称三维衍生地图已获得新的审图批准。

---

## 通用规则

- 原始 `Videos/`、图片、DOC/DOCX、XLSX、ZIP/JPG/PDF 地图材料只读保留。
- 先写失败测试并记录 RED，再最小实现 GREEN。
- 不使用测试 fixture 生成生产数据。
- 上传、权限修改、GitHub 绑定、部署分别需要用户明确授权。
- 云端写入前必须列明目标环境、对象/动作、数量、大小和影响。
- 每个 Task 结束运行其定向验证、`npm run lint`、`npm run test:run`、`npm run build` 和 `git diff --check`。

## Task 1：CloudBase MCP 只读环境盘点（已完成）

提交：

- `d3b99a7ba7fa433c730d2696728fe74d2454f8d4`
- 修复：`911e1f75357ec67ec19c5a7b680020d133ceabaa`

结果：环境 `red-footprint-preview-d5322636bd` 位于 `ap-shanghai`；静态托管和云存储存在；盘点保持只读，未执行云写。未能安全读取的 GitHub/权限字段保持 `null` 和 `unknowns`。

---

## Task 2：由官方平面地图生成三维球面地图

**文件：**

- Create: `src/data/china-globe-map.json`
- Create: `src/data/mapSource.json`
- Create: `scripts/check-map-resource.mjs`
- Create: `scripts/check-map-resource.test.ts`
- Modify: `src/data/mapCompliance.json`
- Modify: `src/lib/mapCompliance.ts`
- Modify: `src/lib/mapCompliance.test.ts`
- Modify: `src/components/globe/GlobeScene.tsx`
- Modify: `src/components/globe/GlobeScene.test.tsx`
- Modify: `package.json`
- Modify: `docs/release-checklist.md`

**步骤：**

1. 先新增失败测试，要求运行时地图资源存在、来源为 `GS(2023)2762号` 原图、摘要匹配、几何结构有效，且恰好八个点位。
2. 新增失败测试，证明旧 `blocked` 审批逻辑会阻止三维地图初始化和 `check:map` 通过。
3. 从现有可靠边界数据整理球面可用的 GeoJSON/TopoJSON；官方 JPG 只作为人工校准基准，不直接把标题、图例和空白包裹到球面。
4. `mapSource.json` 保存原图路径、来源、审图号、原图 SHA-256、运行资源路径和摘要，并明确 `derivedThreeDimensionalResource: true`、`newReviewClaimed: false`。
5. 将 `check:map` 改为项目内部技术检查：来源、摘要、几何、坐标和人工视觉清单；删除新审图号、签字、`publicUseAllowed` 等阻断要求。
6. `GlobeScene` 使用新球面资源，保留八红心、飞行、降级列表、reduced-motion 和现有明亮视觉。
7. 在 390×844、768×1024、1366×768、1920×1080 对照官方原图检查大陆、国界、行政边界、主要岛屿和八个红心，记录截图与结论。

**验证：**

```bash
npm run test:run -- scripts/check-map-resource.test.ts src/lib/mapCompliance.test.ts src/components/globe/GlobeScene.test.tsx
npm run check:map
npm run lint
npm run test:run
npm run build
npm run test:e2e
git diff --check
```

全部应退出 0。提交信息：`feat: build 3d globe from standard map reference`

---

## Task 3：八馆权威来源与正式正文

**文件：**

- Create: `content/sources/<site-id>.json`（八份）
- Create: `content/sites/<site-id>.json`（八份）
- Create: `content/reviews/<site-id>.json`（八份）
- Create: `scripts/check-production-content.mjs`
- Create: `scripts/check-production-content.test.ts`
- Modify: `package.json`

**步骤：**

1. 读取八馆本地 DOC/DOCX 作为线索，检索场馆官网、政府、文旅和权威纪念机构页面。
2. 每项事实记录来源标题、发布机构、精确 HTTPS URL、访问日期和支持字段。
3. 完成正式名称、地址、开放时间、预约方式、参观提示、历史、人物、年代和展品含义。
4. 编写历史印记、人物故事、精神传承和寻访感悟；团队感悟不得引入无来源事实。
5. 一大会址保持 markerAddress 兴业路76号、address 黄陂南路374号。
6. 实现离线校验，拒绝八馆不齐、缺来源映射、占位 URL、未审核事实和过期时效字段。

**验证：**

```bash
npm run test:run -- scripts/check-production-content.test.ts
npm run check:production-content
npm run lint
npm run test:run
npm run build
git diff --check
```

提交信息：`content: add verified copy for eight red sites`

---

## Task 4：一次性整理生产媒体

**文件：**

- Create: `content/media/media-manifest.json`
- Create: `content/media/media-rights-declaration.json`
- Create: `content/media/captions/*.vtt`（八份）
- Create: `scripts/process-media.mjs`
- Create: `scripts/process-media.test.ts`
- Create: `scripts/check-media.mjs`
- Create: `scripts/check-media.test.ts`
- Modify: `.gitignore`
- Modify: `package.json`

**步骤：**

1. 固定已确认的 28 张照片顺序、8 Hero、8 video、8 poster 和 8 VTT；不重新视觉预选。
2. 记录项目方已确认的媒体与肖像许可；三个 AI 水印封面如实披露但不阻断。
3. 生成 Web 优化图片副本；保留原比例、EXIF 方向和可读 alt，不覆盖原图。
4. 使用 ffmpeg 生成 H.264/AAC、faststart 的视频副本，禁止拉伸；对扬州等大文件按画面质量实际控制体积。
5. 根据实际语音和画面文字制作八份 UTF-8 WebVTT，并人工校对人名、地名、年代和时间轴。
6. manifest 保存版本化对象路径、MIME、尺寸、大小、SHA-256 和对应地点。
7. staging 写入 Git 忽略目录；Git 只提交脚本、清单、字幕和审核记录。

**验证：**

```bash
npm run test:run -- scripts/process-media.test.ts scripts/check-media.test.ts
npm run media:dry-run
npm run media:process
npm run check:media
npm run lint
npm run test:run
npm run build
git diff --check
```

提交信息：`content: prepare production media manifest`

---

## Task 5：生产 Schema、sites.json 与应用接入

**文件：**

- Modify: `src/data/siteSchema.ts`
- Modify: `src/data/loadSites.test.ts`
- Create: `scripts/generate-sites.mjs`
- Create: `scripts/generate-sites.test.ts`
- Create: `src/data/sites.json`
- Modify: `scripts/check-content.mjs`
- Modify: `scripts/check-content.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/App.test.tsx`
- Modify: `package.json`

**步骤：**

1. 先测试生产字段、八馆唯一性、GCJ-02、来源、审核和媒体结构。
2. 扩展 schema，但不放宽既有八馆、HTTPS、1–5 照片和视频首项规则。
3. 从 Task 3/4 审核输入确定性生成 `sites.json`；连续两次生成字节一致。
4. 生产入口加载真实 `sites.json`，不导入测试 fixture。
5. `check:content` 串联内容、媒体和生成一致性；`check:map` 使用 Task 2 技术检查。
6. 用本地静态媒体 URL 完成应用旅程测试；CloudBase URL 在 Task 6 对账后再由生成器切换。

**验证：**

```bash
npm run test:run -- scripts/generate-sites.test.ts scripts/check-content.test.ts src/data/loadSites.test.ts src/App.test.tsx
npm run generate:sites
npm run check:content
npm run check:map
npm run lint
npm run test:run
npm run build
npm run test:e2e
git diff --check
```

全部应退出 0。提交信息：`feat: connect verified production site data`

---

## Task 6：经授权上传 CloudBase 媒体并对账

**授权门：** 没有用户对本次上传的明确授权就停止。提示词或旧授权不构成本次授权。

**文件：**

- Create: `content/cloudbase/object-release-manifest.json`
- Create: `content/cloudbase/upload-reconciliation.json`
- Create: `scripts/check-upload-reconciliation.mjs`
- Create: `scripts/check-upload-reconciliation.test.ts`
- Modify: `src/data/sites.json`（必须通过生成器更新）
- Modify: `package.json`

**步骤：**

1. 上传前报告对象数、总大小、目标环境和 `media/sites/*/v1/` 前缀并请求授权。
2. 获权后只新增版本对象，不覆盖、不删除、不修改权限。
3. 上传后只读列举对象，与本地 manifest 核对路径、大小、MIME 和可验证摘要。
4. 记录真实 HTTPS/CDN URL；生成器据此重建 `sites.json`。
5. 浏览器逐馆检查图片、视频 Range 请求、字幕和移动端播放。

**验证：**

```bash
npm run test:run -- scripts/check-upload-reconciliation.test.ts
npm run check:upload-reconciliation
npm run generate:sites
npm run check:content
npm run check:map
npm run lint
npm run test:run
npm run build
npm run test:e2e
git diff --check
```

提交信息：`content: reconcile CloudBase production media`

---

## Task 7：GitHub 构建、CloudBase 部署与最终验收

**授权门：** GitHub 绑定和首次部署必须分别获得用户明确授权。

**文件：**

- Create/Modify: `.github/workflows/ci.yml`
- Create: `scripts/verify-release.mjs`
- Create: `scripts/verify-release.test.ts`
- Create/Modify: `docs/cloudbase/github-build.md`
- Modify: `docs/release-checklist.md`
- Create: `docs/qa-report.md`
- Modify: `package.json`

**步骤：**

1. `verify:release` 顺序执行 `check:content`、`check:map`、lint、unit、build 和 E2E，传递任一非零退出码。
2. CI 在 PR/main push 使用只读权限、锁定 Node、`npm ci` 和 `npm run verify:release`；不在 GitHub 保存不需要的云密钥。
3. 获 GitHub 绑定授权后连接 `main`，安装 `npm ci`，构建 `npm run verify:release`，输出 `dist`。
4. 获首次部署授权后部署到固定环境；记录提交 SHA、构建结果、HTTPS URL 和回滚入口。
5. 在 390×844、768×1024、1366×768、1920×1080 及桌面 Chromium、移动 Chromium、移动 WebKit 完成八馆全旅程验收。
6. 检查三维地球、八红心、飞行、内容、28 图顺序、视频、字幕、弱网、错误恢复、键盘焦点、reduced-motion 和无水平溢出。

**验证：**

```bash
npm run verify:release
git diff --check
```

全部通过且人工 QA 无阻断项。提交信息：`chore: enable CloudBase static release`

## 09B 完成定义

- Task 1–7 均有独立本地提交和验收证据；
- 三维地图来自官方平面图视觉校准且技术检查通过；
- 八馆生产内容、媒体和真实 CloudBase URL 完整；
- 所有自动验证通过；
- 远程动作均有对应授权和对账记录；
- 未创建数据库、函数、容器，未覆盖原素材，未 push。
