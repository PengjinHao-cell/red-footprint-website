# Plan 07 — 景点详情、头图、画廊与视频

> 建议分支：`codex/07-site-detail-media`  
> 前置依赖：Plan 02、03  
> 可并行：可与 Plan 06 并行

## 目标

实现手机近全屏、电脑侧边式详情面板。每个景点使用实拍图作为名称背景，并展示基础信息、历史、人物、精神、画廊、视频和来源。

## 文件

- 创建：`src/components/detail/SiteDetailPanel.tsx`
- 创建：`src/components/detail/SiteDetailPanel.test.tsx`
- 创建：`src/components/detail/SiteHero.tsx`
- 创建：`src/components/detail/PhotoGallery.tsx`
- 创建：`src/components/detail/VideoPlayer.tsx`
- 创建：`src/components/detail/detail.css`
- 创建：`src/lib/media.ts`

## 执行步骤

- [ ] 写失败测试：头图焦点、标题遮罩、空模块隐藏、3–5图、字幕轨、Escape关闭。
- [ ] 实现带焦点锁定和关闭后焦点恢复的对话框。
- [ ] 手机头图约4:5，使用 `heroFocus` 控制 `object-position`。
- [ ] 标题置于头图底部砖红渐变上。
- [ ] 画廊图片懒加载，支持全屏与左右滑动。
- [ ] 视频使用封面，详情打开后只预载 metadata，用户播放时才请求正文。
- [ ] 添加 `<track kind="captions">` 并支持播放失败重试。

## 验证

```bash
npm run test:run -- src/components/detail/SiteDetailPanel.test.tsx
npm run build
```

## 完成标准

- 9:16图片不被压扁。
- 视频未播放前不下载完整文件。
- 键盘、触控和屏幕阅读器均可关闭详情。

