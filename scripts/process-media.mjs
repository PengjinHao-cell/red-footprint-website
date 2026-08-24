import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STAGING_DIRECTORY = '.media-staging';

const photo = (sourcePath, alt) => ({ sourcePath, alt });

export const MEDIA_SITES = Object.freeze([
  {
    id: 'sihong-memorial',
    officialName: '淮北抗日民主根据地纪念馆',
    photos: [
      photo('Videos/淮北抗日民主根据地纪念馆/淮北抗日民主根据地纪念馆——主图/3c03b98426e9aa556df1cef466ad0040.jpg', '阴云下，一座顶部带红色造型和金色五角星的高大纪念碑立于广场中央。'),
      photo('Videos/淮北抗日民主根据地纪念馆/淮北抗日民主根据地纪念馆——主图/d80949c9af66a3f57ad72e22853f10ef.jpg', '展厅内四尊深色人物雕塑站在红色隔离带后，背景墙陈列图文展板。'),
    ],
    videoSourcePath: 'Videos/淮北抗日民主根据地纪念馆/淮北抗日民主根据地纪念馆——讲解视频/4f51357b0c07a79158a6a7c3374d6be7.mp4',
    poster: { generatedFromVideoAtSeconds: 1, aiWatermarkPresent: false },
    videoTarget: { width: 720, height: 1280 },
  },
  {
    id: 'yuhuatai-martyrs',
    officialName: '雨花台烈士陵园',
    photos: [
      photo('Videos/雨花台烈士陵园/雨花台烈士陵园——主图/74D4D7FB5C6BB0793B13925AD5C2963C.jpg', '灰色高塔式纪念碑前立有一尊深色人物雕塑，周围环绕树木与开阔广场。'),
      photo('Videos/雨花台烈士陵园/雨花台烈士陵园——主图/924F82A0F8E5DB7904C60FA0336C91B4.jpg', '宽阔石阶尽头立有一组多人石雕，背景是茂密树木。'),
      photo('Videos/雨花台烈士陵园/雨花台烈士陵园——主图/4DFE2B4D8020791F3015B4299271946D.jpg', '展厅墙面排列多幅黑白人物照片和说明牌，下方设有小型展柜。'),
      photo('Videos/雨花台烈士陵园/雨花台烈士陵园——主图/DF98EED3D190DED76C962EFE6916A34E.jpg', '室内展板上有金色标志、红色立体大字以及中英文说明文字。'),
      photo('Videos/雨花台烈士陵园/雨花台烈士陵园——主图/1EBA0805B98855C29BFADF9F8321D7E9.jpg', '红色墙面上方设有金色标志，下方排列多组金色文字。'),
    ],
    videoSourcePath: 'Videos/雨花台烈士陵园/雨花台烈士陵园——讲解视频/d625e606b1a45c2f891ec688bf8fc9a2.mp4',
    poster: { sourcePath: 'Videos/雨花台烈士陵园/雨花台烈士陵园——讲解视频/04F77A58224BDE6A5A165D9FC5346279.jpg', aiWatermarkPresent: true },
    videoTarget: { width: 720, height: 1280 },
  },
  {
    id: 'dujiang-victory',
    officialName: '渡江胜利纪念馆',
    photos: [
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141503_29_2.jpg', '蓝天下，红褐色纪念馆外墙写有金色馆名，参观者沿入口坡道行走。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141507_30_2.jpg', '广场上红色折面构筑物向上展开，旗杆立于中央，远处可见高层建筑。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141515_32_2.jpg', '玻璃展柜内分层陈列多件长短不一的深色枪械状展品。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141518_33_2.jpg', '玻璃展柜内陈列一件棕色长外套、带星形标记的帽子、黑白照片和皮质文件夹。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141544_39_2.jpg', '展柜内陈列浅色布衣、编织鞋、成卷织物和棕色挎包。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141511_31_2.jpg', '纪念馆入口前立有写有“77周年”字样的大型临时活动牌，建筑墙面被部分遮挡。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141535_37_2.jpg', '玻璃展柜内陈列多枚徽章样式展品，画面略有倾斜并带有灯光反射。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141548_40_2.jpg', '展柜内陈列文件、黑白照片、徽章和皮包等物品。'),
      photo('Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141551_41_2.jpg', '从低角度仰拍的纪念馆建筑外墙，天空占画面较大。'),
    ],
    videoSourcePath: 'Videos/渡江胜利纪念馆/渡江胜利纪念馆-讲解视频/68130e9a1397db41890ad3077dc221a9.mp4',
    poster: { sourcePath: 'Videos/渡江胜利纪念馆/渡江胜利纪念馆-讲解视频/微信图片_20260728145144_43_2.jpg', aiWatermarkPresent: false },
    videoTarget: { width: 720, height: 1280 },
  },
  {
    id: 'sihang-warehouse',
    officialName: '上海四行仓库抗战纪念馆',
    photos: [
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/9EF26D098E1D2FA84C519EC6F454DE91.jpg', '蓝天下布满孔洞与砖面缺损的灰色墙体，前方有参观者和纪念馆字样。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/4ECB6A313AA560EE64A3B7E7947A0857.jpg', '展厅内悬挂多份中外文报纸样式展品，前方陈列一台黑色机械装置。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/6AB4B76C9281A2C6920909439E78EBE8.jpg', '展墙由大量写有姓名、编制文字和“88D”标记的长方形牌块组成。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/7C1F7E832BB8EC9B5709C5F460DAA382.jpg', '两尊深色人物塑像俯身查看桌上地图，背景陈列报纸与说明牌。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/F5994272536B3D592203089A0252AFC8.jpg', '展陈场景中，多个人物模型在带有铆钉的金属门洞旁搬举挡板。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/22C2EBEB7427DA712395E2529ACCBCC4.jpg', '布满孔洞与缺损的灰色建筑墙面，上方天空占画面较大。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/50A2E5DB099B593999FF154990E2036B.jpg', '展厅内可见标识与大字展板，画面上方为天花板、下方留白较多。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/792F6DE441435DB4E8C0A74F4CF7D7EF.jpg', '报刊样式展墙前方陈列人物模型，画面带有倾斜与反光。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/A45087987CD3A073FFD3A70B9465B821.jpg', '建筑窗墙旁嵌有写有“四行仓库抗战旧址”字样的牌匾。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/CADEFAC7A46C805B8109C7983347811F.jpg', '展陈场景中，坐姿人物模型身旁放有步枪状道具与沙袋。'),
      photo('Videos/上海四行仓库抗战纪念馆/四行仓库照片/E20E5955EC8949D00687084F921C4AAF.jpg', '围桌而坐的人物雕塑群，近处立有提示牌，画面略显拥挤。'),
    ],
    videoSourcePath: 'Videos/上海四行仓库抗战纪念馆/四行仓库视频.mp4',
    poster: { sourcePath: 'Videos/上海四行仓库抗战纪念馆/四行仓库视频封面.png', aiWatermarkPresent: false },
    videoTarget: { width: 720, height: 1280 },
  },
  {
    id: 'cpc-first-congress',
    officialName: '中国共产党第一次全国代表大会纪念馆',
    photos: [
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/ECA3AFBE989DE42290CB2AE50A262154.jpg', '灰砖与红砖相间的建筑门面上，黑色双开门旁嵌有全国重点文物保护单位标志牌。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/76AA36EE38DA670EA5D515873288AB98.jpg', '两尊深色人物塑像并肩站立，其中一人举起右手，背景墙面投映有大字。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/8D70EF22FF390D14D390D0FA5035264D.jpg', '红色展柜前写有“主义的抉择”，背景悬挂多份报刊样式展品。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/EA6C78133FAB923B003D12F2CEBADA1C.jpg', '灯光照亮的城市沙盘前方铺展河道与建筑模型，后方墙面陈列多幅黑白图文。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/FB8B58D316E1DD035C88DBCB430F537F.jpg', '多尊人物塑像围坐桌旁，红色背景墙陈列人物画像与说明牌。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/302FF3BFDA9568D28541A2DC73EA5889.jpg', '现代纪念馆入口上方可见馆名，天空与前景占画面较大。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/3D85AF1A6350666A712A8A73B49C1D21.jpg', '历史砖楼入口处可见安保设施，前景略有杂物。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/99088B168FC361A1F3111715B4FE186E.jpg', '红色墙面上排列醒目文字，画面上方留白较多。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/DEC010531E62FD01B886524192815C51.jpg', '展柜内陈列建筑石构件样式的展品。'),
      photo('Videos/中国共产党第一次全国代表大会会址/一大会址照片/DEE40E7340271A1C9EF64AFBF5B0CE2D.jpg', '展厅墙面悬挂大型多人画作，画面中出现“星火”字样。'),
    ],
    videoSourcePath: 'Videos/中国共产党第一次全国代表大会会址/一大会址视频.mp4',
    poster: { sourcePath: 'Videos/中国共产党第一次全国代表大会会址/一大会址视频封面.png', aiWatermarkPresent: false },
    videoTarget: { width: 720, height: 1280 },
  },
  {
    id: 'jiangshangqing-memorial',
    officialName: '江上青烈士史料陈列馆',
    photos: [photo('Videos/江上青烈士史料陈列馆/江上青烈士史料陈列馆—竖版照片.jpg', '灰砖建筑入口上方悬挂写有馆名的红褐色木牌，门内可见楼梯。')],
    videoSourcePath: 'Videos/江上青烈士史料陈列馆/江上青烈士史料陈列馆—视频.mp4',
    poster: { sourcePath: 'Videos/江上青烈士史料陈列馆/江上青烈士史料陈列馆—视频封面.jpg', aiWatermarkPresent: true },
    videoTarget: { width: 720, height: 960 },
  },
  {
    id: 'yangzhou-martyrs',
    officialName: '扬州革命烈士陵园',
    photos: [photo('Videos/扬州革命烈士陵园/扬州革命烈士陵园—竖版照片.jpg', '门式构架中央立有多人群像雕塑和刻字纪念碑，后方是一座灰瓦建筑。')],
    videoSourcePath: 'Videos/扬州革命烈士陵园/8月20日.mp4',
    poster: { sourcePath: 'Videos/扬州革命烈士陵园/扬州革命烈士陵园—视频封面.jpg', aiWatermarkPresent: true },
    videoTarget: { width: 960, height: 720 },
  },
  {
    id: 'meiyuan-new-village',
    officialName: '中国共产党代表团梅园新村纪念馆',
    photos: [
      photo('Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片5.jpg', '树枝掩映的灰色旧墙上嵌有一块写有“中共代表团办事处原址”的黑色牌匾。'),
      photo('Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片2.jpg', '红色展墙上悬挂多幅黑白照片，下方玻璃展柜中陈列书籍样式展品。'),
      photo('Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片3.jpg', '玻璃展柜内陈列两件外套、黑白照片、箱子和餐具等物件。'),
      photo('Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片6.jpg', '一名参观者站在玻璃展柜前观看衣物、照片和箱子等展品。'),
      photo('Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 图片1.jpg', '展馆现场一名人物正面入镜，身后可见展墙与展柜。'),
      photo('Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片4.jpg', '展馆内参观者站在展柜前，右侧展墙被部分遮挡，上方留白较多。'),
    ],
    videoSourcePath: 'Videos/中国共产党代表团梅园新村纪念馆/讲解视频/梅园新村 讲解视频.mp4',
    poster: { generatedFromVideoAtSeconds: 1, aiWatermarkPresent: false },
    videoTarget: { width: 720, height: 960 },
  },
].map((site) => ({ ...site, heroSourcePath: site.photos[0].sourcePath, captionSourcePath: `content/media/captions/${site.id}.vtt` })));

function objectPaths(site) {
  const prefix = `media/sites/${site.id}/v1`;
  return {
    hero: `${prefix}/hero/${site.id}-hero.webp`,
    photos: site.photos.map((_, index) => `${prefix}/photos/${site.id}-photo-${String(index + 1).padStart(2, '0')}.webp`),
    video: `${prefix}/video/${site.id}-video.mp4`,
    poster: `${prefix}/poster/${site.id}-video-poster.webp`,
    captions: `${prefix}/captions/${site.id}-captions.vtt`,
  };
}

export function buildMediaPlan(root = process.cwd()) {
  void root;
  return MEDIA_SITES.flatMap((site) => {
    const paths = objectPaths(site);
    return [
      { siteId: site.id, kind: 'hero', sourcePath: site.heroSourcePath, objectPath: paths.hero },
      ...site.photos.map((item, index) => ({ siteId: site.id, kind: 'photo', sourcePath: item.sourcePath, objectPath: paths.photos[index] })),
      { siteId: site.id, kind: 'video', sourcePath: site.videoSourcePath, objectPath: paths.video },
      { siteId: site.id, kind: 'poster', sourcePath: site.poster.sourcePath ?? site.videoSourcePath, objectPath: paths.poster },
      { siteId: site.id, kind: 'captions', sourcePath: site.captionSourcePath, objectPath: paths.captions },
    ];
  });
}

export function resolveStagingPath(root, objectPath) {
  const normalized = normalize(objectPath);
  if (isAbsolute(objectPath) || normalized.startsWith(`..${sep}`) || !normalized.startsWith(`media${sep}sites${sep}`)) {
    throw new Error(`Output must remain inside ${STAGING_DIRECTORY} staging: ${objectPath}`);
  }
  const stagingRoot = resolve(root, STAGING_DIRECTORY);
  const output = resolve(stagingRoot, normalized);
  if (relative(stagingRoot, output).startsWith('..')) throw new Error(`Output escaped staging: ${objectPath}`);
  return output;
}

export function buildImageArguments(sourcePath, outputPath) {
  return ['-hide_banner', '-loglevel', 'error', '-y', '-autorotate', '-i', sourcePath, '-vf', 'scale=1920:1920:force_original_aspect_ratio=decrease', '-frames:v', '1', '-c:v', 'png', outputPath];
}

export function buildCwebpArguments(sourcePath, outputPath) {
  return ['-quiet', '-q', '82', '-m', '6', sourcePath, '-o', outputPath];
}

export function buildVideoArguments(site, sourcePath, outputPath) {
  return ['-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath, '-map', '0:v:0', '-map', '0:a:0', '-vf', `scale=${site.videoTarget.width}:${site.videoTarget.height}`, '-r', '25', '-fps_mode', 'cfr', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-sn', '-dn', '-movflags', '+faststart', outputPath];
}

function buildGeneratedPosterArguments(site, sourcePath, outputPath) {
  return ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(site.poster.generatedFromVideoAtSeconds), '-i', sourcePath, '-vf', 'scale=1920:1920:force_original_aspect_ratio=decrease', '-frames:v', '1', '-c:v', 'png', outputPath];
}

function run(executable, args, label) {
  const result = spawnSync(executable, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${label} failed (${result.status ?? 'spawn error'}): ${(result.stderr || result.stdout || result.error?.message || '').trim()}`);
  return result.stdout;
}

function resolveTool(root, environmentName, localName, commandName) {
  const candidates = [process.env[environmentName], join(root, '.media-tools', localName), commandName].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-version'], { encoding: 'utf8' });
    if (result.status === 0) return candidate;
  }
  throw new Error(`${commandName} is required; set ${environmentName} or install it at .media-tools/${localName}`);
}

export function displayDimensions(width, height, rotation = 0) {
  const normalizedRotation = ((Number(rotation) % 360) + 360) % 360;
  return normalizedRotation === 90 || normalizedRotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function mediaRotation(video, frames = []) {
  const sources = [video, ...frames.filter((frame) => frame?.media_type === 'video')];
  for (const source of sources) {
    const sideData = source?.side_data_list?.find((item) => Number.isFinite(Number(item.rotation)));
    if (sideData) return Number(sideData.rotation);
    if (Number.isFinite(Number(source?.tags?.rotate))) return Number(source.tags.rotate);
  }
  return 0;
}

function encodeWebImage(ffmpeg, cwebp, ffmpegArguments, outputPath, label) {
  const intermediatePath = `${outputPath}.intermediate.png`;
  try {
    run(ffmpeg, ffmpegArguments(intermediatePath), `${label} decode`);
    run(cwebp, buildCwebpArguments(intermediatePath, outputPath), `${label} WebP encode`);
  } finally {
    if (existsSync(intermediatePath)) unlinkSync(intermediatePath);
  }
}

function inspectMedia(ffprobe, path, options = {}) {
  const frameArguments = options.inspectFrameRotation ? ['-read_intervals', '%+#1', '-show_frames'] : [];
  const output = run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', ...frameArguments, '-of', 'json', path], `inspect ${path}`);
  const info = JSON.parse(output);
  const video = info.streams.find((stream) => stream.codec_type === 'video');
  const audio = info.streams.find((stream) => stream.codec_type === 'audio');
  const rotation = mediaRotation(video, info.frames ?? []);
  const dimensions = displayDimensions(video?.width ?? null, video?.height ?? null, rotation);
  return {
    codecVideo: video?.codec_name ?? null,
    codecAudio: audio?.codec_name ?? null,
    codedWidth: video?.width ?? null,
    codedHeight: video?.height ?? null,
    rotation,
    width: dimensions.width,
    height: dimensions.height,
    durationSeconds: Number(info.format?.duration ?? video?.duration ?? 0),
    bytes: statSync(path).size,
  };
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function atomPositions(path) {
  const file = openSync(path, 'r');
  const size = statSync(path).size;
  const positions = {};
  let offset = 0;
  const header = Buffer.alloc(16);
  try {
    while (offset + 8 <= size) {
      readSync(file, header, 0, 8, offset);
      let atomSize = header.readUInt32BE(0);
      const type = header.toString('ascii', 4, 8);
      let headerSize = 8;
      if (atomSize === 1) {
        readSync(file, header, 8, 8, offset + 8);
        atomSize = Number(header.readBigUInt64BE(8));
        headerSize = 16;
      } else if (atomSize === 0) atomSize = size - offset;
      if (!Number.isFinite(atomSize) || atomSize < headerSize) break;
      if (type === 'moov' || type === 'mdat') positions[type] = offset;
      offset += atomSize;
    }
  } finally {
    closeSync(file);
  }
  return positions;
}

function metadata(path, mime, ffprobe) {
  const inspected = mime === 'text/vtt; charset=utf-8'
    ? { bytes: statSync(path).size }
    : inspectMedia(ffprobe, path);
  return { mime, ...(inspected.width ? { width: inspected.width, height: inspected.height } : {}), bytes: inspected.bytes, sha256: sha256(path) };
}

function originalMetadata(path, ffprobe) {
  const inspected = inspectMedia(ffprobe, path, { inspectFrameRotation: true });
  return { codedWidth: inspected.codedWidth, codedHeight: inspected.codedHeight, rotation: inspected.rotation, width: inspected.width, height: inspected.height, bytes: inspected.bytes, sha256: sha256(path) };
}

function requireSources(root) {
  const missing = buildMediaPlan(root).filter((item) => !existsSync(join(root, item.sourcePath)));
  if (missing.length > 0) throw new Error(`Missing ${missing.length} fixed source(s):\n${missing.map((item) => `- ${item.sourcePath}`).join('\n')}`);
}

export function processMedia(root = process.cwd()) {
  requireSources(root);
  const ffmpeg = resolveTool(root, 'FFMPEG_PATH', 'ffmpeg', 'ffmpeg');
  const ffprobe = resolveTool(root, 'FFPROBE_PATH', 'ffprobe', 'ffprobe');
  const cwebp = resolveTool(root, 'CWEBP_PATH', 'cwebp', 'cwebp');
  const manifest = { schemaVersion: 1, version: 'v1', stagingDirectory: STAGING_DIRECTORY, sites: [] };

  for (const site of MEDIA_SITES) {
    const paths = objectPaths(site);
    const outputs = Object.fromEntries(Object.entries(paths).filter(([key]) => key !== 'photos').map(([key, value]) => [key, resolveStagingPath(root, value)]));
    const photoOutputs = paths.photos.map((path) => resolveStagingPath(root, path));
    [...Object.values(outputs), ...photoOutputs].forEach((path) => mkdirSync(dirname(path), { recursive: true }));

    encodeWebImage(ffmpeg, cwebp, (intermediate) => buildImageArguments(join(root, site.heroSourcePath), intermediate), outputs.hero, `hero ${site.id}`);
    site.photos.forEach((item, index) => encodeWebImage(ffmpeg, cwebp, (intermediate) => buildImageArguments(join(root, item.sourcePath), intermediate), photoOutputs[index], `photo ${site.id} ${index + 1}`));
    if (site.poster.sourcePath) encodeWebImage(ffmpeg, cwebp, (intermediate) => buildImageArguments(join(root, site.poster.sourcePath), intermediate), outputs.poster, `poster ${site.id}`);
    else encodeWebImage(ffmpeg, cwebp, (intermediate) => buildGeneratedPosterArguments(site, join(root, site.videoSourcePath), intermediate), outputs.poster, `poster ${site.id}`);
    run(ffmpeg, buildVideoArguments(site, join(root, site.videoSourcePath), outputs.video), `video ${site.id}`);
    copyFileSync(join(root, site.captionSourcePath), outputs.captions);

    const original = inspectMedia(ffprobe, join(root, site.videoSourcePath));
    original.faststart = (() => { const atoms = atomPositions(join(root, site.videoSourcePath)); return atoms.moov < atoms.mdat; })();
    original.sha256 = sha256(join(root, site.videoSourcePath));
    const encoded = inspectMedia(ffprobe, outputs.video);
    const atoms = atomPositions(outputs.video);
    manifest.sites.push({
      id: site.id,
      officialName: site.officialName,
      hero: { sourcePath: site.heroSourcePath, objectPath: paths.hero, alt: site.photos[0].alt, original: originalMetadata(join(root, site.heroSourcePath), ffprobe), ...metadata(outputs.hero, 'image/webp', ffprobe) },
      photos: site.photos.map((item, index) => ({ sourcePath: item.sourcePath, objectPath: paths.photos[index], sequence: index + 1, alt: item.alt, original: originalMetadata(join(root, item.sourcePath), ffprobe), ...metadata(photoOutputs[index], 'image/webp', ffprobe) })),
      video: {
        sourcePath: site.videoSourcePath,
        objectPath: paths.video,
        ...metadata(outputs.video, 'video/mp4', ffprobe),
        durationSeconds: encoded.durationSeconds,
        codecs: { video: encoded.codecVideo, audio: encoded.codecAudio },
        faststart: atoms.moov < atoms.mdat,
        original,
      },
      poster: {
        sourcePath: site.poster.sourcePath ?? site.videoSourcePath,
        ...(site.poster.generatedFromVideoAtSeconds !== undefined ? { generatedFromVideoAtSeconds: site.poster.generatedFromVideoAtSeconds } : {}),
        objectPath: paths.poster,
        aiWatermarkPresent: site.poster.aiWatermarkPresent,
        aiWatermarkAccepted: site.poster.aiWatermarkPresent,
        original: originalMetadata(join(root, site.poster.sourcePath ?? site.videoSourcePath), ffprobe),
        ...metadata(outputs.poster, 'image/webp', ffprobe),
      },
      captions: {
        sourcePath: site.captionSourcePath,
        objectPath: paths.captions,
        reviewedAgainst: 'real-audio-and-video',
        reviewedBy: 'Task 4 逐视频校对',
        reviewedAt: '2026-08-22',
        ...metadata(outputs.captions, 'text/vtt; charset=utf-8', ffprobe),
      },
    });
    console.log(`Processed ${site.id}: ${site.photos.length} photos + hero + poster + video + VTT`);
  }

  const manifestPath = join(root, 'content/media/media-manifest.json');
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${relative(root, manifestPath)} with ${buildMediaPlan(root).length} objects.`);
  return manifest;
}

function dryRun(root) {
  requireSources(root);
  const ffmpeg = resolveTool(root, 'FFMPEG_PATH', 'ffmpeg', 'ffmpeg');
  const ffprobe = resolveTool(root, 'FFPROBE_PATH', 'ffprobe', 'ffprobe');
  const cwebp = resolveTool(root, 'CWEBP_PATH', 'cwebp', 'cwebp');
  const plan = buildMediaPlan(root);
  console.log(`Media dry run passed: ${MEDIA_SITES.length} sites, 45 photos, 8 heroes, 8 videos, 8 posters, 8 VTT, ${plan.length} objects.`);
  console.log(`Staging: ${join(root, STAGING_DIRECTORY)} (ffmpeg: ${ffmpeg}; ffprobe: ${ffprobe}; cwebp: ${cwebp})`);
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    const root = resolve(dirname(modulePath), '..');
    if (process.argv.includes('--dry-run')) dryRun(root);
    else processMedia(root);
  } catch (error) {
    console.error(`Media processing failed: ${error.message}`);
    process.exitCode = 1;
  }
}
