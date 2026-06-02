const fallbackPoi = (name, address, lat, lng, estimatedCost, distance = 450) => ({
  name,
  address,
  lat,
  lng,
  estimatedCost,
  cost: estimatedCost,
  distance,
  source: "fallback_poi",
  mapUrl: `https://uri.amap.com/search?keyword=${encodeURIComponent(name)}&city=${encodeURIComponent("北京")}&src=weekend-50-ai&callnative=1`,
  whyRecommended: "此处为兜底推荐，请以地图实时信息为准。"
});

function group({ name, aliases, district, address, lat, lng, subway, bus, food, convenience, comfort }) {
  return {
    name,
    aliases,
    district,
    address,
    lat,
    lng,
    nearbySubwayStations: subway,
    nearbyBusStops: bus,
    nearbyBudgetFoodPois: food,
    nearbyConveniencePois: convenience,
    nearbyComfortPois: comfort
  };
}

export const beijingFallbackPois = [
  group({
    name: "西单",
    aliases: ["西单"],
    district: "西城区",
    address: "北京市西城区西单北大街",
    lat: 39.9072,
    lng: 116.3742,
    subway: ["西单站", "灵境胡同站"],
    bus: ["西单路口南公交站"],
    food: [fallbackPoi("麦当劳（西单附近）", "北京市西城区西单北大街附近", 39.9072, 116.3742, 22, 300)],
    convenience: [fallbackPoi("便利蜂（西单附近）", "北京市西城区西单附近", 39.907, 116.374, 10, 280)],
    comfort: [fallbackPoi("西单大悦城公共休息区", "北京市西城区西单北大街131号", 39.9107, 116.3749, 0, 350)]
  }),
  group({
    name: "故宫博物院",
    aliases: ["故宫", "紫禁城", "天安门"],
    district: "东城区",
    address: "北京市东城区景山前街4号",
    lat: 39.9163,
    lng: 116.3972,
    subway: ["天安门东站", "天安门西站", "金鱼胡同站"],
    bus: ["景山公园西门公交站", "故宫公交站"],
    food: [fallbackPoi("庆丰包子铺（王府井附近）", "北京市东城区王府井大街附近", 39.9148, 116.411, 18, 900)],
    convenience: [fallbackPoi("便利蜂（王府井附近）", "北京市东城区王府井大街附近", 39.9145, 116.4114, 10, 850)],
    comfort: [fallbackPoi("王府井书店", "北京市东城区王府井大街218号", 39.9142, 116.4116, 0, 900)]
  }),
  group({
    name: "王府井",
    aliases: ["王府井", "东单"],
    district: "东城区",
    address: "北京市东城区王府井大街",
    lat: 39.9142,
    lng: 116.4116,
    subway: ["王府井站", "金鱼胡同站", "东单站"],
    bus: ["王府井路口北公交站"],
    food: [fallbackPoi("麦当劳（王府井附近）", "北京市东城区王府井大街附近", 39.9142, 116.4116, 22, 300)],
    convenience: [fallbackPoi("7-ELEVEn（王府井附近）", "北京市东城区王府井大街附近", 39.914, 116.411, 12, 350)],
    comfort: [fallbackPoi("王府井书店", "北京市东城区王府井大街218号", 39.9142, 116.4116, 0, 260)]
  }),
  group({
    name: "前门",
    aliases: ["前门", "大栅栏", "北京坊"],
    district: "东城区",
    address: "北京市东城区前门大街",
    lat: 39.8993,
    lng: 116.3976,
    subway: ["前门站", "珠市口站"],
    bus: ["前门公交站"],
    food: [fallbackPoi("庆丰包子铺（前门附近）", "北京市东城区前门大街附近", 39.899, 116.397, 18, 380)],
    convenience: [fallbackPoi("便利蜂（前门附近）", "北京市东城区前门附近", 39.8987, 116.3978, 10, 420)],
    comfort: [fallbackPoi("北京坊公共休息区", "北京市西城区廊房头条21号院", 39.8958, 116.3919, 0, 650)]
  }),
  group({
    name: "五道口",
    aliases: ["五道口", "北邮", "北京邮电大学", "北大", "北京大学东门", "清华", "清华大学", "人大", "中国人民大学", "西土城", "蓟门桥", "海淀黄庄", "中关村"],
    district: "海淀区",
    address: "北京市海淀区五道口",
    lat: 39.9929,
    lng: 116.3373,
    subway: ["五道口站", "北京大学东门站", "海淀黄庄站"],
    bus: ["五道口公交站"],
    food: [fallbackPoi("麦当劳（五道口附近）", "北京市海淀区成府路五道口附近", 39.9929, 116.3373, 22, 300)],
    convenience: [fallbackPoi("便利蜂（五道口附近）", "北京市海淀区五道口附近", 39.9926, 116.337, 10, 250)],
    comfort: [fallbackPoi("五道口购物中心公共休息区", "北京市海淀区成府路28号", 39.9923, 116.3372, 0, 350)]
  }),
  group({
    name: "圆明园",
    aliases: ["圆明园", "颐和园"],
    district: "海淀区",
    address: "北京市海淀区清华西路28号",
    lat: 39.9995,
    lng: 116.3096,
    subway: ["圆明园站", "北京大学东门站"],
    bus: ["圆明园南门公交站"],
    food: [fallbackPoi("肯德基（中关村附近）", "北京市海淀区中关村附近", 39.984, 116.316, 22, 900)],
    convenience: [fallbackPoi("便利蜂（圆明园附近）", "北京市海淀区圆明园站附近", 39.999, 116.31, 10, 450)],
    comfort: [fallbackPoi("北京大学东门周边公共空间", "北京市海淀区成府路", 39.9922, 116.3158, 0, 850)]
  }),
  group({
    name: "南锣鼓巷",
    aliases: ["南锣", "南锣鼓巷", "鼓楼", "什刹海"],
    district: "东城区",
    address: "北京市东城区南锣鼓巷",
    lat: 39.9373,
    lng: 116.4032,
    subway: ["南锣鼓巷站", "什刹海站", "鼓楼大街站"],
    bus: ["锣鼓巷公交站"],
    food: [fallbackPoi("庆丰包子铺（鼓楼附近）", "北京市东城区鼓楼东大街附近", 39.9405, 116.3974, 18, 550)],
    convenience: [fallbackPoi("便利蜂（鼓楼附近）", "北京市东城区鼓楼附近", 39.9404, 116.397, 10, 520)],
    comfort: [fallbackPoi("钟鼓楼广场公共空间", "北京市东城区钟楼湾胡同", 39.9408, 116.397, 0, 500)]
  }),
  group({
    name: "天坛公园",
    aliases: ["天坛"],
    district: "东城区",
    address: "北京市东城区天坛东里甲1号",
    lat: 39.8822,
    lng: 116.4066,
    subway: ["天坛东门站", "桥湾站"],
    bus: ["天坛东门公交站"],
    food: [fallbackPoi("永和大王（天坛附近）", "北京市东城区天坛东门附近", 39.882, 116.407, 20, 450)],
    convenience: [fallbackPoi("京客隆便利店（天坛附近）", "北京市东城区天坛附近", 39.882, 116.406, 10, 420)],
    comfort: [fallbackPoi("天坛公园外部公共休息区", "北京市东城区天坛东门附近", 39.8822, 116.4066, 0, 300)]
  }),
  group({
    name: "三里屯",
    aliases: ["三里屯", "亮马桥", "朝阳公园"],
    district: "朝阳区",
    address: "北京市朝阳区三里屯",
    lat: 39.9367,
    lng: 116.4551,
    subway: ["团结湖站", "农业展览馆站", "亮马桥站"],
    bus: ["三里屯公交站"],
    food: [fallbackPoi("麦当劳（三里屯附近）", "北京市朝阳区三里屯附近", 39.9365, 116.455, 22, 350)],
    convenience: [fallbackPoi("7-ELEVEn（三里屯附近）", "北京市朝阳区三里屯附近", 39.9368, 116.4553, 12, 300)],
    comfort: [fallbackPoi("三里屯太古里公共休息区", "北京市朝阳区三里屯路19号", 39.9367, 116.4551, 0, 260)]
  }),
  group({
    name: "798艺术区",
    aliases: ["798"],
    district: "朝阳区",
    address: "北京市朝阳区酒仙桥路2号",
    lat: 39.9841,
    lng: 116.4955,
    subway: ["将台站", "望京南站"],
    bus: ["大山子路口南公交站"],
    food: [fallbackPoi("肯德基（酒仙桥附近）", "北京市朝阳区酒仙桥附近", 39.984, 116.496, 22, 600)],
    convenience: [fallbackPoi("便利蜂（酒仙桥附近）", "北京市朝阳区酒仙桥附近", 39.984, 116.495, 10, 450)],
    comfort: [fallbackPoi("798艺术区公共空间", "北京市朝阳区酒仙桥路2号", 39.9841, 116.4955, 0, 200)]
  }),
  group({
    name: "奥林匹克森林公园",
    aliases: ["奥森"],
    district: "朝阳区",
    address: "北京市朝阳区科荟路33号",
    lat: 40.0104,
    lng: 116.3913,
    subway: ["森林公园南门站", "奥林匹克公园站"],
    bus: ["森林公园南门公交站"],
    food: [fallbackPoi("麦当劳（奥林匹克公园附近）", "北京市朝阳区奥林匹克公园附近", 40.008, 116.392, 22, 850)],
    convenience: [fallbackPoi("便利蜂（奥森附近）", "北京市朝阳区奥森附近", 40.009, 116.391, 10, 500)],
    comfort: [fallbackPoi("奥森南园公共休息区", "北京市朝阳区奥林匹克森林公园南园", 40.0104, 116.3913, 0, 200)]
  }),
  group({
    name: "北京南站",
    aliases: ["北京南站"],
    district: "丰台区",
    address: "北京市丰台区北京南站",
    lat: 39.8652,
    lng: 116.3788,
    subway: ["北京南站", "陶然亭站"],
    bus: ["北京南站公交站"],
    food: [fallbackPoi("麦当劳（北京南站附近）", "北京市丰台区北京南站附近", 39.865, 116.379, 22, 300)],
    convenience: [fallbackPoi("便利店（北京南站附近）", "北京市丰台区北京南站附近", 39.8651, 116.3788, 10, 250)],
    comfort: [fallbackPoi("北京南站候车公共休息区", "北京市丰台区北京南站", 39.8652, 116.3788, 0, 100)]
  }),
  group({
    name: "通州北关",
    aliases: ["通州北关"],
    district: "通州区",
    address: "北京市通州区通州北关",
    lat: 39.9165,
    lng: 116.6624,
    subway: ["通州北关站", "北运河西站"],
    bus: ["通州北关公交站"],
    food: [fallbackPoi("麦当劳（通州北关附近）", "北京市通州区通州北关附近", 39.916, 116.662, 22, 450)],
    convenience: [fallbackPoi("便利蜂（通州北关附近）", "北京市通州区通州北关附近", 39.9165, 116.662, 10, 350)],
    comfort: [fallbackPoi("通州运河公共空间", "北京市通州区北运河沿线", 39.9168, 116.663, 0, 300)]
  })
];

export function findFallbackLocation(input) {
  const text = String(input || "").trim();
  return beijingFallbackPois.find((item) => item.name === text || item.aliases.includes(text));
}

export function findNearestFallbackPoiGroup(location) {
  const text = `${location?.name || ""}${location?.rawInput || ""}`;
  const matched = beijingFallbackPois.find((item) => item.name === location?.name || item.aliases.some((alias) => text.includes(alias)));
  if (matched) return matched;
  if (Number.isFinite(location?.lat) && Number.isFinite(location?.lng)) {
    return [...beijingFallbackPois].sort((a, b) => {
      const da = (a.lat - location.lat) ** 2 + (a.lng - location.lng) ** 2;
      const db = (b.lat - location.lat) ** 2 + (b.lng - location.lng) ** 2;
      return da - db;
    })[0];
  }
  return beijingFallbackPois[0];
}
