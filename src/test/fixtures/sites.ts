const workingSiteNames = [
  '淮北抗日民主根据地纪念馆',
  '雨花台烈士陵园',
  '渡江胜利纪念馆',
  '四行仓库',
  '一大会址',
  '江上清烈士史料陈列馆',
  '扬州革命烈士陵园',
  '中国共产党代表团梅园新村纪念馆',
] as const;

function syntheticNarrative(section: string, index: number) {
  return [
    `这是第 ${index + 1} 条合成测试记录的${section}字段。`,
    '内容仅用于验证长度、必填项和集合规则，不代表任何真实地点、人物、年代或历史事件。',
    '生产资料必须由项目方依据场馆官网、政府资料、现场展板或权威文献重新核验后提供。',
  ].join('');
}

export function createValidEightSites() {
  return workingSiteNames.map((officialName, index) => {
    const sequence = String(index + 1).padStart(2, '0');

    return {
      id: `synthetic-site-${sequence}`,
      officialName,
      shortName: `合成简称${sequence}`,
      province: index < 5 ? '江苏省' : '上海市',
      city: `合成城市${sequence}`,
      district: `合成区县${sequence}`,
      address: `仅供测试的合成地址${sequence}号`,
      coordinates: {
        lat: 30 + index / 10,
        lng: 120 + index / 10,
      },
      opening: `合成开放信息${sequence}，不用于实际参观`,
      reservation: `合成预约方式${sequence}，不用于实际预约`,
      visitNotice: `合成参观提示${sequence}，上线前必须核验`,
      officialTitle: `合成官方称号${sequence}，上线前必须核验`,
      history: syntheticNarrative('历史', index),
      people: syntheticNarrative('人物', index),
      spirit: syntheticNarrative('精神', index),
      reflection: syntheticNarrative('感悟', index),
      heroImage: `/synthetic/site-${sequence}/hero.jpg`,
      heroFocus: {
        x: 50,
        y: 50,
      },
      photos: [
        `/synthetic/site-${sequence}/photo-01.jpg`,
        `/synthetic/site-${sequence}/photo-02.jpg`,
        `/synthetic/site-${sequence}/photo-03.jpg`,
      ],
      video: {
        url: `https://media.invalid/synthetic/site-${sequence}.mp4`,
        poster: `/synthetic/site-${sequence}/video-poster.jpg`,
        captions: `/synthetic/site-${sequence}/captions.vtt`,
      },
      sources: [
        {
          label: `合成权威来源${sequence}`,
          url: `https://sources.invalid/synthetic/site-${sequence}`,
        },
      ],
    };
  });
}

export const validEightSites = createValidEightSites();
