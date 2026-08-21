# 09B Task 05 — Schema、sites.json 与应用接入

## 实施提示词

```text
仅执行新版 PLAN/09B-production-content-and-cloudbase.md Task 5。禁止子代理、委派、amend、push、云写和部署。严格 TDD 扩展生产 schema，从 Task 3/4 审核输入确定性生成八馆 sites.json，并让生产入口加载真实数据而非测试 fixture。

保持 GCJ-02、一大双地址、八馆唯一性、视频首项、1–5 照片、来源/审核和 HTTPS 规则。连续生成两次必须字节一致。check:content 与新版技术型 check:map 均应通过；lint、全量测试、build、E2E 也全部通过。只建 Task 5 独立本地提交。
```

## 验收提示词

```text
验收新版 09B Task 5，禁止子代理和修改。独立重生成两次，核对八馆字段、坐标、来源、媒体顺序、无 fixture/占位 URL，并走完整本地应用旅程。复跑 check:content、check:map、lint、测试、build、E2E。通过时给出 PROMPTS/09B/06-cloudbase-media-upload.md；不通过时生成精确修复提示词。
```

## 通过后

打开 `PROMPTS/09B/06-cloudbase-media-upload.md`。下一阶段仍需单独上传授权。

## 未通过时的修复提示词

```text
仅修复新版 09B Task 5，不使用子代理，不 amend、不 push、不云写。验收问题：
【粘贴验收问题】
优先修审核输入或生成器，禁止直接手改 sites.json 掩盖问题。补回归测试并完整复验，新建独立修复提交。
```
