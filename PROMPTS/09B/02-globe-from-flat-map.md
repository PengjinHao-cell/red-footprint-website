# 09B Task 02 — 平面标准地图生成三维地球

## 实施提示词

```text
在当前 main 仅执行 PLAN/09B-production-content-and-cloudbase.md Task 2。禁止子代理、多代理或委派；不 amend、不 push、不上传、不部署。先完整阅读新版设计与 Task 2，只修改其允许文件。

保留三维地球、红心和飞行动画，以 docs/compliance/maps 中 GS(2023)2762号官方平面地图为视觉校准依据，生成/整理球面可用的中国地图资源。不要把带标题、图例和空白的整张 JPG 直接贴球。将 check:map 改为来源、摘要、几何、八点位和人工视觉完整性检查，删除新审图、签字和 publicUseAllowed 阻断，但不得声称三维资源取得新审图批准。严格 TDD；完成四视口对照、降级列表和 reduced-motion 回归。所有指定命令必须退出 0，只创建 Task 2 独立本地提交。
```

## 验收提示词

```text
验收新版 09B Task 2。禁止子代理和任何修改。独立检查球面资源确以官方平面图作校准依据、原图未被覆盖、无整图粗暴包球、地图来源与摘要完整、八点位正确、Globe 飞行/降级/reduced-motion 未退化。复跑 Task 2 定向测试、check:map、lint、全量测试、build、E2E，并检查四视口截图。通过时给出 PROMPTS/09B/03-production-content.md；不通过时按资源、代码、点位或视觉问题生成修复提示词。
```

## 通过后

打开 `PROMPTS/09B/03-production-content.md`。

## 未通过时的修复提示词

```text
仅修复新版 09B Task 2，不使用子代理，不 amend、不 push。验收问题：
【粘贴验收问题】
先补失败测试或视觉复现，再最小修复球面数据、检查器或 Globe 接入。不得恢复审图阻断，也不得删除地图技术检查。完整复验并新建独立修复提交。
```
