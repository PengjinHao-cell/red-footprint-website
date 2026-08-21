# 09B Task 04 — 一次性整理生产媒体

## 实施提示词

```text
仅执行新版 PLAN/09B-production-content-and-cloudbase.md Task 4。禁止子代理、委派、amend、push、上传和部署。固定已确认的 28 图顺序、8 Hero、8 video、8 poster、8 VTT，不重新预选。保留渡江“77周年”Hero、梅园临时牌匾 Hero 和三个获准的 AI 水印封面。

严格 TDD 建立统一媒体处理与校验：图片不拉伸、视频 H.264/AAC/faststart、VTT 对照真实语音、manifest 含版本路径/MIME/尺寸/大小/SHA-256。不得覆盖源素材；处理输出只进被忽略的 staging，大媒体不提交。运行 Task 4 全部命令并只建独立本地提交。
```

## 验收提示词

```text
验收新版 09B Task 4，禁止子代理、修改和上传。独立核对 28 图顺序与八套媒体，使用图像工具、ffprobe 和摘要检查格式、比例、faststart、音轨、大小、字幕时间轴及 staging/提交边界。复跑全部验证。通过时给出 PROMPTS/09B/05-production-sites.md；不通过时逐对象生成修复提示词。
```

## 通过后

打开 `PROMPTS/09B/05-production-sites.md`。

## 未通过时的修复提示词

```text
仅修复新版 09B Task 4，不使用子代理，不 amend、不 push、不上传。验收问题：
【粘贴验收问题】
先用实际文件复现，再修脚本、参数、字幕或 manifest；禁止改写源素材和已确认的选择。完整复验并新建独立修复提交。
```
