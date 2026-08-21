const officialNames = [
  '淮北抗日民主根据地纪念馆',
  '雨花台烈士陵园',
  '渡江胜利纪念馆',
  '上海四行仓库抗战纪念馆',
  '中国共产党第一次全国代表大会纪念馆',
  '江上青烈士史料陈列馆',
  '扬州革命烈士陵园',
  '中国共产党代表团梅园新村纪念馆',
] as const;

function narrative(section: string, sequence: string) {
  return [
    `TEST-ONLY 合成地点 ${sequence} 的${section}测试段落。`,
    '本文本只验证详情页的结构、可访问性与失败降级，不代表任何真实地点、人物、年代或历史事件。',
    '生产内容必须依据场馆官方网站、政府资料和完整审核记录另行核验。',
  ].join('');
}

export const syntheticSites = officialNames.map((officialName, index) => {
  const sequence = String(index + 1).padStart(2, '0');
  const mediaRoot = `/__e2e_media/site-${sequence}`;

  return {
    id: `e2e-synthetic-site-${sequence}`,
    officialName,
    shortName: `E2E合成简称${sequence}`,
    province: index === 3 || index === 4 ? '上海市' : '江苏省',
    city: `E2E合成城市${sequence}`,
    district: `E2E合成区县${sequence}`,
    address: `TEST-ONLY 合成地址 ${sequence} 号`,
    coordinates: { lat: 31 + index / 100, lng: 119 + index / 100 },
    opening: 'TEST-ONLY 合成开放信息，不用于参观',
    reservation: 'TEST-ONLY 合成预约方式，不用于预约',
    visitNotice: 'TEST-ONLY 合成参观提示，不用于出行',
    officialTitle: 'TEST-ONLY 合成称号，不是官方信息',
    history: narrative('历史印记', sequence),
    people: narrative('人物故事', sequence),
    spirit: narrative('精神传承', sequence),
    reflection: narrative('寻访感悟', sequence),
    heroImage: `${mediaRoot}/hero.svg`,
    heroFocus: { x: 50, y: 50 },
    photos: [
      { src: `${mediaRoot}/photo-01.svg`, alt: `TEST-ONLY 合成照片 ${sequence}-1` },
      { src: `${mediaRoot}/photo-02.svg`, alt: `TEST-ONLY 合成照片 ${sequence}-2` },
    ],
    video: {
      url: `https://e2e-media.invalid/site-${sequence}/video.webm`,
      poster: `${mediaRoot}/poster.svg`,
      captions: `${mediaRoot}/captions.vtt`,
    },
    sources: [
      {
        label: `TEST-ONLY 合成来源 ${sequence}`,
        url: `https://e2e-source.invalid/site-${sequence}`,
      },
    ],
  };
});
