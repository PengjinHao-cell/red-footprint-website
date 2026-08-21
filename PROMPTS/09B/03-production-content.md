# 09B Task 03 — 八馆来源与正式正文

## 实施提示词

```text
仅执行新版 PLAN/09B-production-content-and-cloudbase.md Task 3。禁止子代理、委派、amend、push、云写和部署。读取八馆 DOC/DOCX 作线索，使用场馆官网、政府、文旅等权威页面核实正式名称、地址、开放时间、预约、参观提示、历史、人物、年代和展品含义；不得编造 URL 或把候选文稿直接当权威事实。

一次性建立八馆来源、正式正文和审核记录；事实与寻访感悟分开，一大 markerAddress/参观 address 保持双口径。严格 TDD 实现离线 check:production-content。定向、lint、全量测试、build 和 diff 均通过后，只建 Task 3 独立本地提交，并报告每馆来源覆盖与无法核实项。
```

## 验收提示词

```text
验收新版 09B Task 3，禁止子代理和修改。独立抽查每项事实对应的官方链接是否真实支持该字段，检查八馆完整、时效日期、事实/感悟区分和一大双地址。复跑全部验证。通过时给出 PROMPTS/09B/04-production-media.md；不通过时按馆、字段、来源生成修复提示词。
```

## 通过后

打开 `PROMPTS/09B/04-production-media.md`。

## 未通过时的修复提示词

```text
仅修复新版 09B Task 3，不使用子代理，不 amend、不 push。验收问题：
【粘贴验收问题】
逐项重新核实权威来源；无法证实的内容删去或改写，不得猜测。补测试、完整复验并新建独立修复提交。
```
