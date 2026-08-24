# 暑期网站目录恢复与 Subtree 发布实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project must be executed serially on `main`; do not dispatch subagents or create worktrees.

**Goal:** 将维护完成的网站恢复到 `AiPlace/暑期网站/`，通过全部获授权验收门禁，并以 subtree 方式把该目录作为独立仓库根目录推送到 `PengjinHao-cell/red-footprint-website/main`。

**Architecture:** 父仓库继续承载本地多项目历史，但所有暂存操作都限定为网站路径。目录恢复和发布证据分别提交；随后用 `git subtree split --prefix=暑期网站` 生成只包含网站的独立提交，再以普通快进方式推送。推送后的 GitHub Actions 与 CloudBase 自动构建先只读核对，任何 CloudBase 上传、手动部署或回滚都保持独立授权门禁。

**Tech Stack:** Git、git subtree、React 19、TypeScript 6、Vite 8、Vitest 4、Playwright、GitHub Actions、腾讯云 CloudBase 静态托管。

---

## 文件结构与职责

- `AiPlace/暑期网站/`：恢复后的唯一网站开发目录及 subtree 源目录。
- `content/media/media-manifest.json`：77 个发布对象的本地权威媒体清单。
- `content/cloudbase/object-release-manifest.json`：待发布对象的不可变路径、大小与摘要清单。
- `content/cloudbase/upload-reconciliation.json`：已经过 HTTP 与云端核对的真实上传证据；不得填入推测值。
- `scripts/check-upload-reconciliation.test.ts`：发布清单与上传核对契约测试。
- `docs/maintenance/2026-08-24-release-verification.md`：本次恢复、测试、subtree、Actions 与 CloudBase 检查记录。
- `README.md`、`docs/release-checklist.md`：对外结构和发布状态说明。

### Task 1: 建立恢复前快照

**Files:**
- Inspect: `AiPlace/暑期网站/`
- Inspect: `AiPlace/暑期红色网站/`
- Create: a directory returned by `mktemp -d /tmp/red-footprint-recovery.XXXXXX`（仅保存只读清单，不进入 Git）

- [ ] **Step 1: 记录父仓库状态与网站路径状态**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace status --short
git -C /Users/pengjinhao/Documents/AiPlace branch --show-current
git -C /Users/pengjinhao/Documents/AiPlace rev-parse HEAD
```

Expected: branch is `main`; output still contains unrelated paths, which are recorded but never staged.

- [ ] **Step 2: 记录两个目录的文件清单和大小**

Run:

```bash
find /Users/pengjinhao/Documents/AiPlace/暑期红色网站 -type f -print | sort
du -sh /Users/pengjinhao/Documents/AiPlace/暑期红色网站
test ! -e /Users/pengjinhao/Documents/AiPlace/暑期网站
```

Expected: the maintained directory exists and the old working-tree path is absent. If `暑期网站/` already exists, stop and compare it instead of overwriting it.

- [ ] **Step 3: 确认忽略项不会进入版本历史**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace check-ignore -v 暑期红色网站/node_modules 暑期红色网站/dist 暑期红色网站/.media-staging 暑期红色网站/.media-tools
```

Expected: all generated directories are ignored. If any is not ignored, update only `暑期红色网站/.gitignore`, verify again, and commit that focused change before moving the directory.

### Task 2: 恢复 `暑期网站/` 路径

**Files:**
- Move: `AiPlace/暑期红色网站/` → `AiPlace/暑期网站/`
- Preserve: every sibling directory under `AiPlace/`

- [ ] **Step 1: 原子移动网站目录**

Run:

```bash
mv /Users/pengjinhao/Documents/AiPlace/暑期红色网站 /Users/pengjinhao/Documents/AiPlace/暑期网站
```

Expected: the source path no longer exists and `暑期网站/package.json` exists.

- [ ] **Step 2: 验证 Git 将内容识别为原路径的恢复与修改**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace status --short -- 暑期网站 暑期红色网站
git -C /Users/pengjinhao/Documents/AiPlace diff --stat -- 暑期网站 暑期红色网站
```

Expected: only the two网站路径 appear; `quiz-app` and sibling projects do not appear in this scoped output.

- [ ] **Step 3: 暂存精确路径并审查缓存差异**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace add -A -- 暑期网站 暑期红色网站
git -C /Users/pengjinhao/Documents/AiPlace diff --cached --name-status
git -C /Users/pengjinhao/Documents/AiPlace diff --cached --check
```

Expected: cached diff contains only `暑期网站/` and `暑期红色网站/`; no generated directories, raw excluded media, credentials, or sibling projects.

- [ ] **Step 4: 提交目录恢复**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace commit -m "chore: restore website project path"
```

Expected: one commit records the path recovery and all approved maintenance files, without unrelated workspace changes.

### Task 3: 为真实发布证据建立 RED 门禁

**Files:**
- Modify: `AiPlace/暑期网站/scripts/check-upload-reconciliation.test.ts`
- Test: `AiPlace/暑期网站/scripts/check-upload-reconciliation.test.ts`

- [ ] **Step 1: 添加读取已提交发布证据的回归测试**

Append this test inside the existing `describe` block:

```ts
it('keeps committed release and reconciliation evidence complete for every published object', () => {
  const release = JSON.parse(
    readFileSync('content/cloudbase/object-release-manifest.json', 'utf8'),
  );
  const reconciliation = JSON.parse(
    readFileSync('content/cloudbase/upload-reconciliation.json', 'utf8'),
  );

  expect(
    validateUploadReconciliation(mediaManifest(), release, reconciliation),
  ).toEqual([]);
});
```

- [ ] **Step 2: 运行测试并确认 RED 原因正确**

Run:

```bash
npm run test:run -- scripts/check-upload-reconciliation.test.ts
```

Expected: FAIL because committed evidence contains 60 objects while the media manifest requires 77; failure must mention missing/count/digest evidence rather than syntax or import errors.

### Task 4: 核对 17 个新增云端对象并处理授权门禁

**Files:**
- Inspect: `AiPlace/暑期网站/content/media/media-manifest.json`
- Modify only after real verification: `AiPlace/暑期网站/content/cloudbase/object-release-manifest.json`
- Modify only after real verification: `AiPlace/暑期网站/content/cloudbase/upload-reconciliation.json`

- [ ] **Step 1: 从媒体清单生成期望的 77 对象发布清单到临时位置**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; import { buildObjectReleaseManifest } from './scripts/check-upload-reconciliation.mjs'; const media=JSON.parse(fs.readFileSync('content/media/media-manifest.json','utf8')); const release=buildObjectReleaseManifest(media,{environmentId:'red-footprint-preview-d5322636bd',region:'ap-shanghai',bucket:'7265-red-footprint-preview-d5322636bd-1438111688',releasedAt:new Date().toISOString()}); console.log(JSON.stringify({objectCount:release.objectCount,totalBytes:release.totalBytes,paths:release.objects.map(o=>o.objectPath)},null,2));"
```

Expected: temporary manifest has `objectCount: 77`; the difference from committed release evidence is exactly 17 photos: 渡江 4、四行仓库 6、一大会址 5、梅园新村 2.

- [ ] **Step 2: 对 17 个 HTTPS 对象执行只读验证**

For every missing object, issue HTTPS HEAD/GET and verify:

```text
HTTP status = 200
Content-Length = media manifest bytes
Content-Type = image/webp
Downloaded SHA-256 = media manifest sha256
WebP signature = valid
```

Expected: every field comes from the live object response. Do not infer `etag`, `lastModified`, status, digest, or URL.

- [ ] **Step 3: 根据只读结果选择唯一合法分支**

If all 17 objects already exist and match, update the two JSON evidence files using the verified values and continue. If any object is absent or mismatched, stop implementation and request separate CloudBase upload authorization; do not edit reconciliation evidence and do not push.

- [ ] **Step 4: 运行回归测试并确认 GREEN**

Run:

```bash
npm run test:run -- scripts/check-upload-reconciliation.test.ts
npm run check:upload-reconciliation
```

Expected: the targeted test and CLI gate both exit 0 with all 77 objects represented by exact evidence.

- [ ] **Step 5: 提交发布证据修复**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace add -- 暑期网站/scripts/check-upload-reconciliation.test.ts 暑期网站/content/cloudbase/object-release-manifest.json 暑期网站/content/cloudbase/upload-reconciliation.json
git -C /Users/pengjinhao/Documents/AiPlace diff --cached --check
git -C /Users/pengjinhao/Documents/AiPlace commit -m "content: reconcile complete website media"
```

Expected: commit contains only the test and two evidence files.

### Task 5: 完整本地验收

**Files:**
- Create: `AiPlace/暑期网站/docs/maintenance/2026-08-24-release-verification.md`
- Inspect: `AiPlace/暑期网站/README.md`
- Inspect: `AiPlace/暑期网站/docs/release-checklist.md`
- Inspect: project LICENSE/CHANGELOG/TODO candidates

- [ ] **Step 1: 运行完整自动验证**

Run from `AiPlace/暑期网站/`:

```bash
npm run test:run
npm run lint
npm run build
npm run check:content
npm run check:map
npm run check:media
npm run test:e2e
npm run verify:release
```

Expected: every command exits 0; unit and E2E output contains zero failed tests. The existing build chunk-size warning may be recorded but is not converted into a false pass/fail criterion.

- [ ] **Step 2: 检查发布文档**

Confirm README describes the current project root and media behavior. Search for LICENSE, CHANGELOG and TODO/ROADMAP files. Do not invent a license or create optional documents without user instruction; record their absence in the verification report.

- [ ] **Step 3: 写入真实验收结果**

Create `docs/maintenance/2026-08-24-release-verification.md` with exact command, exit code, test counts, build output sizes, current commit SHA, remaining performance caveat, and explicit statements that CloudBase upload/deployment were not performed unless separately authorized.

- [ ] **Step 4: 提交验收记录和必要文档更新**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace add -- 暑期网站/docs/maintenance/2026-08-24-release-verification.md 暑期网站/README.md 暑期网站/docs/release-checklist.md
git -C /Users/pengjinhao/Documents/AiPlace diff --cached --name-status
git -C /Users/pengjinhao/Documents/AiPlace diff --cached --check
git -C /Users/pengjinhao/Documents/AiPlace commit -m "docs: record website release verification"
```

Expected: only files actually changed are staged; unchanged README/checklist paths are omitted automatically by Git.

### Task 6: 配置和验证独立 GitHub 远程

**Files:**
- Modify: parent repository local Git configuration only

- [ ] **Step 1: 获取远程仓库而不修改工作树**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace remote add red-footprint https://github.com/PengjinHao-cell/red-footprint-website.git
git -C /Users/pengjinhao/Documents/AiPlace fetch red-footprint main
```

Expected: `red-footprint/main` resolves successfully. If the remote already exists, verify its URL exactly and use it without replacement.

- [ ] **Step 2: 创建 subtree 导出提交**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace subtree split --prefix=暑期网站 -b codex/red-footprint-subtree-release
```

Expected: a local export branch is created; parent working tree remains unchanged.

- [ ] **Step 3: 检查导出根目录和敏感文件**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace ls-tree --name-only codex/red-footprint-subtree-release
git -C /Users/pengjinhao/Documents/AiPlace grep -n -I -E '(SECRET|PRIVATE.KEY|TENCENTCLOUD_SECRET|API_KEY=)' codex/red-footprint-subtree-release -- . ':!package-lock.json'
```

Expected: root directly contains `package.json`, `src`, `content`, `docs`; it does not contain `AiPlace`, `暑期网站`, `暑期红色网站`, or sibling projects. Secret scan returns no credential values.

- [ ] **Step 4: 验证普通推送可快进**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace merge-base --is-ancestor red-footprint/main codex/red-footprint-subtree-release
```

Expected: exit 0. If it exits nonzero, stop; compare remote history and establish the correct prior subtree lineage. Do not force-push.

### Task 7: 推送并等待 GitHub Actions

**Files:**
- No working-tree files modified

- [ ] **Step 1: 普通推送 subtree 分支到独立仓库 main**

Run:

```bash
git -C /Users/pengjinhao/Documents/AiPlace push red-footprint codex/red-footprint-subtree-release:main
```

Expected: normal push succeeds without `--force`; record remote commit SHA.

- [ ] **Step 2: 等待对应提交的 GitHub Actions**

Run:

```bash
release_commit_sha="$(git -C /Users/pengjinhao/Documents/AiPlace rev-parse codex/red-footprint-subtree-release)"
gh run list --repo PengjinHao-cell/red-footprint-website --commit "$release_commit_sha"
release_run_id="$(gh run list --repo PengjinHao-cell/red-footprint-website --commit "$release_commit_sha" --json databaseId --jq '.[0].databaseId')"
gh run watch "$release_run_id" --repo PengjinHao-cell/red-footprint-website --exit-status
```

Expected: all required workflows finish with success. On failure, inspect logs, reproduce locally, and start a new RED-GREEN fix cycle before another push.

### Task 8: 检查 CloudBase 自动构建并停在部署授权点

**Files:**
- Update after observation: `AiPlace/暑期网站/docs/maintenance/2026-08-24-release-verification.md`

- [ ] **Step 1: 只读记录 `footprint` 当前版本**

Use the available CloudBase environment inspection capability to resolve the existing environment and inspect the `footprint` service versions. Record version ID, source commit, creation time and status without changing configuration.

Expected: either a new version corresponding to the exact SHA from `git rev-parse codex/red-footprint-subtree-release` exists, or the latest version remains `footprint-002`/the previously successful version.

- [ ] **Step 2: 根据结果选择唯一合法分支**

If a new automatic build exists, wait for it to finish and report its status. If no new build exists, stop and ask the user for separate permission to perform `footprint → 更新服务 → 部署` with the existing configuration unchanged.

- [ ] **Step 3: 补充只读检查记录**

Update the verification document with the observed GitHub Actions result and CloudBase version state. If this creates a new local commit after the first push, repeat Tasks 5–7 for that documentation-only commit; do not deploy as part of the documentation update.
