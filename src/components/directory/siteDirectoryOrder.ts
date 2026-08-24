import type { Site } from '../../data/siteSchema';

/**
 * 固定拼音键:城市拼音 | 地点正式名称拼音。
 * 不依赖浏览器自动中文读音,避免不同运行环境排序结果不一致。
 * 未知 ID 稳定回退到 `city|officialName|id`,绝不丢失卡片。
 */
const SITE_PINYIN_ORDER: Record<string, string> = {
  'dujiang-victory': 'nanjing|dujiangshenglijinianguan',
  'yuhuatai-martyrs': 'nanjing|yuhuatailieshilingyuan',
  'meiyuan-new-village':
    'nanjing|zhongguogongchandangdaibiaotuanmeiyuanxincun',
  'sihang-warehouse': 'shanghai|shanghaisihangcangku',
  'cpc-first-congress':
    'shanghai|zhongguogongchandangdiyiciquanguodaibiao',
  'sihong-memorial': 'suqian|huaibeikangriminzhugendiju',
  'jiangshangqing-memorial': 'yangzhou|jiangshangqinglieshi',
  'yangzhou-martyrs': 'yangzhou|yangzhougeminglieshilingyuan',
};

function fallbackKey(site: Site): string {
  return `${site.city}|${site.officialName}|${site.id}`;
}

export function sortSitesForDirectory(
  sites: ReadonlyArray<Site>,
): Site[] {
  return [...sites].sort((a, b) => {
    const aKey = SITE_PINYIN_ORDER[a.id] ?? fallbackKey(a);
    const bKey = SITE_PINYIN_ORDER[b.id] ?? fallbackKey(b);
    return aKey.localeCompare(bKey);
  });
}
