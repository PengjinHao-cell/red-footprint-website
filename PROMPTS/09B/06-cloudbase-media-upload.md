# 09B Task 06 — CloudBase 媒体上传与对账

## 实施提示词

```text
仅执行新版 PLAN/09B-production-content-and-cloudbase.md Task 6。禁止子代理、委派、amend、push、删除对象、覆盖对象、改权限、建数据库/函数/容器或部署。

先只读核对环境 red-footprint-preview-d5322636bd 和媒体 manifest，并向用户报告对象数、总大小与目标前缀。若本次没有明确上传授权，必须停止；本提示词不构成授权。获权后只新增 v1 版本对象，上传后只读对账路径、大小、MIME、摘要和真实 HTTPS/CDN URL，再由生成器更新 sites.json。复跑 Task 6 全套验证并只提交本地 manifest/对账/生成数据，不提交大媒体。
```

## 验收提示词

```text
验收新版 09B Task 6。禁止子代理、修改和云写。确认存在本次上传明确授权；使用 CloudBase 只读工具将远端对象与本地 manifest 逐项对账，并实际检查图片、Range 视频和 VTT。核对无覆盖、删除、权限修改或其他云资源。复跑全部本地验证。通过时给出 PROMPTS/09B/07-build-deploy-qa.md；不通过时区分本地修复和需重新申请云写授权的动作。
```

## 通过后

打开 `PROMPTS/09B/07-build-deploy-qa.md`。

## 未通过时的修复提示词

```text
修复新版 09B Task 6，禁止子代理，不 amend、不 push。验收问题：
【粘贴验收问题】
先判断是否涉及新的上传、覆盖、删除或权限修改；涉及云写必须重新请求明确授权。纯本地问题最小修复、完整复验并新建独立修复提交。
```
