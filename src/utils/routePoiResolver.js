import { amapGet, amapLocationToLngLat, hasAmapKey } from "./amapService.js";

const destinationCenters = {
  合生汇: { lat: 39.8936, lng: 116.4898 },
  三里屯: { lat: 39.9367, lng: 116.4540 },
  朝阳大悦城: { lat: 39.9247, lng: 116.5196 },
  西单大悦城: { lat: 39.9098, lng: 116.3746 },
  荟聚: { lat: 39.7894, lng: 116.3285 },
  蓝色港湾: { lat: 39.9483, lng: 116.4747 },
  "鼓楼/什刹海": { lat: 39.9403, lng: 116.3868 },
  什刹海: { lat: 39.9403, lng: 116.3868 },
  奥森公园: { lat: 40.0162, lng: 116.3929 },
  亮马河: { lat: 39.9494, lng: 116.4708 },
  紫竹院: { lat: 39.9486, lng: 116.3127 },
  玉渊潭: { lat: 39.9170, lng: 116.3175 },
  798: { lat: 39.9843, lng: 116.4976 },
  首钢园: { lat: 39.9137, lng: 116.1606 },
  牛街: { lat: 39.8863, lng: 116.3637 },
  护国寺: { lat: 39.9333, lng: 116.3738 },
  书店: { lat: 39.9042, lng: 116.4074 },
  图书馆: { lat: 39.9431, lng: 116.3252 },
  咖啡店: { lat: 39.9042, lng: 116.4074 },
  商场公共区: { lat: 39.9042, lng: 116.4074 }
};

const expensivePoiWords = ["酒吧", "西餐", "牛排", "日料", "烧肉", "海鲜", "私房菜", "高端", "会所"];

export function stepNeedsRealPoi(step) {
  const text = `${step.place || ""} ${step.action || ""}`;
  return /餐|吃|小吃|轻食|简餐|饮品|便利店|咖啡|奶茶|甜品|正餐|补给|舒适停留|体验升级/.test(text);
}

export function buildPoiKeywordForStep(route, step) {
  const destination = route?.destination || "北京";
  const text = `${step.place || ""} ${step.action || ""}`;
  if (/咖啡|奶茶|甜品|饮品|舒适停留/.test(text)) return `${destination} 咖啡 甜品 奶茶`;
  if (/便利店|补给/.test(text)) return `${destination} 便利店 饮品`;
  if (/正餐|餐|吃|小吃|轻食|简餐/.test(text)) return `${destination} 平价简餐 小吃 快餐`;
  if (/体验升级|电影|展/.test(text)) return `${destination} 咖啡 甜品 展览 电影`;
  return `${destination} ${step.place || ""}`;
}

function estimatePoiCost(name, fallback) {
  if (/便利店|便利蜂|罗森|7-ELEVEn|全家|超市/.test(name)) return 12;
  if (/麦当劳|肯德基|快餐|包子|小吃|面|粉|饺子|馄饨|米线/.test(name)) return 20;
  if (/奶茶|饮品|咖啡|甜品/.test(name)) return 18;
  return fallback;
}

function normalizePoi(poi, fallbackCost) {
  const point = amapLocationToLngLat(poi.location);
  return {
    name: poi.name,
    address: poi.address || poi.name,
    lat: point.lat,
    lng: point.lng,
    estimatedCost: estimatePoiCost(poi.name || "", fallbackCost),
    poiId: poi.id,
    type: poi.type,
    source: "amap_poi"
  };
}

function isUsablePoi(poi) {
  const text = `${poi.name || ""}${poi.type || ""}`;
  return poi.name && poi.location && !expensivePoiWords.some((word) => text.includes(word));
}

async function searchPoi(keyword, fallbackCost) {
  const data = await amapGet("/place/text", {
    keywords: keyword,
    city: "北京",
    offset: "12",
    page: "1"
  });
  const pois = Array.isArray(data?.pois) ? data.pois : [];
  return pois
    .filter(isUsablePoi)
    .map((poi) => normalizePoi(poi, fallbackCost))
    .find((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng));
}

export async function resolveRoutePois(route) {
  if (!route || !hasAmapKey()) return route;
  const center = destinationCenters[route.destination] || destinationCenters[route.relatedDestinations?.[0]];

  const steps = await Promise.all((route.steps || []).map(async (step) => {
    if (!stepNeedsRealPoi(step) || step.source === "amap_poi") return step;
    const keyword = buildPoiKeywordForStep(route, step);
    const poi = await searchPoi(keyword, step.cost || route.foodCost || 20);
    if (!poi) return { ...step, poiStatus: "高德暂未返回稳定店铺，请以地图搜索为准。" };

    return {
      ...step,
      originalPlace: step.place,
      place: poi.name,
      address: poi.address,
      lat: poi.lat,
      lng: poi.lng,
      amapKeyword: poi.name,
      source: "amap_poi",
      poiId: poi.poiId,
      primaryPoi: {
        name: poi.name,
        address: poi.address,
        lat: poi.lat,
        lng: poi.lng,
        estimatedCost: poi.estimatedCost,
        poiId: poi.poiId
      },
      tip: `高德真实店名：${poi.name}。${step.tip || ""}`,
      whyRecommended: `这是根据高德 POI 查询到的真实地点，位于${route.destination}周边。`
    };
  }));

  return {
    ...route,
    steps: steps.map((step, index) => {
      if (Number.isFinite(step.lat) && Number.isFinite(step.lng)) return step;
      if (!center) return step;
      return { ...step, lat: center.lat + index * 0.0012, lng: center.lng + index * 0.0012 };
    }),
    hasResolvedAmapPois: steps.some((step) => step.source === "amap_poi")
  };
}
