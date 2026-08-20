# Plan 07A — 统一媒体轮播实施计划

> **执行约束：** 禁止使用子代理、并行代理或委派其他代理。执行时必须由当前任务使用 `executing-plans` 串行完成，并在每个任务后检查结果。

**目标：** 将景点详情中分离的视频和照片画廊改为“视频固定首项、后接一至五张照片”的统一媒体轮播。

**架构：** `Site` 数据仍分别保存 `video` 与 `photos`，`src/lib/media.ts` 负责生成带判别字段的统一媒体序列。`MediaCarousel` 只管理当前索引、手势、键盘和播放锁定；`VideoPlayer` 只管理视频生命周期；`SiteDetailPanel` 负责对话框、正文顺序和焦点恢复。

**技术栈：** React 19、TypeScript、Vitest、Testing Library、原生 Pointer Events、HTML5 Video、CSS Scroll/Transform。

**前置条件：** Plan 01–03 已完成；开始 UI 任务前完成本计划 Task 1 对 Plan 03 的修订。

---

## 文件职责

- 修改 `src/data/siteSchema.ts`：将照片改为带替代文本的对象，并限制为一至五张。
- 修改 `src/data/loadSites.test.ts`：证明一张有效、零张和六张无效。
- 修改 `src/test/fixtures/sites.ts`：将合成照片迁移为 `{ src, alt }`。
- 修改 `docs/content-intake.md`：同步素材数量、预选和统一顺序。
- 创建 `src/lib/media.ts`：把 `Site` 的视频和照片映射为判别联合数组。
- 创建 `src/lib/media.test.ts`：验证视频首项、图片顺序和替代文本。
- 创建 `src/components/detail/VideoPlayer.tsx`：封面、字幕、播放状态和失败重试。
- 创建 `src/components/detail/VideoPlayer.test.tsx`：验证播放回调、字幕轨和重试。
- 创建 `src/components/detail/MediaCarousel.tsx`：统一轮播、输入方式、非循环和播放锁定。
- 创建 `src/components/detail/MediaCarousel.test.tsx`：验证按钮、键盘、播放锁定和边界。
- 创建 `src/components/detail/SiteHero.tsx`：景点头图、焦点和标题遮罩。
- 创建 `src/components/detail/SiteDetailPanel.tsx`：详情对话框、媒体优先、正文和关闭逻辑。
- 创建 `src/components/detail/SiteDetailPanel.test.tsx`：验证顺序、焦点与缺失模块。
- 创建 `src/components/detail/detail.css`：手机、平板、桌面和减少动态效果样式。
- 创建 `docs/media-selection.md`：记录超过五张地点的预选结果和人工复核状态。

---

### Task 1：修订已完成的 Plan 03 内容模型

**文件：**

- 修改：`src/data/siteSchema.ts`
- 修改：`src/data/loadSites.test.ts`
- 修改：`src/test/fixtures/sites.ts`
- 修改：`docs/content-intake.md`

- [ ] **Step 1：先把旧测试改成一张照片应通过**

在 `src/data/loadSites.test.ts` 中将“少于三张失败”替换为：

```ts
it('accepts a site containing one selected photo', () => {
  const sites = createValidEightSites();
  sites[0] = { ...sites[0], photos: sites[0].photos.slice(0, 1) };

  expect(loadSites(sites)).toHaveLength(8);
});

it('rejects a site containing no selected photos', () => {
  const sites = createValidEightSites();
  sites[0] = { ...sites[0], photos: [] };

  expect(() => loadSites(sites)).toThrow();
});
```

- [ ] **Step 2：运行测试确认 RED**

运行：

```bash
npm run test:run -- src/data/loadSites.test.ts
```

预期：一张照片的记录被当前 `.min(3)` 拒绝，至少一项测试失败。

- [ ] **Step 3：修改最小 Schema**

将 `src/data/siteSchema.ts` 中照片约束改为：

```ts
photos: z
  .array(
    z.object({
      src: z.string().min(1),
      alt: z.string().min(4),
    }),
  )
  .min(1)
  .max(5),
```

同时将 `src/test/fixtures/sites.ts` 的合成照片改为：

```ts
photos: [
  {
    src: `/synthetic/site-${sequence}/photo-01.jpg`,
    alt: `合成地点${sequence}的测试照片一`,
  },
  {
    src: `/synthetic/site-${sequence}/photo-02.jpg`,
    alt: `合成地点${sequence}的测试照片二`,
  },
  {
    src: `/synthetic/site-${sequence}/photo-03.jpg`,
    alt: `合成地点${sequence}的测试照片三`,
  },
],
```

- [ ] **Step 4：运行定向与全量验证**

```bash
npm run test:run -- src/data/loadSites.test.ts
npm run lint
npm run test:run
npm run build
```

预期：定向测试包含“一张通过、零张失败、六张失败”，全部命令退出码为 0。

- [ ] **Step 5：同步内容交付规范**

在 `docs/content-intake.md` 中明确：

```markdown
- 每处交付一至五张入选照片；原始照片超过五张时另附预选清单，原图不得删除。
- 页面媒体顺序固定为讲解视频、照片 01、照片 02……。
- 图片替代文本描述可见主体；涉及人物与史实的描述须人工核验。
```

- [ ] **Step 6：提交 Plan 03 修订**

```bash
git add src/data/siteSchema.ts src/data/loadSites.test.ts src/test/fixtures/sites.ts docs/content-intake.md
git commit -m "fix: allow one to five site photos"
```

---

### Task 2：建立统一媒体序列转换器

**文件：**

- 创建：`src/lib/media.ts`
- 创建：`src/lib/media.test.ts`

- [ ] **Step 1：编写失败测试**

```ts
import { describe, expect, it } from 'vitest';

import { createValidEightSites } from '../test/fixtures/sites';
import { buildMediaItems } from './media';

describe('buildMediaItems', () => {
  it('places the only video before every selected photo', () => {
    const site = createValidEightSites()[0];
    const items = buildMediaItems(site);

    expect(items.map((item) => item.type)).toEqual([
      'video',
      'image',
      'image',
      'image',
    ]);
    expect(items[0]).toMatchObject({
      type: 'video',
      src: site.video.url,
      poster: site.video.poster,
      captions: site.video.captions,
    });
  });

  it('preserves photo order and reviewed alt text', () => {
    const site = createValidEightSites()[0];
    const items = buildMediaItems(site);

    expect(items[1]).toEqual({
      type: 'image',
      src: site.photos[0].src,
      alt: site.photos[0].alt,
    });
  });
});
```

- [ ] **Step 2：运行并确认模块不存在导致 RED**

```bash
npm run test:run -- src/lib/media.test.ts
```

- [ ] **Step 3：实现判别联合和转换函数**

```ts
import type { Site } from '../data/siteSchema';

export type VideoMediaItem = {
  type: 'video';
  src: string;
  poster: string;
  captions: string;
};

export type ImageMediaItem = {
  type: 'image';
  src: string;
  alt: string;
};

export type MediaItem = VideoMediaItem | ImageMediaItem;

export function buildMediaItems(site: Site): MediaItem[] {
  return [
    {
      type: 'video',
      src: site.video.url,
      poster: site.video.poster,
      captions: site.video.captions,
    },
    ...site.photos.map((photo) => ({
      type: 'image' as const,
      src: photo.src,
      alt: photo.alt,
    })),
  ];
}
```

- [ ] **Step 4：运行测试与提交**

```bash
npm run test:run -- src/lib/media.test.ts
git add src/lib/media.ts src/lib/media.test.ts
git commit -m "feat: build ordered site media items"
```

---

### Task 3：实现可独立测试的视频播放器

**文件：**

- 创建：`src/components/detail/VideoPlayer.tsx`
- 创建：`src/components/detail/VideoPlayer.test.tsx`

- [ ] **Step 1：编写播放器失败测试**

测试必须验证：`preload="metadata"`、字幕轨、播放与暂停回调、失败提示和重新加载按钮。使用：

```tsx
render(
  <VideoPlayer
    src="https://media.invalid/site.mp4"
    poster="/poster.webp"
    captions="/captions.vtt"
    onPlayingChange={onPlayingChange}
  />,
);

const video = screen.getByLabelText('景点讲解视频');
expect(video).toHaveAttribute('preload', 'metadata');
expect(video.querySelector('track')).toHaveAttribute('kind', 'captions');

fireEvent.play(video);
expect(onPlayingChange).toHaveBeenLastCalledWith(true);

fireEvent.pause(video);
expect(onPlayingChange).toHaveBeenLastCalledWith(false);
```

- [ ] **Step 2：运行并确认 RED**

```bash
npm run test:run -- src/components/detail/VideoPlayer.test.tsx
```

- [ ] **Step 3：实现组件接口**

```ts
type VideoPlayerProps = {
  src: string;
  poster: string;
  captions: string;
  onPlayingChange: (playing: boolean) => void;
};
```

组件必须：

- 渲染带 `controls`、`playsInline`、`preload="metadata"` 的 `<video>`；
- 渲染 `<track kind="captions" srcLang="zh-CN" label="中文字幕" default>`；
- 在 `play`、`pause`、`ended` 和 `error` 时更新外部播放状态；
- 错误时保留播放器区域并显示“视频加载失败”和“重新加载”；
- 重新加载按钮调用 `video.load()`，并清除错误状态。
- 组件卸载时调用 `video.pause()` 和 `onPlayingChange(false)`，保证切页或关闭详情后无残留声音。

- [ ] **Step 4：运行测试与提交**

```bash
npm run test:run -- src/components/detail/VideoPlayer.test.tsx
git add src/components/detail/VideoPlayer.tsx src/components/detail/VideoPlayer.test.tsx
git commit -m "feat: add accessible site video player"
```

---

### Task 4：实现统一媒体轮播核心

**文件：**

- 创建：`src/components/detail/MediaCarousel.tsx`
- 创建：`src/components/detail/MediaCarousel.test.tsx`

- [ ] **Step 1：编写轮播失败测试**

覆盖以下可观察行为：

```tsx
expect(screen.getByText('视频 · 1 / 3')).toBeVisible();
expect(screen.getByText('左滑查看寻访照片')).toBeVisible();

fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));
expect(screen.getByText('照片 · 2 / 3')).toBeVisible();

fireEvent.keyDown(screen.getByRole('region', { name: '景点媒体' }), {
  key: 'ArrowRight',
});
expect(screen.getByText('照片 · 3 / 3')).toBeVisible();

fireEvent.click(screen.getByRole('button', { name: '下一项媒体' }));
expect(screen.getByText('照片 · 3 / 3')).toBeVisible();
```

另写测试模拟视频 `play` 后，确认“下一项媒体”禁用；模拟 `pause` 后恢复。

- [ ] **Step 2：运行并确认 RED**

```bash
npm run test:run -- src/components/detail/MediaCarousel.test.tsx
```

- [ ] **Step 3：实现状态边界**

```ts
type MediaCarouselProps = {
  items: MediaItem[];
};

const [activeIndex, setActiveIndex] = useState(0);
const [videoPlaying, setVideoPlaying] = useState(false);

const canGoPrevious = !videoPlaying && activeIndex > 0;
const canGoNext = !videoPlaying && activeIndex < items.length - 1;
```

实现要求：

- 不使用自动轮播；
- 不使用循环索引；
- 页面类型文本由当前项判别字段生成；
- 页码与媒体类型使用 `aria-live="polite"`，只在实际换页后更新；
- 第一次成功切换后隐藏滑动提示；
- 图片使用 `loading="lazy"`、`decoding="async"` 和 `object-fit: contain`；
- 只有当前视频项渲染 `VideoPlayer`，切走时组件卸载并停止声音。

在当前索引变化时只预取相邻图片：

```ts
useEffect(() => {
  [items[activeIndex - 1], items[activeIndex + 1]].forEach((item) => {
    if (item?.type === 'image') {
      const image = new Image();
      image.src = item.src;
    }
  });
}, [activeIndex, items]);
```

- [ ] **Step 4：实现 Pointer Events 手势**

记录 `pointerdown` 起点和 `pointerup` 终点。只有同时满足下列条件才换页：

```ts
const horizontalDistance = endX - startX;
const verticalDistance = endY - startY;
const isHorizontalGesture =
  Math.abs(horizontalDistance) >= 48 &&
  Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.25;
```

距离屏幕左右边缘 24px 内开始的手势不调用 `preventDefault()`，为系统返回手势让路。视频播放时直接忽略横向切换。

- [ ] **Step 5：运行测试与提交**

```bash
npm run test:run -- src/components/detail/MediaCarousel.test.tsx
git add src/components/detail/MediaCarousel.tsx src/components/detail/MediaCarousel.test.tsx
git commit -m "feat: add unified media carousel"
```

---

### Task 5：实现媒体优先的景点详情面板

**文件：**

- 创建：`src/components/detail/SiteHero.tsx`
- 创建：`src/components/detail/SiteDetailPanel.tsx`
- 创建：`src/components/detail/SiteDetailPanel.test.tsx`

- [ ] **Step 1：编写失败测试**

测试以下顺序与对话框行为：

```tsx
const dialog = screen.getByRole('dialog', { name: site.officialName });
const media = within(dialog).getByRole('region', { name: '景点媒体' });
const history = within(dialog).getByRole('heading', { name: '历史印记' });

expect(
  media.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING,
).toBeTruthy();

fireEvent.keyDown(dialog, { key: 'Escape' });
expect(onClose).toHaveBeenCalledTimes(1);
```

另外测试关闭后焦点恢复到传入的触发元素，空正文模块不渲染空标题。

- [ ] **Step 2：运行并确认 RED**

```bash
npm run test:run -- src/components/detail/SiteDetailPanel.test.tsx
```

- [ ] **Step 3：实现组件边界**

```ts
type SiteDetailPanelProps = {
  site: Site;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
};
```

`SiteDetailPanel` 调用 `buildMediaItems(site)`，结构顺序固定为：`SiteHero`、`MediaCarousel`、基础信息、历史、人物、精神、感悟、来源。使用 `role="dialog"`、`aria-modal="true"` 和可访问名称。关闭和卸载时恢复焦点。

- [ ] **Step 4：运行测试与提交**

```bash
npm run test:run -- src/components/detail/SiteDetailPanel.test.tsx
git add src/components/detail/SiteHero.tsx src/components/detail/SiteDetailPanel.tsx src/components/detail/SiteDetailPanel.test.tsx
git commit -m "feat: add media-first site detail panel"
```

---

### Task 6：实现响应式视觉和减少动态效果

**文件：**

- 创建：`src/components/detail/detail.css`
- 修改：`src/components/detail/SiteDetailPanel.tsx`

- [ ] **Step 1：接入样式并实现手机布局**

必须包含以下关键规则：

```css
.media-carousel__viewport {
  aspect-ratio: 4 / 5;
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
  background: var(--brick-dark);
}

.media-carousel__image,
.media-carousel__video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.media-carousel__control {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
}
```

- [ ] **Step 2：实现电脑布局**

在 `min-width: 64rem` 时扩大详情宽度和媒体区域，显示左右箭头；不得把竖图拉伸成横图。正文最大行宽保持可读，不超过约 72 个中文字符。

- [ ] **Step 3：实现减少动态效果**

```css
@media (prefers-reduced-motion: reduce) {
  .media-carousel__track {
    transition: none;
  }
}
```

- [ ] **Step 4：运行验证与提交**

```bash
npm run lint
npm run test:run
npm run build
git add src/components/detail/detail.css src/components/detail/SiteDetailPanel.tsx
git commit -m "style: add responsive media detail layout"
```

---

### Task 7：建立真实素材预选清单

**文件：**

- 创建：`docs/media-selection.md`
- 不修改：`Videos/` 内任何原始文件

- [ ] **Step 1：按景点清点视频、封面和照片**

清单记录原路径、文件大小、像素尺寸、横竖方向和是否入选。不得将 ZIP 内重复内容计入第二份素材。

- [ ] **Step 2：对超过五张的地点进行视觉预选**

四行仓库、一大会址、渡江胜利纪念馆和梅园新村需要预选。每处最多五张，至少覆盖：可识别外观、现场实践、展陈或史料、不同构图。视觉模型不得单独判定人物身份或历史含义。

- [ ] **Step 3：记录少照片地点**

淮北使用现有两张，江上青和扬州分别使用现有一张；不再把少于三张标为构建失败。

- [ ] **Step 4：记录扬州视频现状**

写明当前文件：

```text
Videos/扬州革命烈士陵园/8月20日.mp4
当前大小：约 101MB
状态：需检查 H.264、AAC、faststart、首帧等待和弱网播放
```

- [ ] **Step 5：由用户或甲方复核清单后提交**

```bash
git add docs/media-selection.md
git commit -m "docs: record selected site media"
```

注意：只提交清单，不提交 `Videos/`、ZIP 或大视频。

---

### Task 8：集成验证与视觉验收

**文件：**

- 修改测试文件仅限修正集成中发现的真实遗漏
- 不提前修改 `App.tsx`；应用状态机接入仍属于 Plan 08

- [ ] **Step 1：运行全部自动验证**

```bash
npm run lint
npm run test:run
npm run build
git diff --check
```

预期：全部退出码为 0，无跳过测试和未处理警告。

- [ ] **Step 2：进行四视口人工检查**

- 390×844：媒体横滑不触发正文上下跳动；关闭按钮可见。
- 768×1024：横竖图片均完整，页码清晰。
- 1366×768：左右箭头可见，正文不过宽。
- 1920×1080：投屏文字与媒体比例合理。

- [ ] **Step 3：人工检查关键状态**

- 视频播放时无法左右切换；暂停后恢复。
- 切离视频或关闭详情后没有声音。
- 最后一张不会循环。
- 图片失败和视频失败不会阻止正文阅读。
- `prefers-reduced-motion` 下无惯性和装饰性切换。

- [ ] **Step 4：确认提交边界**

```bash
git status --short
git diff --name-only HEAD
```

不得暂存 `Videos/`、`.superpowers/`、DOCX、ZIP、源照片或其他用户文件。

- [ ] **Step 5：提交最终集成修正（仅在确有修正时）**

```bash
git add src docs/media-selection.md
git commit -m "test: verify unified media experience"
```

如果没有额外修改，不创建空提交。

---

## 完成标准

- 数据模型接受一至五张照片并拒绝零张和六张。
- 每处媒体序列恰好一条视频，且视频始终排第一。
- 手机、鼠标、箭头和键盘均可操作，最后一项不循环。
- 视频播放期间轮播锁定，暂停后恢复，离开后无残留声音。
- 图片不拉伸、不错误裁切，失败时存在占位反馈。
- 详情首屏先媒体、后正文，关闭与焦点恢复可访问。
- 真实素材预选清单经过人工复核，原始素材保持不变。
- 自动验证与四视口人工检查均留下实际结果。
