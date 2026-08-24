# 2026-08-24 目录恢复与发布验收记录

## 结论

本地项目目录已从 `AiPlace/暑期红色网站/` 恢复为 `AiPlace/暑期网站/`。截至父仓库提交 `81f978d`，网站代码、45 张照片、8 个视频、8 个封面和 8 个字幕已经形成 77 个版本化媒体对象；本地正式发布门禁和跨浏览器端到端测试均通过。

本记录不代表网站已经推送或部署。GitHub subtree 导出、远程 Actions 和 CloudBase 服务版本检查在后续步骤记录。此次操作未修改 CloudBase 权限，未删除或覆盖既有对象，也未启动 CloudBase 网站部署。

## Git 与目录恢复

- 父仓库：`/Users/pengjinhao/Documents/AiPlace`
- 分支：`main`
- 目录恢复提交：`374697d chore: restore website project path`
- 媒体对账提交：`ce603ad content: reconcile complete website media`
- 生产 URL 提交：`81f978d content: publish complete media URLs`
- 暂存与提交均限定为 `暑期网站/`、旧名称 `暑期红色网站/` 的必要删除记录；父仓库的 `quiz-app` 和其他兄弟项目未纳入提交。
- 当前 subtree 源目录：`暑期网站/`
- 目标独立仓库：`PengjinHao-cell/red-footprint-website`
- 目标分支：`main`

## CloudBase 媒体追加

- 环境：`red-footprint-preview-d5322636bd`
- 区域：`ap-shanghai`
- 存储桶：`7265-red-footprint-preview-d5322636bd-1438111688`
- CDN：`https://7265-red-footprint-preview-d5322636bd-1438111688.tcb.qcloud.la`
- 原有对象：60
- 本次新增对象：17 张 WebP 照片
- 对账后对象：77
- 对账后总字节：100,252,923
- 写入策略：只创建，不覆盖、不删除、不修改权限

新增分布：

- 渡江胜利纪念馆：4 张（06–09）
- 上海四行仓库抗战纪念馆：6 张（06–11）
- 中国共产党第一次全国代表大会纪念馆：5 张（06–10）
- 中国共产党代表团梅园新村纪念馆：2 张（05–06）

上传前 17 个目标公网路径均返回 HTTP 404；上传后逐个下载验证均满足 HTTP 200、`image/webp`、字节数一致、WebP 签名有效、SHA-256 与媒体清单完全一致。`object-release-manifest.json` 和 `upload-reconciliation.json` 已据真实响应更新为 77 个对象。

## RED → GREEN 证据

### 发布证据完整性

RED：

```text
scripts/check-upload-reconciliation.test.ts
1 failed, 6 passed
失败原因：已提交证据为 60 个对象，缺少 17 张照片，共返回 38 条差异。
```

GREEN：

```text
scripts/check-upload-reconciliation.test.ts
8 passed
Upload reconciliation passed: 77 immutable CloudBase v1 objects verified.
```

其中新增动态计数测试先以 `formatUploadReconciliationSuccess is not a function` 正确失败，再通过最小实现消除旧的固定“60 objects”文案。

### 生产媒体 URL

第一次完整发布检查在 `check:content --release` 阶段失败，原因是 `src/data/sites.json` 仍引用本地媒体路径。使用唯一生产生成器 `npm run generate:sites` 重建后，77 个资源全部切换为已核验的 CloudBase HTTPS URL，8 个站点的 `mediaDelivery.status` 为 `reconciled-production`。

旧生产断言随后准确失败于 `pre-upload-object` 与 `reconciled-production` 不一致；只修改该生产断言后，`src/data/loadSites.test.ts` 的 14 项测试全部通过，合成 fixture 和负面校验未放宽。

## 完整自动验收

执行日期：2026-08-24（Asia/Shanghai）。

### `npm run verify:release`

退出码：0。

- 正式内容：8 个站点，每站 9 个事实字段，通过。
- 媒体：45 张照片、8 个 Hero、8 个视频封面、8 个 MP4、8 个 VTT，共 77 个对象，通过。
- CloudBase 上传对账：77 个对象，通过。
- 生产内容与 URL：与媒体清单和上传对账完全一致，通过。
- 地图：34 个省级要素、1 个南海界线、8 个 GCJ-02 点位，通过。
- ESLint：退出码 0。
- Vitest：31 个测试文件、206 项测试，全部通过。
- TypeScript 与 Vite 正式构建：退出码 0。

构建产物：

| 文件 | 原始大小 | Gzip |
| --- | ---: | ---: |
| `dist/index.html` | 0.41 kB | 0.31 kB |
| 主 CSS | 14.38 kB | 3.56 kB |
| 主 JS | 700.16 kB | 205.43 kB |
| `globe.gl` 分包 | 1,883.65 kB | 532.59 kB |

Vite 仍报告大于 500 kB 的分包提示；它是性能关注项，不是构建失败。三维地球在此前 headless/软件渲染测量中仍高于目标，真实 GPU 性能和近邻星点击偏移需要继续以真机结果为准，不将自动测试通过描述成真实 GPU 性能已经达标。

### `npm run test:e2e`

退出码：0。

- Desktop Chromium：通过
- Pixel Mobile Chromium：通过
- iPhone Mobile WebKit：通过
- 合计：18/18 通过

端到端测试覆盖欢迎页到详情、返回后访问进度、WebGL 降级八站点列表、视频优先媒体顺序、播放时输入锁定、Range/metadata 请求以及图片和视频失败恢复。

## 文档与仓库检查

- README 已更新为 45 张照片、77 个版本化媒体对象。
- 发布清单已移除旧的“每处 1–5 张/28 图”表述，改为展示源文件提供的全部 45 张照片。
- 项目根目录没有 LICENSE；本次不擅自选择或创建许可证。
- 项目根目录没有 CHANGELOG。
- 项目根目录没有独立 TODO/ROADMAP；现有 `TASK2-TODO-HANDOFF.md` 是既有未跟踪交接材料，本次不纳入网站仓库。
- 原始 `Videos/`、DOCX、XLSX、JPG、`.superpowers/`、构建输出和媒体暂存目录继续保留在本地，不纳入 subtree 导出提交。

## 后续门禁

1. 生成并检查 `git subtree split --prefix=暑期网站` 导出分支。
2. 确认远程 `main` 是导出历史的祖先，只允许普通快进推送，不使用强制推送。
3. 等待 `PengjinHao-cell/red-footprint-website` GitHub Actions 全绿。
4. 只读检查 CloudBase `footprint` 是否自动产生对应提交的新版本。
5. 如果没有自动触发，必须重新取得“保持原配置不变，手动启动一次部署”的独立授权。
