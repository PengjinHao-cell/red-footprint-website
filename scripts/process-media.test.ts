import { describe, expect, it } from 'vitest';

import {
  MEDIA_SITES,
  STAGING_DIRECTORY,
  buildCwebpArguments,
  buildImageArguments,
  buildMediaPlan,
  buildVideoArguments,
  displayDimensions,
  mediaRotation,
  resolveStagingPath,
} from './process-media.mjs';

const EXPECTED_PHOTO_SOURCES = {
  'sihong-memorial': [
    'Videos/淮北抗日民主根据地纪念馆/淮北抗日民主根据地纪念馆——主图/3c03b98426e9aa556df1cef466ad0040.jpg',
    'Videos/淮北抗日民主根据地纪念馆/淮北抗日民主根据地纪念馆——主图/d80949c9af66a3f57ad72e22853f10ef.jpg',
  ],
  'yuhuatai-martyrs': [
    'Videos/雨花台烈士陵园/雨花台烈士陵园——主图/74D4D7FB5C6BB0793B13925AD5C2963C.jpg',
    'Videos/雨花台烈士陵园/雨花台烈士陵园——主图/924F82A0F8E5DB7904C60FA0336C91B4.jpg',
    'Videos/雨花台烈士陵园/雨花台烈士陵园——主图/4DFE2B4D8020791F3015B4299271946D.jpg',
    'Videos/雨花台烈士陵园/雨花台烈士陵园——主图/DF98EED3D190DED76C962EFE6916A34E.jpg',
    'Videos/雨花台烈士陵园/雨花台烈士陵园——主图/1EBA0805B98855C29BFADF9F8321D7E9.jpg',
  ],
  'dujiang-victory': [
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141503_29_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141507_30_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141515_32_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141518_33_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141544_39_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141511_31_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141535_37_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141548_40_2.jpg',
    'Videos/渡江胜利纪念馆/渡江胜利纪念馆-主图/微信图片_20260728141551_41_2.jpg',
  ],
  'sihang-warehouse': [
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/9EF26D098E1D2FA84C519EC6F454DE91.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/4ECB6A313AA560EE64A3B7E7947A0857.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/6AB4B76C9281A2C6920909439E78EBE8.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/7C1F7E832BB8EC9B5709C5F460DAA382.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/F5994272536B3D592203089A0252AFC8.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/22C2EBEB7427DA712395E2529ACCBCC4.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/50A2E5DB099B593999FF154990E2036B.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/792F6DE441435DB4E8C0A74F4CF7D7EF.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/A45087987CD3A073FFD3A70B9465B821.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/CADEFAC7A46C805B8109C7983347811F.jpg',
    'Videos/上海四行仓库抗战纪念馆/四行仓库照片/E20E5955EC8949D00687084F921C4AAF.jpg',
  ],
  'cpc-first-congress': [
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/ECA3AFBE989DE42290CB2AE50A262154.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/76AA36EE38DA670EA5D515873288AB98.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/8D70EF22FF390D14D390D0FA5035264D.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/EA6C78133FAB923B003D12F2CEBADA1C.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/FB8B58D316E1DD035C88DBCB430F537F.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/302FF3BFDA9568D28541A2DC73EA5889.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/3D85AF1A6350666A712A8A73B49C1D21.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/99088B168FC361A1F3111715B4FE186E.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/DEC010531E62FD01B886524192815C51.jpg',
    'Videos/中国共产党第一次全国代表大会会址/一大会址照片/DEE40E7340271A1C9EF64AFBF5B0CE2D.jpg',
  ],
  'jiangshangqing-memorial': [
    'Videos/江上青烈士史料陈列馆/江上青烈士史料陈列馆—竖版照片.jpg',
  ],
  'yangzhou-martyrs': [
    'Videos/扬州革命烈士陵园/扬州革命烈士陵园—竖版照片.jpg',
  ],
  'meiyuan-new-village': [
    'Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片5.jpg',
    'Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片2.jpg',
    'Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片3.jpg',
    'Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片6.jpg',
    'Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 图片1.jpg',
    'Videos/中国共产党代表团梅园新村纪念馆/图片/梅园新村 照片4.jpg',
  ],
} as const;

describe('production media plan', () => {
  it('locks the approved 45-photo order and eight complete media sets', () => {
    expect(MEDIA_SITES).toHaveLength(8);
    expect(
      Object.fromEntries(MEDIA_SITES.map((site) => [site.id, site.photos.map((photo) => photo.sourcePath)])),
    ).toEqual(EXPECTED_PHOTO_SOURCES);
    expect(MEDIA_SITES.reduce((total, site) => total + site.photos.length, 0)).toBe(45);
    for (const site of MEDIA_SITES) {
      expect(site.heroSourcePath).toBe(site.photos[0].sourcePath);
      expect(site.videoSourcePath).toMatch(/\.mp4$/i);
      expect(site.poster).toBeDefined();
      expect(site.captionSourcePath).toBe(`content/media/captions/${site.id}.vtt`);
    }
  });

  it('builds 77 immutable v1 object paths inside ignored staging', () => {
    const plan = buildMediaPlan('/project');
    expect(plan).toHaveLength(77);
    expect(new Set(plan.map((item) => item.objectPath)).size).toBe(77);
    for (const item of plan) {
      expect(item.objectPath).toMatch(/^media\/sites\/[a-z0-9-]+\/v1\/(?:hero|photos|video|poster|captions)\//);
      expect(resolveStagingPath('/project', item.objectPath)).toMatch(
        new RegExp(`/${STAGING_DIRECTORY}/media/sites/`),
      );
    }
    expect(() => resolveStagingPath('/project', '../Videos/source.mp4')).toThrow(/staging/i);
  });

  it('decodes images with autorotation before cwebp performs the WebP encoding', () => {
    const args = buildImageArguments('/source.jpg', '/staging/output.png');
    expect(args).toContain('-autorotate');
    expect(args.join(' ')).toMatch(/scale=.*force_original_aspect_ratio=decrease/);
    expect(args).toContain('png');
    expect(args.at(-1)).toBe('/staging/output.png');

    const webpArgs = buildCwebpArguments('/staging/output.png', '/staging/output.webp');
    expect(webpArgs).toEqual([
      '-quiet',
      '-q',
      '82',
      '-m',
      '6',
      '/staging/output.png',
      '-o',
      '/staging/output.webp',
    ]);
  });

  it('encodes videos as H.264/AAC faststart without crop, pad, or forced aspect', () => {
    for (const site of MEDIA_SITES) {
      const args = buildVideoArguments(site, '/source.mp4', '/staging/output.mp4');
      expect(args).toContain('libx264');
      expect(args).toContain('aac');
      expect(args).toContain('+faststart');
      expect(args.join(' ')).toContain(`scale=${site.videoTarget.width}:${site.videoTarget.height}`);
      expect(args.join(' ')).not.toMatch(/(?:crop|pad|setdar|setsar|-aspect)/);
    }
  });

  it('records EXIF/display-matrix rotation as display dimensions', () => {
    expect(displayDimensions(5712, 4284, -90)).toEqual({ width: 4284, height: 5712 });
    expect(displayDimensions(1440, 1920, 0)).toEqual({ width: 1440, height: 1920 });
    expect(
      mediaRotation(
        { side_data_list: [] },
        [{ media_type: 'video', side_data_list: [{ rotation: -90 }] }],
      ),
    ).toBe(-90);
  });
});
