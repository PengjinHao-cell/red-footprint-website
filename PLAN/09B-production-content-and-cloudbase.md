# 红色足迹 09B：生产内容与 CloudBase 静态交付实施计划

> **For implementers:** REQUIRED SUB-SKILL: 使用 `superpowers:executing-plans` 按 Task 顺序执行；禁止使用子代理、多代理、委派或并行代理。每个 Task 通过人工审核节点后才能独立提交。

**目标：** 把八馆候选内容和既定媒体选择变成可审计的生产输入，在 `red-footprint-preview-d5322636bd` 建立只使用静态托管与云存储的交付契约，同时让地图门禁继续失败关闭并阻止公开发布。

**架构：** Git 中保存逐事实来源、正式正文、审核记录、媒体清单、对象清单、生产 schema、生成器、门禁和 GitHub 检查；大体积处理结果只进入被忽略的本地暂存区，再经单独授权上传到 CloudBase 云存储。浏览器只读取 Vite 构建产物、构建时固化的 `src/data/sites.json` 和经只读对账确认的 HTTPS 静态媒体；不引入数据库、云函数、云托管容器、认证或运行时 API。

**技术栈：** React 19、TypeScript 6、Vite 8、Zod 4、Vitest 4、Node.js ESM、FFmpeg/ffprobe、WebVTT、GitHub Actions、CloudBase MCP（只读盘点；写操作逐项授权）。

---

## 0. 执行基线与不可变边界

- 设计依据：`docs/superpowers/specs/2026-08-21-production-content-and-cloudbase-design.md`。
- 计划编写基线：`main`，`841faed0c66079d421d0071a44f519263c91c38b`。
- CloudBase 环境只能是 `red-footprint-preview-d5322636bd`；发现任何其他环境 ID 立即停止。
- 网站保持纯静态。禁止新增数据库、云函数、云托管容器、认证、用户上传入口、服务端接口或浏览器端 CloudBase SDK。
- `Videos/`、DOC/DOCX、XLSX 只作只读原始交付和证据；不得修改原件，不得把大体积生产媒体提交到 Git。
- 28 张照片的数量和顺序固定为 `docs/media-selection.md` 已确认结果；允许做格式、尺寸和压缩处理，但不得重新选择或重排。
- 项目方已确认照片、视频、视频内音乐和字幕的公开展示使用权，以及照片中可辨识人物的展示许可。实施只归档声明和素材覆盖关系，不重新把许可设为阻断项；景点归属、人物身份、展品含义和史实仍须逐事实核验。
- 渡江含“77周年”横幅的 Hero 长期使用；梅园牌匾近景可作临时 Hero 且不阻断发布；雨花台、江上青、扬州的 AI 水印封面可原样使用并必须透明披露；不新增全站背景音乐。
- 一大会址 `coordinates` 对应兴业路 76 号红心，`markerAddress` 为 `上海市黄浦区兴业路76号`，页面 `address` 为 `上海市黄浦区黄陂南路374号`；两者不得合并或互换。
- `src/data/mapCompliance.json` 继续为 `status: "blocked"`、`publicUseAllowed: false`。不得伪造审图号、改写机器结果、绕过 `npm run check:map` 或公开部署。
- 已从自然资源部标准地图服务系统所用的官方对象存储取得“中国地图 1∶1000万 对开（界线版、有邻国、无河流、线划二）”原始 JPG 包；图面真实标注 `GS(2023)2762号` 和“自然资源部 监制”。原始 ZIP 与解包 JPG 的 SHA-256 分别为 `f281b2375530d39620763885240ea463736f3cfdcf0d3b1fddf10bab7484b6b8`、`6f759d9b14920c8dab4e59674c666a1093d478c41dc75e83f1c8cd7df44def02`。这只证明平面标准地图来源已取得；网站的三维球面纹理/边界资源仍涉及重投影、缩放或裁切，必须另行取得覆盖最终公开形态的审核材料，因此不得据此解除地图阻断。
- 任何 CloudBase 写操作都先停顿并取得用户对该动作的单独授权。上传授权不包含创建资源、修改权限、删除对象、GitHub 绑定或部署；各类动作不得互相推定授权。
- 全程不执行 `git commit --amend` 和 `git push`。失败修复使用新提交；已提交回滚使用 `git revert <提交SHA>`。

## 1. 目标文件结构

```text
content/
  cloudbase/
    environment-inventory.json
    object-release-manifest.json
    upload-reconciliation.json
  media/
    captions/<site-id>-captions.vtt                 # 恰好 8 份
    caption-reviews.json
    image-manifest.json
    media-rights-declaration.json
    video-processing.json
  reviews/<site-id>.json                            # 恰好 8 份
  sites/<site-id>.json                              # 恰好 8 份正式正文输入
  sources/<site-id>.json                            # 恰好 8 份逐事实台账
scripts/
  check-cloudbase-inventory.mjs
  check-cloudbase-inventory.test.ts
  check-production-content.mjs
  check-production-content.test.ts
  check-image-manifest.mjs
  check-image-manifest.test.ts
  process-videos.mjs
  process-videos.test.ts
  check-vtt.mjs
  check-vtt.test.ts
  check-object-release-manifest.mjs
  check-object-release-manifest.test.ts
  check-upload-reconciliation.mjs
  check-upload-reconciliation.test.ts
  generate-sites.mjs
  generate-sites.test.ts
  verify-release.mjs
  verify-release.test.ts
src/data/
  siteSchema.ts
  sites.json
.github/workflows/
  ci.yml
docs/cloudbase/
  github-build.md
```

本地大媒体输出固定写入 `media-staging/`，并由项目级 `.gitignore` 排除。发布清单只追踪其相对路径、字节数、MIME、SHA-256、对象路径和审核记录；不追踪二进制本身。

## 2. 阶段依赖与地图阻断矩阵

```text
Task 1 ───────────────┐
Task 2 → Task 3 → Task 4
Task 5 → Task 6 → Task 7 → Task 8
Task 1 + Task 8 + 上传授权 → Task 9
Task 3 + Task 4 + Task 9 → Task 10 → Task 11 → Task 12 → Task 13
```

| 范围 | 地图 `blocked` 时能否完成 | 额外停顿门 |
| --- | --- | --- |
| Task 1–8 | 可以本地完成；Task 1 仅调用 CloudBase MCP 只读能力 | Task 6 开始实际转码前需音视频负责人确认剪辑/画幅方案 |
| Task 9 | 可以在地图阻断时执行，因为只发布带版本的静态媒体对象，不部署网站 | 必须先取得“向固定环境上传本清单对象”的单独授权；无授权只做演练和清单检查 |
| Task 10–11 | 可以在媒体只读对账后本地完成；内容门禁可通过，地图门禁仍必须失败 | Task 10 需八馆内容审核已签署，且不得自行填造 URL 或审核状态 |
| Task 12 本地配置 | 可以完成并提交；`npm run verify:release` 因地图阻断应非零 | 远程 GitHub 绑定、启用自动构建、部署均不得执行 |
| Task 12 远程绑定及任何部署 | 不可以 | 必须先取得覆盖三维球面最终公开形态的地图审核材料、地图负责人签署、`npm run check:map` 通过，再分别取得 GitHub 绑定授权和部署授权 |
| Task 13 阻断确认 | 可以完成，验收结果就是“平面标准地图来源已核验、三维改绘审核未完成、公开发布仍被阻断” | `GS(2023)2762号` 只登记为原始平面图审图号，不得硬编码为球面纹理审核结论；解除阻断另立任务 |

## 3. 通用验证口径

每个 Task 的“全量验证”都运行当时可用的完整本地套件。Task 1–10 的预期状态是 lint、单测、构建通过，而生产内容门禁和地图门禁至少一个仍失败；Task 11 以后内容门禁通过，地图门禁仍以非零退出。任何命令结果与该阶段预期不一致都停止提交。

所有 JSON 使用 UTF-8、两空格缩进和结尾换行。所有日期来自实际审核/盘点当日，所有审核人来自真实确认记录，所有 HTTPS URL 来自来源页或 CloudBase 只读结果。测试 fixture 可以是明确标注的合成数据，但不得被生成器读取为生产输入。

---

### Task 1：CloudBase MCP 只读环境盘点

**目标：** 对 `red-footprint-preview-d5322636bd` 的地域、静态托管、云存储、默认/CDN 域名、容量、GitHub 连接和当前权限做只读快照；无法读取的字段显式记为 `null` 并列入 `unknowns`，绝不猜值。

**前置条件：** 当前 HEAD 与计划基线一致或已明确记录后续提交；实现会话能发现 CloudBase MCP。若 MCP 未暴露，只允许写入 `status: "blocked"`、`mcpAvailable: false` 和实际错误摘要，所有依赖云端能力的步骤停止。

**精确文件范围：**

- Create: `content/cloudbase/environment-inventory.json`
- Create: `scripts/check-cloudbase-inventory.mjs`
- Create: `scripts/check-cloudbase-inventory.test.ts`
- Modify: `package.json`（增加 `check:cloudbase-inventory`）

**TDD RED 步骤：**

1. 新建测试，断言环境 ID 不匹配、`writeOperationsPerformed: true`、盘点状态既非 `complete` 也非 `blocked` 时失败：

```ts
it('rejects a different environment or any write operation', () => {
  const record = {
    status: 'complete',
    environmentId: 'red-footprint-preview-d5322636bd',
    observedAt: '2026-08-21T09:00:00+08:00',
    mcpAvailable: true,
    accessMode: 'read-only',
    writeOperationsPerformed: false,
    hosting: { exists: false, instanceId: null, defaultDomain: null },
    storage: { exists: false, bucketId: null, cdnDomains: [] },
    github: { linked: false, repository: null, branch: null },
    unknowns: [],
  };
  expect(validateCloudBaseInventory({ ...record, environmentId: 'another-environment' })).toContain(
    'environmentId must equal red-footprint-preview-d5322636bd',
  );
  expect(validateCloudBaseInventory({ ...record, writeOperationsPerformed: true })).toContain(
    'writeOperationsPerformed must be false',
  );
});
```

2. 运行 `npm run test:run -- scripts/check-cloudbase-inventory.test.ts`；预期因模块尚不存在而失败。

**最小 GREEN 实现：**

1. 实现并导出 `validateCloudBaseInventory(input)`；只接受固定环境、`accessMode: "read-only"`、无写操作，校验 ISO 时间、三类盘点对象和 `unknowns`。
2. 命令默认读取 `content/cloudbase/environment-inventory.json`，成功打印 `[cloudbase-inventory] passed`，失败逐字段打印并退出 1。
3. 在 MCP 工具发现结果中只选择语义和 schema 明确为 list/get/describe/query 的调用。每次调用都显式传固定环境 ID；如果调用 schema 没有环境限定参数或工具可能产生写入，立即停止，不调用。
4. 把真实只读结果写入清单，并固定 `writeOperationsPerformed: false`。盘点内容至少覆盖地域、套餐/配额、静态托管实例、输出域名、云存储桶、公开/CDN 域名、对象数量/容量、GitHub 是否绑定、可见权限和未能读取的字段。
5. 不创建托管实例或存储桶，不修改权限，不上传测试对象，不连接 GitHub，不部署。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-cloudbase-inventory.test.ts
npm run check:cloudbase-inventory
```

预期：测试通过；真实清单若为 `complete` 则命令通过，若 MCP 不可用则命令以明确的 `status: blocked` 非零退出，且后续云端 Task 不得开始。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:map
```

预期：前三项通过；`check:map` 退出 1 并报告 `status: blocked`。

**人工审核节点：** CloudBase 负责人逐项确认环境 ID、盘点时间、只读工具名称、地域、实例/桶/域名/容量/GitHub 状态以及 `writeOperationsPerformed: false`。盘点为 blocked 时，负责人只确认阻断记录，不授权任何替代资源创建。

**独立提交信息：** `docs: inventory CloudBase environment read only`

**失败回滚方式：** 未提交时只撤销上述四个文件；已提交时 `git revert <Task 1 提交SHA>`。盘点没有云端写入，因此不存在云资源回滚；若观察到任何意外写入，立即停止并单独报告，不自行删除或修改以“恢复”。

---

### Task 2：建立八馆逐事实来源台账

**目标：** 为八馆每个生产字段建立可追溯的来源—事实映射，记录冲突、时效和核验结论，不把候选 DOC/DOCX 的来源名称直接当作已验证事实。

**前置条件：** Task 1 已记录；本 Task 可在 CloudBase 盘点 blocked 和地图 blocked 时继续。可使用场馆官网、政府官网、现场展板或正式文献；搜索摘要、自媒体和聚合旅游页不得作为唯一权威来源。

**精确文件范围：**

- Create: `content/sources/huaibei-resistance-memorial.json`
- Create: `content/sources/yuhuatai-martyrs-cemetery.json`
- Create: `content/sources/dujiang-victory-memorial.json`
- Create: `content/sources/sihang-warehouse-memorial.json`
- Create: `content/sources/cpc-first-congress-memorial.json`
- Create: `content/sources/jiang-shangqing-memorial.json`
- Create: `content/sources/yangzhou-martyrs-cemetery.json`
- Create: `content/sources/meiyuan-xincun-memorial.json`
- Create: `scripts/check-production-content.mjs`
- Create: `scripts/check-production-content.test.ts`
- Modify: `package.json`（增加 `check:production-content`）

**TDD RED 步骤：**

1. 在测试临时目录创建合成台账，逐项删除 `url`、`accessedAt`、`supports`、`evidenceRef`、`verifiedBy` 或 `conclusion`，断言校验失败；增加“一个首页 URL 支持全部字段”的用例并断言失败。
2. 增加一大双地址用例：`coordinates`/`markerAddress` 的来源必须支持兴业路 76 号，页面 `address` 的来源必须支持黄陂南路 374 号；缺任一映射必须失败。
3. 增加八馆覆盖用例，要求以下字段路径逐馆被至少一个明确来源支持：`officialName`、`shortName`、`province`、`city`、`district`、`address`、`markerAddress`、`coordinates`、`coordinateSystem`、`opening`、`reservation`、`visitNotice`、`officialTitle`、`history`、`people`、`spirit`、`mediaFacts`。
4. 运行 `npm run test:run -- scripts/check-production-content.test.ts`；预期失败，因为校验器尚未实现。

**最小 GREEN 实现：**

1. 每个来源条目实现以下字段契约；所有字符串都必须来自实际来源和审核记录：

```ts
type SourceRecord = {
  sourceId: string;
  sourceType: 'official-web' | 'government-web' | 'onsite' | 'publication';
  title: string;
  publisher: string;
  url: `https://${string}`;
  accessedAt: `${number}-${number}-${number}`;
  supports: string[];
  evidenceRef: string;
  verifiedBy: string;
  conclusion: 'supported' | 'conflict' | 'stale' | 'insufficient';
};
```
2. `conclusion` 只允许 `supported`、`conflict`、`stale`、`insufficient`。存在后三类结论的字段保持阻断，不得由脚本自动变为通过。
3. 强制 HTTPS 精确页、真实访问日期、字段级 `supports`、证据位置和核验人；同一主页不得无差别支持所有模块。
4. 坐标固定记录为项目方 GCJ-02 输入，但地址与坐标一致性仍需权威来源交叉复核。一大条目必须保留红心/参观地址双口径。
5. 逐馆运行台账校验，解决来源冲突；无法解决的字段保留冲突结论并让命令失败。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-production-content.test.ts
npm run check:production-content -- --stage sources
```

预期：测试通过；只有八份台账所有必需字段都有权威、精确、可追溯支持时 stage 命令通过。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；生产 `sites.json` 尚未生成，因此 `check:content` 仍失败；`check:map` 仍以 blocked 失败。

**人工审核节点：** 内容负责人逐馆、逐字段核对来源页面、机构、访问日期、证据位置和支持范围；特别签署淮北详细地址、扬州地址冲突、一大双地址，以及开放/预约信息的时效结论。

**独立提交信息：** `content: add audited source ledgers for eight sites`

**失败回滚方式：** 来源冲突时不删除证据，改为 `conflict` 并停止提交；误提交使用 `git revert <Task 2 提交SHA>`。不得用删去冲突事实或放宽校验换取绿色结果。

---

### Task 3：完成八馆正式正文与审核记录

**目标：** 从已通过的逐事实台账生成八馆正式正文输入，并由真实内容审核人逐馆确认；事实陈述与团队感悟分开，感悟不得引入未经来源支持的新史实。

**前置条件：** Task 2 的 `--stage sources` 通过；八馆来源冲突已处理。内容负责人已明确确认可以生成正式正文。

**精确文件范围：**

- Create: `content/sites/huaibei-resistance-memorial.json`
- Create: `content/sites/yuhuatai-martyrs-cemetery.json`
- Create: `content/sites/dujiang-victory-memorial.json`
- Create: `content/sites/sihang-warehouse-memorial.json`
- Create: `content/sites/cpc-first-congress-memorial.json`
- Create: `content/sites/jiang-shangqing-memorial.json`
- Create: `content/sites/yangzhou-martyrs-cemetery.json`
- Create: `content/sites/meiyuan-xincun-memorial.json`
- Create: `content/reviews/huaibei-resistance-memorial.json`
- Create: `content/reviews/yuhuatai-martyrs-cemetery.json`
- Create: `content/reviews/dujiang-victory-memorial.json`
- Create: `content/reviews/sihang-warehouse-memorial.json`
- Create: `content/reviews/cpc-first-congress-memorial.json`
- Create: `content/reviews/jiang-shangqing-memorial.json`
- Create: `content/reviews/yangzhou-martyrs-cemetery.json`
- Create: `content/reviews/meiyuan-xincun-memorial.json`
- Modify: `scripts/check-production-content.mjs`
- Modify: `scripts/check-production-content.test.ts`

**TDD RED 步骤：**

1. 增加测试：正文中的每个 `factIds` 必须能在同馆来源台账解析为 `supported`；正文出现未绑定句段、审核记录缺签署人/日期/证据引用、审核状态不是 `verified` 时失败。
2. 增加测试：`reflection` 必须标记 `contentType: "team-reflection"`，其 `factIds` 只能引用正文已核验事实，不允许新事实 ID。
3. 增加一大测试，精确断言 `markerAddress === "上海市黄浦区兴业路76号"`、`address === "上海市黄浦区黄陂南路374号"`、`coordinates === { "lng": 121.475407, "lat": 31.220104 }`、`coordinateSystem === "GCJ-02"`。
4. 运行 `npm run test:run -- scripts/check-production-content.test.ts`；预期新用例失败。

**最小 GREEN 实现：**

1. 每馆正文包含正式名称、简称、省市区、两类地址、坐标、开放/预约/参观提示、官方称号、历史、人物、精神、感悟和对应 `factIds`。
2. 候选 DOC/DOCX 只作为拆分原子事实和团队观点的输入；最终措辞重新撰写并绑定台账，不复制无法核验的句子。
3. 每馆审核文件由真实确认生成并实现以下字段契约；不得把计划文字当作审核值：

```ts
type ContentReviewRecord = {
  siteId: string;
  status: 'verified';
  reviewedAt: `${number}-${number}-${number}`;
  reviewedBy: string;
  evidenceRef: string;
  sourceLedgerSha256: string;
  contentSha256: string;
};
```
4. 开放、预约和参观提示记录 `freshnessCheckedAt`，并要求在公开发布前再次复核。
5. 更新校验器的 `--stage content`，同时验证正文、来源、摘要和八份审核记录。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-production-content.test.ts
npm run check:production-content -- --stage content
```

预期：八馆正文和审核记录全部对应时通过。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；生产 JSON 尚未生成，内容门禁失败；地图门禁继续 blocked。

**人工审核节点：** 内容负责人逐馆阅读全文并签署，确认来源支持、事实/观点分离、开放信息时效、一大双地址、淮北与扬州地址结论。八馆未全部签署不得进入 Task 10。

**独立提交信息：** `content: add reviewed production copy for eight sites`

**失败回滚方式：** 审核拒绝时保留来源台账，撤回相应正文和审核文件或把该馆留在未提交工作区；已提交使用 `git revert <Task 3 提交SHA>`。不得只改 `status` 字符串或摘要来伪造签署。

---

### Task 4：扩展生产 schema

**目标：** 让运行时 Zod schema 明确验证 GCJ-02、双地址、完整来源元数据、内容审核、媒体许可声明、水印披露和媒体清单引用，同时保持测试 fixture 与生产数据隔离。

**前置条件：** Task 3 字段契约已稳定；当前 UI 使用的字段已盘点。地图仍为 blocked 不影响 schema 开发。

**精确文件范围：**

- Modify: `src/data/siteSchema.ts`
- Modify: `src/data/loadSites.test.ts`
- Modify: `src/test/fixtures/sites.ts`

**TDD RED 步骤：**

1. 在 `src/data/loadSites.test.ts` 增加缺少 `coordinateSystem`、`markerAddress`、来源访问日期/支持路径、内容审核、媒体许可引用、媒体清单引用时拒绝的测试。
2. 增加水印测试：`aiWatermarkPresent: true` 且接受方、日期和 `aiWatermarkAccepted: true` 完整时接受；披露缺失时拒绝。
3. 增加一大双地址固定值测试和 `coordinateSystem !== "GCJ-02"` 拒绝测试。
4. 运行 `npm run test:run -- src/data/loadSites.test.ts`；预期新用例失败。

**最小 GREEN 实现：**

在 `siteSchema.ts` 定义并复用以下 schema，不把生产审核结果写死在代码中：

```ts
const reviewSchema = z.object({
  status: z.literal('verified'),
  reviewedAt: z.iso.date(),
  reviewedBy: z.string().min(2),
  evidenceRef: z.string().min(2),
});

const sourceSchema = z.object({
  sourceId: z.string().min(2),
  sourceType: z.enum(['official-web', 'government-web', 'onsite', 'publication']),
  title: z.string().min(2),
  publisher: z.string().min(2),
  url: z.url().refine((value) => value.startsWith('https://')),
  accessedAt: z.iso.date(),
  supports: z.array(z.string().min(2)).min(1),
  evidenceRef: z.string().min(2),
});

const posterDisclosureSchema = z.object({
  aiWatermarkPresent: z.boolean(),
  aiWatermarkAccepted: z.boolean(),
  acceptedBy: z.string().min(2),
  acceptedAt: z.iso.date(),
}).superRefine((value, context) => {
  if (value.aiWatermarkPresent && !value.aiWatermarkAccepted) {
    context.addIssue({ code: 'custom', message: 'disclosed AI watermark requires acceptance' });
  }
});
```

并给地点模型增加 `coordinateSystem: z.literal('GCJ-02')`、`markerAddress`、`contentReview`、`mediaRightsRef`、`mediaManifestRef`、完整 `sources` 和 `posterDisclosure`。测试 fixture 明确保留合成标识，生产生成器永不导入该文件。

**定向验证命令：**

```bash
npm run test:run -- src/data/loadSites.test.ts
npm run test:run -- src/components/detail/SiteDetailPanel.test.tsx src/components/globe/GlobeScene.test.tsx
```

预期：schema 新增用例和现有 UI 消费测试通过。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：lint、单测、构建通过；生产内容和地图门禁仍失败关闭。

**人工审核节点：** 开发负责人核对 schema 与 Task 2/3 文件名和字段完全一致；内容负责人确认“媒体许可已归档”与“史实审核通过”是两个独立字段；项目方确认三馆水印披露不会被 schema 错误拒绝。

**独立提交信息：** `feat: extend production site schema and review metadata`

**失败回滚方式：** 修正测试 fixture 与 schema 的同一提交后再提交；若已提交，`git revert <Task 4 提交SHA>`。不得放宽必填来源、审核或一大双地址约束来恢复旧测试。

---

### Task 5：锁定 28 张照片、Hero 和 8 个封面清单

**目标：** 以固定顺序生成 28 张照片、8 个 Hero、8 个封面的不可变加工清单和媒体许可声明覆盖表；原图只读，网页副本写入 `media-staging/images/`。

**前置条件：** `docs/media-selection.md` 的 28 张照片及顺序作为确定输入；Task 2 已能支持 alt 中的景点归属、人物/展品含义。缺少淮北和梅园独立封面时，必须先由负责人选定真实素材；不得编造文件。

**精确文件范围：**

- Create: `.gitignore`（排除 `media-staging/`）
- Create: `content/media/image-manifest.json`
- Create: `content/media/media-rights-declaration.json`
- Create: `scripts/check-image-manifest.mjs`
- Create: `scripts/check-image-manifest.test.ts`
- Modify: `package.json`（增加 `check:images`）
- Read only: `docs/media-selection.md`, `Videos/**`
- Generated, ignored: `media-staging/images/media/sites/<site-id>/v1/{hero,photos,poster}/**`

**TDD RED 步骤：**

1. 建立合成清单测试，分别改变任一地点照片数量/顺序、总数 28、对象英文路径、版本 `v1`、SHA-256、MIME、Hero/封面数量，断言失败。
2. 增加决定保真测试：渡江 Hero 的 `decision` 必须是 `approved-long-term-77th-anniversary`；梅园 Hero 必须是 `approved-temporary-plaque-closeup` 且 `blocksRelease: false`；雨花台、江上青、扬州封面必须披露并接受 AI 水印。
3. 增加许可覆盖测试，断言一份项目方声明覆盖所有 44 个图片对象和照片人物展示许可，且声明与事实审核分离。
4. 运行 `npm run test:run -- scripts/check-image-manifest.test.ts`；预期失败。

**最小 GREEN 实现：**

1. `image-manifest.json` 恰好包含 28 个 `photo`、8 个 `hero`、8 个 `poster`。每项记录 `siteId`、`role`、`order`、`sourcePath`、`sourceSha256`、`outputPath`、`objectPath`、`mimeType`、`bytes`、`sha256`、`alt`、`factIds` 和审核引用。
2. 输出对象路径只允许：

```text
media/sites/<site-id>/v1/hero/<site-id>-hero.webp
media/sites/<site-id>/v1/photos/<site-id>-photo-01.webp
media/sites/<site-id>/v1/poster/<site-id>-video-poster.webp
```

3. 图片处理只做 EXIF 方向归一、等比缩放、裁切焦点和 WebP 编码；不拉伸、不覆盖原件。生成后重算字节数和 SHA-256。
4. `media-rights-declaration.json` 归档项目方已确认的照片/视频/视频内音乐/字幕使用权和照片人物展示许可、确认日期、确认记录位置与覆盖素材 ID；不得把该声明解释为史实审核。
5. 保持固定照片顺序；渡江和梅园 Hero 决定、三馆水印封面决定按设计原样记录。不新增全站背景音乐字段或资源。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-image-manifest.test.ts
npm run check:images
git check-ignore media-staging/images
```

预期：清单校验通过，暂存目录被 Git 忽略，`Videos/` 无改动。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；两个发布门禁仍失败。

**人工审核节点：** 视觉负责人按八馆逐张对照原图、固定顺序、裁切焦点、alt 可见事实和输出预览；项目方核对既有许可声明归档、渡江长期 Hero、梅园临时 Hero、三馆水印封面披露。已确认的许可不重新发起审批。

**独立提交信息：** `content: lock production image and rights manifests`

**失败回滚方式：** 删除/重建 `media-staging/images/` 中的派生文件，不触碰 `Videos/`；修正清单摘要后重验。已提交使用 `git revert <Task 5 提交SHA>`；云端尚无上传，无需云回滚。

---

### Task 6：制定 8 条视频规范并完成受控转码

**目标：** 按逐馆批准的剪辑/画幅方案生成 8 条 H.264/AAC、faststart 的 MP4，并用 ffprobe 验证编码、画幅、帧率、时长、音轨、体积和首帧；禁止拉伸和覆盖原视频。

**前置条件：** Task 5 许可声明已归档；音视频负责人已单独确认江上青、扬州、梅园等需要重剪/重构画幅的方案。若某馆画幅方案未确认，该馆不得转码，整个 Task 不提交。

**精确文件范围：**

- Create: `content/media/video-processing.json`
- Create: `scripts/process-videos.mjs`
- Create: `scripts/process-videos.test.ts`
- Modify: `package.json`（增加 `media:video:dry-run`、`media:video:process`、`check:videos`）
- Read only: `Videos/**/*.mp4`
- Generated, ignored: `media-staging/videos/media/sites/<site-id>/v1/video/<site-id>-video.mp4`

**TDD RED 步骤：**

1. 测试 `--dry-run` 恰好生成 8 条 ffmpeg 参数，输入位于 `Videos/`、输出位于 `media-staging/videos/`，并包含 `libx264`、AAC、`+faststart`、720×1280、25 fps；出现覆盖原件、`scale=720:1280` 强制拉伸或第 9 条视频时失败。
2. 测试每馆方案必须有 `approvedBy`、`approvedAt`、`editDecision`、`reframeMode`、`sourceSha256`；渡江必须从 HEVC 转 H.264，扬州必须有人工批准的重构方案。
3. 测试 `check:videos` 拒绝 HEVC、无 AAC、`moov` 在 `mdat` 后、宽高不符、无音轨、摘要不符或输出不在版本路径的文件。
4. 运行 `npm run test:run -- scripts/process-videos.test.ts`；预期失败。

**最小 GREEN 实现：**

1. `video-processing.json` 为八馆逐条记录真实源路径/摘要、负责人批准的剪辑入出点、重构模式、字幕音轨来源和期望输出；不得由脚本擅自决定内容删减。
2. `process-videos.mjs --dry-run` 只打印确定性命令；默认不处理。`--execute` 才运行，输出已存在时拒绝覆盖，除非先人工移走失败产物。
3. 通用编码尾部固定为：

```text
-c:v libx264 -profile:v high -pix_fmt yuv420p -r 25 -c:a aac -b:a 128k -movflags +faststart
```

缩放/裁切滤镜来自逐馆批准的 `reframeMode`，只允许等比缩放加裁切或留出经批准的版式区域，不允许非等比拉伸。
4. 执行前保存源摘要，执行后用 ffprobe 生成实际 codec、分辨率、帧率、时长、音频、码率和字节数，再写回清单并计算输出 SHA-256。
5. 浏览器验收覆盖 Chrome、Safari、微信内置浏览器可用设备，以及弱网首帧、拖动、暂停、结束和切换。

**定向验证命令：**

```bash
npm run test:run -- scripts/process-videos.test.ts
npm run media:video:dry-run
npm run media:video:process
npm run check:videos
```

预期：dry-run 展示 8 条且无原件覆盖；取得音视频负责人确认后才执行 process；最终 8 条均通过技术检查。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；发布门禁仍失败关闭。

**人工审核节点：** 音视频负责人先确认逐馆剪辑点和画幅，再逐条完整观看输出，检查无拉伸、无错删、音画同步、口播完整、视频内音乐保留符合既有决定。技术通过不能代替此签署。

**独立提交信息：** `media: add approved video processing pipeline`

**失败回滚方式：** 停止批处理，移走失败的 `media-staging/videos/` 派生文件并按原始摘要重新生成；绝不修改 `Videos/`。已提交使用 `git revert <Task 6 提交SHA>`；尚未上传时没有云对象回滚。

---

### Task 7：制作并校对 8 份 WebVTT

**目标：** 为 8 条最终视频制作 UTF-8 WebVTT，完整覆盖口播、时间轴单调不重叠，并归档人名、地名、年代、数字、标点和同步试播审核。

**前置条件：** Task 6 的最终剪辑时长和音轨锁定；字幕公开展示使用权已由项目方确认，不再设许可阻断。内容准确性与同步仍需人工审核。

**精确文件范围：**

- Create: `content/media/captions/huaibei-resistance-memorial-captions.vtt`
- Create: `content/media/captions/yuhuatai-martyrs-cemetery-captions.vtt`
- Create: `content/media/captions/dujiang-victory-memorial-captions.vtt`
- Create: `content/media/captions/sihang-warehouse-memorial-captions.vtt`
- Create: `content/media/captions/cpc-first-congress-memorial-captions.vtt`
- Create: `content/media/captions/jiang-shangqing-memorial-captions.vtt`
- Create: `content/media/captions/yangzhou-martyrs-cemetery-captions.vtt`
- Create: `content/media/captions/meiyuan-xincun-memorial-captions.vtt`
- Create: `content/media/caption-reviews.json`
- Create: `scripts/check-vtt.mjs`
- Create: `scripts/check-vtt.test.ts`
- Modify: `package.json`（增加 `check:captions`）

**TDD RED 步骤：**

1. 测试拒绝缺少 `WEBVTT`、非法时间戳、重叠、倒退、结束时间超过对应视频、空 cue、8 份之外的集合。
2. 测试每份字幕必须有审核记录：视频 SHA-256、字幕 SHA-256、`reviewedBy`、`reviewedAt`、`fullSpeechCovered: true`、`syncChecked: true`、`namesDatesNumbersChecked: true`。
3. 测试字幕清单与八个稳定 ID 一一对应，不能引用 Task 6 之前的视频摘要。
4. 运行 `npm run test:run -- scripts/check-vtt.test.ts`；预期失败。

**最小 GREEN 实现：**

1. 逐条转写最终视频，不从未核验候选正文自动拼字幕；首行严格为 `WEBVTT`，cue 使用 `HH:MM:SS.mmm --> HH:MM:SS.mmm`。
2. 以最终视频为准调整时间轴，保证不重叠、不倒退、末 cue 不越界；每馆完整静音试播一次。
3. 人名、地名、年代、数字和史实表述与 Task 2/3 台账对照，冲突时修正文案并重新审核，不用模糊字替代。
4. `caption-reviews.json` 保存真实审核人/日期、对应视频和字幕摘要以及三项人工结论。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-vtt.test.ts
npm run check:captions
```

预期：8 份字幕与 8 条最终视频摘要匹配并通过结构检查。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；发布门禁仍失败。

**人工审核节点：** 字幕审核人逐条全程试播并签署同步、完整口播和专名/年代/数字校对；内容负责人复核字幕中的史实。既有字幕使用权不重复审批。

**独立提交信息：** `content: add reviewed captions for eight videos`

**失败回滚方式：** 修正对应 VTT 和审核摘要，重新全程试播；不要改视频速度来迁就错误时间轴。已提交使用 `git revert <Task 7 提交SHA>`。

---

### Task 8：建立 CloudBase 对象路径与发布清单

**目标：** 把 28 张照片、8 个 Hero、8 个封面、8 条视频和 8 份 VTT 汇总为恰好 60 个不可变 `v1` 对象，形成上传前可签署、可复算的发布清单，不写入远程 URL。

**前置条件：** Task 5–7 的输出、摘要和人工审核全部完成；Task 1 已确认目标环境或明确记录 CloudBase 阻断。若环境盘点 blocked，可完成清单但不能进入 Task 9。

**精确文件范围：**

- Create: `content/cloudbase/object-release-manifest.json`
- Create: `scripts/check-object-release-manifest.mjs`
- Create: `scripts/check-object-release-manifest.test.ts`
- Modify: `package.json`（增加 `check:object-manifest`）

**TDD RED 步骤：**

1. 测试恰好 60 个对象，分类计数为 28/8/8/8/8，稳定 ID 齐全，路径仅小写英文、数字和连字符，全部位于 `media/sites/<site-id>/v1/`。
2. 测试拒绝重复对象路径、中文/空格、源文件缺失、SHA-256/字节数不符、`cloud://`、HTTP/HTTPS URL、临时签名参数和 `v0`/无版本路径。
3. 测试清单环境 ID 只能是固定环境，且 `uploadAuthorized` 字段不得存在；授权是外部停顿门，不能硬编码进版本库。
4. 运行 `npm run test:run -- scripts/check-object-release-manifest.test.ts`；预期失败。

**最小 GREEN 实现：**

1. 从图片、视频、字幕清单确定性汇总 60 条记录，每条包含 `assetId`、`siteId`、`role`、`localPath`、`objectPath`、`mimeType`、`bytes`、`sha256`、`reviewRefs`。
2. 清单顶层包含固定 `environmentId`、版本 `v1`、总字节数、生成时间和生成器版本；不包含远程 URL、上传成功标志或审核通过常量。
3. 校验器重新读取每个本地文件计算摘要和字节数，禁止只相信清单文本。
4. 人工打印/审阅 60 行“本地文件 → 对象路径”映射和预计总容量。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-object-release-manifest.test.ts
npm run check:object-manifest
```

预期：恰好 60 个本地文件、路径和摘要全部一致；没有远程 URL。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；生产内容和地图门禁仍失败。

**人工审核节点：** 用户审核固定环境、`v1` 前缀、60 个对象、路径、预计容量和总摘要。审核清单不等于上传授权；必须另问一次并等待明确答复。

**独立提交信息：** `release: add immutable CloudBase media manifest`

**失败回滚方式：** 只重生成清单，不移动或删除媒体；已提交使用 `git revert <Task 8 提交SHA>`。远程尚无写入。

---

### Task 9：经授权上传媒体并进行只读对账

**目标：** 仅在单独授权后把 Task 8 的 60 个对象上传到固定环境既有云存储位置，随后用 CloudBase MCP 只读对象/元数据和真实 HTTPS 访问逐项对账；不部署网站。

**前置条件：** Task 1 完成且确认既有存储和可用域名；Task 8 通过并由用户审核。执行者必须停顿，向用户展示环境 ID、对象数、`v1` 前缀、总容量和动作范围，并取得只针对本次上传的明确授权。

**精确文件范围：**

- Create: `content/cloudbase/upload-reconciliation.json`
- Create: `scripts/check-upload-reconciliation.mjs`
- Create: `scripts/check-upload-reconciliation.test.ts`
- Modify: `package.json`（增加 `check:upload-reconciliation`）
- Cloud write after authorization only: `red-footprint-preview-d5322636bd` 中 Task 8 的 60 个 `media/sites/*/v1/*` 对象
- Cloud read after upload: 同 60 个对象的路径、字节数、ETag/摘要、MIME、访问状态和实际 HTTPS URL

**TDD RED 步骤：**

1. 测试对账必须逐条匹配环境 ID、对象路径、字节数、MIME 和 SHA-256；缺对象、多对象、摘要不一致或 URL 主机不在 Task 1 已确认域名集合中时失败。
2. 测试拒绝 `cloud://`、HTTP、临时签名查询参数、其他环境域名和未在发布清单中的远程对象。
3. 测试 `upload-reconciliation.json` 只能从只读查询结果生成，不得接受脚本参数 `assume-success` 或清单中的自报成功值。
4. 运行 `npm run test:run -- scripts/check-upload-reconciliation.test.ts`；预期失败。

**最小 GREEN 实现：**

1. 无授权时只运行清单验证和上传演练，随后停止；不调用任何 CloudBase 写工具。
2. 有明确上传授权后，逐项上传 Task 8 清单中的 60 个对象到既有存储；不得创建存储桶、修改公开读/防盗链/CORS、覆盖其他版本或删除对象。若既有权限不足，停止并为权限变更另行请求授权。
3. 上传完成后切换回 MCP 只读 list/get/head 能力，按对象路径读取元数据；从实际返回值生成 `upload-reconciliation.json`。
4. 对 60 个真实 HTTPS URL 执行 HEAD/GET 可访问检查，并在 Chrome、Safari、微信内置浏览器可用设备上抽样/全量验证图片、视频 Range 请求和 VTT MIME。
5. 对账全部通过后才提交记录。部分上传不标记完成，也不进入 Task 10。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-upload-reconciliation.test.ts
npm run check:object-manifest
npm run check:upload-reconciliation
```

预期：60/60 对象的实际元数据和 URL 与本地发布清单一致。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：前三项通过；`sites.json` 尚未生成时内容门禁失败；地图门禁继续 blocked。

**人工审核节点：** 上传前由用户单独授权；上传后由发布负责人核对 60/60、域名、总容量、真实访问和浏览器播放证据。该授权不包含权限修改、资源创建、对象删除、GitHub 绑定或部署。

**独立提交信息：** `release: record CloudBase media reconciliation`

**失败回滚方式：** 立即停止后续上传，记录已成功和失败对象；不在未授权情况下覆盖或删除任何远程对象。由于生产 `sites.json` 尚未引用 `v1` URL，应用回滚是“不切换引用”。清理部分对象必须另取删除授权；Git 记录已提交时用 `git revert <Task 9 提交SHA>`，但 Git 回滚不宣称已改变云端状态。

---

### Task 10：从审核输入生成生产 `sites.json`

**目标：** 确定性合并八馆正式正文、来源、审核、许可声明和上传对账结果，生成恰好八条生产数据；只使用对账确认的真实 CloudBase HTTPS URL，不从测试 fixture 取值。

**前置条件：** Task 3 八馆内容审核通过；Task 4 schema 完成；Task 9 60/60 对账通过。未上传或未对账时不得生成生产文件。

**精确文件范围：**

- Create: `scripts/generate-sites.mjs`
- Create: `scripts/generate-sites.test.ts`
- Create: `src/data/sites.json`
- Modify: `package.json`（增加 `generate:sites`、`check:sites-generated`）

**TDD RED 步骤：**

1. 测试生成器在缺任一正文/来源/审核/许可/媒体对账输入时失败，且不产生 `sites.json`。
2. 测试输出恰好八馆、稳定 ID/正式名称、总照片 28、每馆一 Hero/视频/封面/VTT，照片顺序与 Task 5 完全一致。
3. 测试一大双地址和坐标精确值；测试三馆水印披露、渡江/梅园 Hero 决定、不存在全站背景音乐字段。
4. 测试拒绝 fixture、合成文本、本机路径、测试域名、临时签名 URL、非 Task 1 域名以及输入摘要不一致。
5. 测试 `contentReview`、许可和水印接受状态从真实审核文件读取；修改输入审核为非 verified 后生成必须失败，证明没有硬编码通过状态。
6. 运行 `npm run test:run -- scripts/generate-sites.test.ts`；预期失败。

**最小 GREEN 实现：**

1. 生成器只读取 `content/sites/`、`content/sources/`、`content/reviews/`、`content/media/`、Task 1 清单和 Task 9 对账；显式禁止导入 `src/test/fixtures/sites.ts`。
2. 先在内存合并，再用 `siteSchema`/等价生产校验和摘要交叉检查，全部成功后原子写入 `src/data/sites.json`。
3. URL 只能来自 `upload-reconciliation.json` 的 60/60 已核验记录；生成器不拼接域名、不接受命令行 URL、不提供成功开关。
4. 输出字段按稳定 ID 排序，JSON 两空格缩进、结尾换行；第二次生成必须无 diff。
5. 一大会址固定保留红心兴业路 76 号与页面黄陂南路 374 号；其余馆保留各自坐标和地址来源引用。

**定向验证命令：**

```bash
npm run test:run -- scripts/generate-sites.test.ts
npm run generate:sites
cp src/data/sites.json /tmp/09b-sites-before-regeneration.json
npm run generate:sites
npm run check:sites-generated
cmp -s /tmp/09b-sites-before-regeneration.json src/data/sites.json
```

预期：生成成功且第二次生成无差异；输出不含未经对账 URL 或硬编码审核结果。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run build
npm run check:content
npm run check:map
```

预期：lint、单测、构建通过；旧内容门禁可能在 Task 11 扩展前失败；地图门禁必须 blocked。

**人工审核节点：** 内容负责人逐馆 diff 正文与来源，视觉/音视频负责人核对 60 个 URL 映射，发布负责人确认生成器没有域名拼接、fixture 导入或审核状态常量。任何一人拒绝即不提交。

**独立提交信息：** `content: generate audited production sites data`

**失败回滚方式：** 删除未通过校验的生成文件并修正上游输入，不能直接手改生产 JSON 绕过生成器。已提交使用 `git revert <Task 10 提交SHA>`；媒体仍保留 `v1`，不删除云对象。

---

### Task 11：使生产内容门禁真实通过

**目标：** 扩展内容门禁同时验证结构、资源、声明和人工审核三层，使真实 `src/data/sites.json` 通过；水印披露按项目方决定校验，不能要求水印为 false。

**前置条件：** Task 10 已生成并人工核对生产数据；Task 1、3、5、7、9 的证据均可追溯。

**精确文件范围：**

- Modify: `scripts/check-content.mjs`
- Modify: `scripts/check-content.test.ts`
- Modify: `package.json`（让 `check:content` 串联生产输入、图片、视频、字幕、对象和对账校验）

**TDD RED 步骤：**

1. 增加结构层测试：8 个稳定 ID/正式名称、GCJ-02、一大双地址、28 张固定顺序照片、每馆唯一视频且媒体序列首项为视频。
2. 增加资源层测试：允许域名必须来自 Task 1；60 个 URL 必须来自 Task 9；对象路径、版本、MIME、字节数和 SHA-256 必须匹配；拒绝本机/测试/临时签名 URL。
3. 增加声明层测试：逐事实来源、内容审核、媒体许可覆盖、字幕同步、播放验收都要有真实人和日期；AI 水印存在时只要求透明披露和项目方接受记录，不得要求不存在水印。
4. 增加防硬编码测试：把审核输入改为 rejected、删掉上传对象或改照片顺序，运行真实命令必须失败。
5. 先运行 `npm run check:content` 和 `npm run test:run -- scripts/check-content.test.ts`；预期至少一个新断言失败。

**最小 GREEN 实现：**

1. 把已有 `posterReview.aiWatermark === false` 规则替换为 `aiWatermarkPresent`/`aiWatermarkAccepted`/接受方/日期的条件校验。
2. 将 `coordinateSystem`、`markerAddress`、完整来源字段、许可声明引用、媒体清单/对账引用加入校验。
3. 从版本化清单读取固定照片顺序、允许主机和实际对象，不在脚本里重复硬编码生产 URL 或审核通过状态。
4. `npm run check:content` 离线验证已归档的只读对账证据；人工发布检查仍负责真实 URL 访问与浏览器播放，脚本不得宣称远端现状永久有效。
5. 错误输出带 `[schema]`、`[resource]`、`[rights]`、`[review]` 分类和精确字段路径。

**定向验证命令：**

```bash
npm run test:run -- scripts/check-content.test.ts
npm run check:content
```

预期：真实生产输入通过；所有负向 fixture 仍失败关闭。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run check:content
npm run build
npm run check:map
```

预期：前四项通过；`check:map` 唯一预期失败并清楚报告 blocked。若地图命令意外通过，视为严重失败并停止。

**人工审核节点：** 内容、媒体、发布负责人共同审核门禁输出，确认没有把项目方已确认许可重新设阻断，没有把 schema 通过等同于史实审核，也没有放宽真实来源和远程对象对账。

**独立提交信息：** `test: enforce production content delivery gates`

**失败回滚方式：** 修复数据或校验器的真实不一致，不允许删除负向测试或降低规则。已提交使用 `git revert <Task 11 提交SHA>`；地图状态和云对象不变。

---

### Task 12：添加 GitHub 自动构建配置并保持部署停用

**目标：** 在 GitHub 上统一执行安装、内容门禁、地图门禁、lint、单测和构建；本地写好 CloudBase Git 构建契约，但地图 blocked 时不绑定 GitHub、不启用自动部署、不发布 `dist/`。

**前置条件：** Task 11 内容门禁通过。Node 版本从项目 `engines`/锁定 CI 版本确定；若 `package.json` 尚无 `engines`，本 Task 依据本地验证版本补充。地图仍 blocked。

**精确文件范围：**

- Create: `.github/workflows/ci.yml`
- Create: `scripts/verify-release.mjs`
- Create: `scripts/verify-release.test.ts`
- Create: `docs/cloudbase/github-build.md`
- Modify: `package.json`（增加 `verify:release` 和必要的 `engines.node`）

**TDD RED 步骤：**

1. 测试 `verify-release.mjs` 的固定顺序为内容检查 → 地图检查 → lint → 单测 → build，任一步非零立即停止；地图 blocked 时不得运行部署子进程。
2. 测试拒绝忽略退出码、成功后门、裸 `vite build` 替代完整发布验证或输出目录不是 `dist` 的配置。
3. 测试 workflow 在 PR 和 `main` push 上执行 `npm ci` 与 `npm run verify:release`，且不存在部署步骤、CloudBase 密钥或写权限。
4. 运行 `npm run test:run -- scripts/verify-release.test.ts`；预期失败。

**最小 GREEN 实现：**

1. `verify-release.mjs` 使用 `spawnSync` 顺序执行 `npm run check:content`、`npm run check:map`、`npm run lint`、`npm run test:run`、`npm run build`；传递首个非零退出码。
2. `.github/workflows/ci.yml` 只授予 `contents: read`，使用锁定 Node 版本、`npm ci` 和 `npm run verify:release`；不包含部署 job。
3. `docs/cloudbase/github-build.md` 固定仓库分支 `main`、安装 `npm ci`、构建 `npm run verify:release`、输出 `dist`、路径 `/`，并记录固定环境。文档明确当前不得执行远程连接。
4. 地图 blocked 时，GitHub/CloudBase 构建安全失败；不得为获得绿色状态更改命令顺序或移除地图检查。
5. 只有未来地图材料齐全、`check:map` 真实通过后，才向用户分别请求 GitHub 绑定授权和部署授权；没有这两次明确授权不调用远程写工具。

**定向验证命令：**

```bash
npm run test:run -- scripts/verify-release.test.ts
npm run verify:release
```

预期：测试通过；真实 `verify:release` 在地图步骤退出 1，后续 lint/test/build 不由该发布命令执行，且没有部署动作。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run check:content
npm run build
npm run check:map
```

预期：前四项通过；地图门禁失败关闭。

**人工审核节点：** 开发负责人审核工作流最小权限和命令顺序；发布负责人确认 `dist`、分支和固定环境；用户确认当前只是本地配置，未绑定 GitHub、未启用构建、未部署。未来远程动作必须重新停顿询问。

**独立提交信息：** `ci: add gated static build configuration`

**失败回滚方式：** 未提交时移除本 Task 五个文件的变更；已提交使用 `git revert <Task 12 提交SHA>`。如果未来经授权绑定后需要回滚，Git 回滚不会解除远程绑定；解除绑定属于新的 CloudBase 写操作，必须单独授权。

---

### Task 13：确认地图门禁与公开发布阻断

**目标：** 以自动化测试和人工发布清单证明：官方平面标准地图原件已经取得并可追溯，但它未覆盖网站三维球面纹理/边界的重投影、缩放、裁切等最终公开形态；在专项审核材料未齐时边界层不初始化、列表降级可用、内容可本地验收、发布命令失败且不存在公开部署。同时修订现有发布清单，使其忠实反映已确认媒体决定。

**前置条件：** Task 12 本地配置完成；`src/data/mapCompliance.json` 仍为 blocked。只读核验以下本地原件及其官方下载来源，不编辑图片、不生成球面纹理、不填写 verified：

- `docs/compliance/maps/china-map-gs-2023-2762-original-jpg.zip`，来源为标准地图系统官方对象存储 `https://bzdt-sbsm.obs.cn-north-4.myhuaweicloud.com/prototype/%E5%AF%B9%E5%BC%80/4o28b0625501ad13015501ad2bfc2192a.zip`；
- `docs/compliance/maps/china-map-gs-2023-2762-original.jpg`，由上述 ZIP 原样解包；
- `docs/compliance/maps/public-map-content-representation-2023.pdf`，自然资源部《公开地图内容表示规范（自然资规〔2023〕2号）》原文。

**精确文件范围：**

- Modify: `scripts/verify-release.test.ts`
- Modify: `src/lib/mapCompliance.test.ts`
- Modify: `src/components/globe/GlobeScene.test.tsx`
- Modify: `docs/release-checklist.md`
- Read-only local evidence: `docs/compliance/maps/china-map-gs-2023-2762-original-jpg.zip`
- Read-only local evidence: `docs/compliance/maps/china-map-gs-2023-2762-original.jpg`
- Read-only local evidence: `docs/compliance/maps/public-map-content-representation-2023.pdf`
- Must remain unchanged: `src/data/mapCompliance.json`
- No cloud changes: CloudBase、GitHub 连接、静态托管和公开 URL

**TDD RED 步骤：**

1. 增加测试：生产 `mapCompliance.json` 为 blocked 时，`npm run check:map` 与 `npm run verify:release` 均退出 1，且验证器没有触发任何部署命令。
2. 增加负向测试：只有 `GS(2023)2762号`、平面 JPG 路径和原件摘要，但没有覆盖最终三维球面形态的权威机构、审核号、用途范围、最终资源摘要与人工签署时，地图门禁仍必须失败；防止把原图审图号硬编码为改绘审核通过。
3. 增加 UI 测试：blocked 时不初始化公开边界层，八馆列表降级仍可访问；不得用预览标志改变该结果。
4. 增加发布清单文本测试或精确审阅断言，要求清单写明 28 张顺序固定、许可已确认、渡江 Hero 长期使用、梅园 Hero 临时但不阻断、三馆水印封面允许且披露、不新增背景音乐、一大双地址，以及“原始平面图来源已核验、三维改绘仍阻断”。
5. 先运行定向测试；预期旧清单中“必须替换全部水印封面”等冲突表述，以及缺失平面原件与三维改绘边界说明，使新断言失败。

**最小 GREEN 实现：**

1. 保持 `mapCompliance.json` 完全不变，只补测试证明 blocked 行为和列表降级。
2. 修订 `docs/release-checklist.md` 中与已确认项目决定冲突的旧条目：许可改为“已归档且覆盖一致”，三馆水印改为“透明披露且有接受记录”，渡江/梅园 Hero 按决定验收，不新增背景音乐。
3. 在发布清单中如实登记平面标准地图名称、官方对象 URL、`GS(2023)2762号`、两个 SHA-256、6849×8073、300 DPI、核验日期及“原件未修改”；同时明确该审图号不覆盖球面重投影或裁切。
4. 发布清单继续要求最终三维资源的权威机构、HTTPS 来源、真实审核号、用途范围、资源路径/URL、SHA-256、核验人/日期，以及完整疆域、国界、行政边界和岛屿人工检查。缺少任一项即保持 blocked。
5. 记录当前发布结论为 blocked；不填写候选站点 URL、三维资源审核号或 verified 签署栏，不公开部署。
6. 将“解除地图阻断”留给专项受审提交：只有最终三维资源材料齐全、地图负责人签署、`npm run check:map` 通过、发布清单全部完成后，才可请求 GitHub 绑定与部署授权。

**定向验证命令：**

```bash
npm run test:run -- scripts/verify-release.test.ts src/lib/mapCompliance.test.ts src/components/globe/GlobeScene.test.tsx
npm run check:map
npm run verify:release
git diff --exit-code -- src/data/mapCompliance.json
shasum -a 256 docs/compliance/maps/china-map-gs-2023-2762-original-jpg.zip docs/compliance/maps/china-map-gs-2023-2762-original.jpg
file docs/compliance/maps/china-map-gs-2023-2762-original.jpg docs/compliance/maps/public-map-content-representation-2023.pdf
```

预期：测试通过；两个真实发布命令都因地图 blocked 退出 1；地图 JSON 无改动；两个摘要精确匹配基线，JPG 为 6849×8073 原件、PDF 为 5 页规范原文。

**全量验证命令：**

```bash
npm run lint
npm run test:run
npm run check:content
npm run build
npm run check:map
npm run verify:release
```

预期：前四项通过；最后两项非零并明确指向地图阻断。任何公开站点部署、CloudBase 构建记录或 GitHub 远程绑定都应不存在。

**人工审核节点：** 地图合规负责人先确认 `GS(2023)2762号` 平面原件来源与摘要真实，再确认该材料没有覆盖三维球面最终公开形态并拒绝签署 verified；发布负责人确认公开发布被阻断、降级列表可用、清单与媒体决定一致；用户确认没有执行上传之外的云写操作，没有 GitHub 绑定和部署。

**独立提交信息：** `test: preserve map compliance release block`

**失败回滚方式：** 如果摘要不匹配、原件损坏或测试意外通过发布命令，立即停止；重新从已记录的官方 URL 下载到隔离目录核对，不覆盖现有证据，不执行部署。已提交使用 `git revert <Task 13 提交SHA>`。不得通过编造审图号、把 `GS(2023)2762号` 冒充球面改绘审核号、删除地图检查或修改退出码回滚失败；最终三维合规材料到位后另立受审核提交。

---

## 4. 逐 Task 提交纪律

每个 Task 只暂存其“精确文件范围”中的文件：

```bash
git status --short
git diff --check
git diff --cached --name-only
git commit -m "该 Task 指定的独立提交信息"
```

提交前确认 `git diff --cached --name-only` 没有 `Videos/`、`media-staging/`、DOC/DOCX/XLSX、其他项目或父仓库既存改动。不得 amend，不得 push。需要修正前一 Task 时创建新的修复提交，或在尚未开展后续 Task 时使用 `git revert` 回滚。

## 5. 09B 完成定义

09B 可声明“生产内容与静态媒体交付已准备、公开发布仍阻断”必须同时满足：

- Task 1–13 各自的文件、定向验证、全量验证、人工审核和独立提交均有证据；
- 八份来源台账、八份正文、八份内容审核真实完整；
- 28 张照片顺序不变，8 个 Hero、8 个封面、8 条 H.264/AAC faststart 视频、8 份 VTT 都有清单、摘要和人工审核；
- 许可声明覆盖完整，三馆水印、渡江 Hero、梅园 Hero 和无全站背景音乐决定被忠实保留；
- 60 个媒体对象只有在单独授权后上传，并已通过 CloudBase MCP 只读对账与真实 HTTPS/浏览器检查；
- `src/data/sites.json` 由审核输入确定性生成，不含虚构 URL、测试数据、本机路径、临时签名 URL或代码写死的审核结论；
- `npm run check:content` 通过，lint、单测和 build 通过；
- `GS(2023)2762号` 平面标准地图原件与规范原文已核验，但 `npm run check:map` 和 `npm run verify:release` 因最终三维球面形态审核材料未齐而失败关闭；
- CloudBase 未创建数据库、云函数、云托管容器、认证或运行时 API；未修改权限、未删除对象、未绑定 GitHub、未部署或公开发布；
- 解除地图阻断等待覆盖最终三维球面形态的合规材料；GitHub 远程绑定和正式部署还需各自单独授权，均不属于当前 09B 完成动作。
