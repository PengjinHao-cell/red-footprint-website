# 09B Task 01 — CloudBase 只读环境盘点

## 实施提示词

```text
在 /Users/pengjinhao/Documents/AiPlace/暑期网站 的当前 main 上，仅执行 PLAN/09B-production-content-and-cloudbase.md 的 Task 1。先完整阅读 Task 1 和通用边界。禁止使用子代理、多代理或委派；禁止 amend、push、部署和任何云端写操作。

通过 CloudBase MCP 只读核验环境 red-footprint-preview-d5322636bd，按计划创建环境盘点、离线校验器和测试，并仅修改 Task 1 允许的文件。严格 TDD，记录 RED/GREEN。不得调用数据库、云函数、云托管或修改存储权限。完成定向验证、lint、全量测试、build、diff 检查；check:map 应继续因 blocked 退出 1。只创建 Task 1 指定的独立本地提交。交付文件范围、只读证据、命令退出码、提交 SHA、遗留风险和保留文件。
```

## 验收提示词

```text
你是 09B Task 1 验收官。禁止使用子代理，禁止修改文件、amend、push 或调用任何云端写工具。完整阅读 PLAN/09B-production-content-and-cloudbase.md 的 Task 1，独立检查最新提交范围、环境 ID、只读证据、无数据库/函数/容器使用、离线校验和 TDD 记录，并复跑计划要求的验证。通过则明确写“Task 1 验收通过”，并给出 PROMPTS/09B/02-globe-from-flat-map.md 的实施提示词；不通过则逐条给出文件/行号/证据和可直接执行的修复提示词。
```

## 通过后

打开 `PROMPTS/09B/02-globe-from-flat-map.md`。

## 未通过时的修复提示词

```text
修复 09B Task 1，禁止使用子代理，不 amend、不 push，不扩大到 Task 2。以下是验收问题原文：
【粘贴验收问题】
先复现每项问题，再仅在 Task 1 允许文件内做最小修复，复跑 Task 1 全部验证。创建新的独立修复提交，不改写旧提交；报告问题到修复的逐项对应证据。
```
