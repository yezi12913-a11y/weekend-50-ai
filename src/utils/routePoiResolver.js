import { amapGet, amapLocationToLngLat, hasAmapKey } from "./amapService.js";
import { beijingFallbackPois } from "../data/beijingFallbackPois.js";

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
const foodNameWords = ["餐", "饭", "面", "粉", "饺", "馄饨", "米线", "小吃", "快餐", "麦当劳", "肯德基", "鸡柳", "鸡排", "汉堡", "火锅", "烤肉", "中餐", "食堂", "吉野家", "和府捞面", "南城香", "沙县", "兰州拉面", "麻辣烫", "熟食"];
const drinkNameWords = ["超市", "便利店", "便利蜂", "罗森", "7-ELEVEN", "7-11", "全家", "咖啡", "奶茶", "茶", "甜品", "饮品", "瑞幸", "星巴克", "库迪", "喜茶", "奈雪", "蜜雪冰城", "茶百道", "霸王茶姬", "麦当劳", "肯德基"];
const retailOnlyWords = ["GIANT", "优衣库", "ZARA", "NIKE", "APPLE", "APPLE STORE", "书店", "文创", "服装", "运动品牌", "数码", "家电", "电子", "杂货", "专卖店", "体育用品", "购物服务;服装", "购物服务;体育"];
const playableNameWords = ["展", "美术馆", "博物馆", "艺术中心", "影院", "电影", "公园", "街区", "商场", "书店"];
const closedPoiWords = ["暂停营业", "已关闭", "永久关闭", "停业", "歇业", "装修中", "暂停开放", "闭店"];
const privatePlaceWords = ["小学", "中学", "幼儿园", "培训学校", "家属院", "小区", "社区", "居委", "村委", "村庄", "村民", "私人住宅", "住宅区", "宿舍", "公寓", "别墅", "商务住宅"];
const publicRestWords = ["公园", "广场", "湖", "河", "滨水", "步道", "街区", "胡同", "商业街", "商场", "购物中心", "公共空间", "公共休息", "文化", "文创", "艺术区", "艺术中心", "博物馆", "美术馆", "图书馆", "书店", "咖啡"];
const foodStepPattern = /吃饭|正餐|简餐|小吃|餐饮|午餐|晚餐|吃点好的|餐|吃|轻食|美食|饭/;
const drinkStepPattern = /喝水|买水|饮料|奶茶|咖啡|休息补给|补给|饮品|甜品/;
const publicRestStepPattern = /散步|休息|打卡|拍照|放空|坐一会|坐着|停留|公共空间|公共区|湖边|河边|街区|广场|公园|橱窗|夜景|漫游|慢走/;

export function stepNeedsRealPoi(step) {
  const text = `${step.place || ""} ${step.action || ""}`;
  return /餐|吃|小吃|轻食|简餐|饮品|便利店|咖啡|奶茶|甜品|正餐|补给|舒适停留|体验升级/.test(text)
    || publicRestStepPattern.test(text);
}

function textForPoi(poi) {
  return `${poi.name || ""}${poi.type || ""}${poi.address || ""}`.toUpperCase();
}

function stepNeedsFood(step) {
  return foodStepPattern.test(`${step.place || ""} ${step.action || ""} ${step.tip || ""}`);
}

function stepNeedsDrink(step) {
  return drinkStepPattern.test(`${step.place || ""} ${step.action || ""} ${step.tip || ""}`);
}

function stepNeedsPublicRest(step) {
  return publicRestStepPattern.test(`${step.place || ""} ${step.action || ""} ${step.tip || ""}`);
}

export function buildPoiKeywordForStep(route, step) {
  const destination = route?.destination || "北京";
  const text = `${step.place || ""} ${step.action || ""}`;
  const budget = Number(route?.userBudget || 0);
  const planType = route?.fallbackPlanType || route?.foodPoiPlanType || "";
  if (stepNeedsDrink(step) && !stepNeedsFood(step)) {
    if (planType === "vibe" || budget >= 150) return `${destination} 咖啡 甜品 奶茶 饮品`;
    return `${destination} 咖啡 奶茶 饮品 便利店`;
  }
  if (stepNeedsFood(step)) {
    if (planType === "cheap") return `${destination} 便利店 平价小吃 快餐`;
    if (planType === "steady") return `${destination} 商场B1 美食区 连锁快餐 平价正餐`;
    if (planType === "vibe" || budget >= 150) return `${destination} 正餐 咖啡 甜品 餐厅`;
    return `${destination} 平价简餐 小吃 快餐`;
  }
  if (stepNeedsPublicRest(step)) return `${destination} 公园 广场 街区 公共空间 文化 文创 商场 咖啡`;
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

export function isRetailOnlyPoi(poi) {
  const text = textForPoi(poi);
  return retailOnlyWords.some((word) => text.includes(word));
}

export function isForbiddenPrivatePlacePoi(poi) {
  const text = `${poi.name || ""}${poi.type || ""}${poi.address || ""}`;
  return privatePlaceWords.some((word) => text.includes(word))
    || /地名地址信息;普通地名;村庄级地名|商务住宅;住宅|科教文化服务;学校|政府机构及社会团体.*社区/.test(text);
}

export function isFoodPoi(poi) {
  const text = textForPoi(poi);
  if (isRetailOnlyPoi(poi) || /景点|风景名胜|公园|展馆|美术馆|博物馆|公司|政府|汽车|房产/.test(text)) return false;
  if (/餐饮服务/.test(text)) return true;
  if (/购物服务;便利店|便利店|超市/.test(text) && /熟食|便当|饭团|关东煮|餐|饭|小吃/.test(text)) return true;
  return foodNameWords.some((word) => text.includes(word.toUpperCase()));
}

export function isDiningPoi(poi) {
  return isFoodPoi(poi);
}

export function isDrinkPoi(poi) {
  const text = textForPoi(poi);
  if (isRetailOnlyPoi(poi) || /景点|风景名胜|公园|展馆|美术馆|博物馆|公司|政府|汽车|房产/.test(text)) return false;
  return /餐饮服务|购物服务;便利店|购物服务;超级市场|超市|便利店/.test(text)
    || drinkNameWords.some((word) => text.includes(word.toUpperCase()));
}

export function filterFoodPois(pois) {
  return (pois || []).filter((poi) => poi?.name && isOpenPoi(poi) && isFoodPoi(poi));
}

export function filterDrinkPois(pois) {
  return (pois || []).filter((poi) => poi?.name && isOpenPoi(poi) && isDrinkPoi(poi));
}

export function isPublicRestPoi(poi) {
  const text = `${poi.name || ""}${poi.type || ""}${poi.address || ""}`;
  if (!poi?.name || isForbiddenPrivatePlacePoi(poi) || !isOpenPoi(poi)) return false;
  if (/公司|政府|汽车|房产|维修|批发|门诊|医院|银行/.test(text)) return false;
  if (/风景名胜|体育休闲服务|购物服务;商场|购物服务;购物中心|餐饮服务;咖啡厅|科教文化服务;(图书馆|博物馆|美术馆|文化宫|展览馆|艺术团体)|道路附属设施/.test(text)) return true;
  return publicRestWords.some((word) => text.includes(word));
}

export function filterPublicRestPois(pois) {
  return (pois || []).filter((poi) => poi?.name && isPublicRestPoi(poi));
}

export function isOpenPoi(poi) {
  const text = `${poi.name || ""}${poi.type || ""}${poi.address || ""}${poi.biz_ext?.open_time || ""}`;
  return !closedPoiWords.some((word) => text.includes(word));
}

export function isPlayablePoi(poi) {
  const text = `${poi.name || ""}${poi.type || ""}`;
  return isOpenPoi(poi)
    && !isForbiddenPrivatePlacePoi(poi)
    && !/家电|电子|数码|汽车|房产|公司|政府|维修|批发/.test(text)
    && (/科教文化服务|风景名胜|体育休闲服务|购物服务;商场|电影院/.test(text) || playableNameWords.some((word) => text.includes(word)));
}

function keywordRequiresDrink(keyword) {
  return /咖啡|甜品|奶茶|饮品|便利店/.test(keyword);
}

function keywordRequiresDining(keyword) {
  return /正餐|餐厅|简餐|小吃|快餐|中餐/.test(keyword);
}

function keywordRequiresPlayable(keyword) {
  return /展览|电影|影院|美术馆|博物馆|游玩/.test(keyword);
}

function keywordRequiresPublicRest(keyword) {
  return /公园|广场|街区|公共空间|文化|文创|商场|咖啡/.test(keyword);
}

function isUsablePoi(poi, keyword) {
  const text = `${poi.name || ""}${poi.type || ""}`;
  if (!poi.name || !poi.location || !isOpenPoi(poi) || expensivePoiWords.some((word) => text.includes(word))) return false;
  if (keywordRequiresDining(keyword)) return isFoodPoi(poi);
  if (keywordRequiresDrink(keyword)) return isDrinkPoi(poi);
  if (keywordRequiresPlayable(keyword)) return isPlayablePoi(poi);
  if (keywordRequiresPublicRest(keyword)) return isPublicRestPoi(poi);
  return true;
}

export function getFoodTierByBudget(budget, planType) {
  if (planType === "cheap") return "low";
  if (planType === "steady") return "mid";
  if (planType === "vibe") return "high";
  if (budget <= 60) return "low";
  if (budget <= 120) return "mid";
  return "high";
}

function foodTierScore(poi, tier) {
  const text = textForPoi(poi);
  const cost = Number(poi.estimatedCost || poi.cost || 0);
  if (tier === "low") {
    if (/便利店|7-11|7-ELEVEN|便利蜂|罗森|全家|小吃|快餐|麦当劳|肯德基|沙县|兰州|麻辣烫/.test(text)) return 0;
    return cost <= 25 ? 1 : 4;
  }
  if (tier === "mid") {
    if (/B1|美食区|连锁|快餐|麦当劳|肯德基|吉野家|和府|南城香|平价正餐/.test(text)) return 0;
    return cost >= 24 && cost <= 55 ? 1 : 3;
  }
  if (/餐饮服务;中餐|餐饮服务;餐厅|正餐|餐厅|中餐/.test(text)) return 0;
  if (/咖啡|甜品|喜茶|奈雪|星巴克|瑞幸|奶茶|饮品/.test(text)) return 1;
  return cost >= 45 ? 1 : 3;
}

export function avoidDuplicateFoodPois(selectedPois, candidatePois) {
  const selected = selectedPois instanceof Set ? selectedPois : new Set(selectedPois || []);
  return (candidatePois || []).filter((poi) => !selected.has(poi.name));
}

export function selectFoodPoiByPlanType(pois, planType, budget, selectedPois = new Set()) {
  const tier = getFoodTierByBudget(budget, planType);
  const candidates = avoidDuplicateFoodPois(selectedPois, filterFoodPois(pois));
  const source = candidates.length ? candidates : filterFoodPois(pois);
  return [...source].sort((a, b) => foodTierScore(a, tier) - foodTierScore(b, tier))[0];
}

function selectDrinkPoi(pois, selectedPois = new Set()) {
  const selected = selectedPois instanceof Set ? selectedPois : new Set(selectedPois || []);
  return filterDrinkPois(pois).find((poi) => !selected.has(poi.name)) || filterDrinkPois(pois)[0];
}

function selectPublicRestPoi(pois, selectedPois = new Set()) {
  const selected = selectedPois instanceof Set ? selectedPois : new Set(selectedPois || []);
  const publicPois = filterPublicRestPois(pois);
  return publicPois.find((poi) => !selected.has(poi.name)) || publicPois[0];
}

function fallbackGroupForDestination(destination) {
  const text = String(destination || "");
  return beijingFallbackPois.find((group) => group.name === text || group.aliases?.some((alias) => text.includes(alias) || alias.includes(text)))
    || beijingFallbackPois[0];
}

function fallbackPoiForStep(route, step, selectedPois) {
  const group = fallbackGroupForDestination(route?.destination);
  const tier = getFoodTierByBudget(Number(route?.userBudget || 50), route?.fallbackPlanType || route?.foodPoiPlanType);
  const foodFallbacks = [
    ...(group.nearbyBudgetFoodPois || []),
    { name: `7-11熟食区（${route?.destination || group.name}附近）`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 14, source: "fallback_food" },
    { name: `麦当劳（${route?.destination || group.name}附近）`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 24, source: "fallback_food" },
    { name: `南城香（${route?.destination || group.name}附近）`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 38, source: "fallback_food" },
    { name: `平价正餐（${route?.destination || group.name}附近）`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 58, source: "fallback_food" }
  ];
  const drinkFallbacks = [
    ...(group.nearbyConveniencePois || []),
    { name: `瑞幸咖啡（${route?.destination || group.name}附近）`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 18, source: "fallback_drink" },
    { name: `蜜雪冰城（${route?.destination || group.name}附近）`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 12, source: "fallback_drink" }
  ];
  const restFallbacks = [
    ...(group.nearbyComfortPois || []),
    { name: `${route?.destination || group.name}周边公共空间`, address: group.address, lat: group.lat, lng: group.lng, estimatedCost: 0, source: "fallback_public_rest" }
  ];

  if (stepNeedsPublicRest(step) && !stepNeedsFood(step) && !stepNeedsDrink(step)) return selectPublicRestPoi(restFallbacks, selectedPois);
  if (stepNeedsDrink(step) && !stepNeedsFood(step)) return selectDrinkPoi(drinkFallbacks, selectedPois);
  if (tier === "high") return selectFoodPoiByPlanType([...foodFallbacks, ...drinkFallbacks], "vibe", route?.userBudget, selectedPois);
  return selectFoodPoiByPlanType(foodFallbacks, route?.fallbackPlanType || route?.foodPoiPlanType, route?.userBudget, selectedPois);
}

async function searchPoi(keyword, fallbackCost, route, step) {
  const data = await amapGet("/place/text", {
    keywords: keyword,
    city: "北京",
    offset: "12",
    page: "1"
  });
  const pois = Array.isArray(data?.pois) ? data.pois : [];
  const selected = new Set(route?.usedFoodPoiNames || []);
  const usable = pois.filter((poi) => isUsablePoi(poi, keyword));
  const selectedPoi = keywordRequiresDrink(keyword) && !keywordRequiresDining(keyword)
    ? selectDrinkPoi(usable, selected)
    : keywordRequiresDining(keyword)
      ? selectFoodPoiByPlanType(usable, route?.fallbackPlanType || route?.foodPoiPlanType, route?.userBudget, selected)
      : keywordRequiresPublicRest(keyword)
        ? selectPublicRestPoi(usable, selected)
      : usable[0];
  const fallbackPoi = selectedPoi || fallbackPoiForStep(route, step, selected);
  if (!fallbackPoi) return null;

  const normalized = fallbackPoi.location ? normalizePoi(fallbackPoi, fallbackCost) : { ...fallbackPoi, poiId: fallbackPoi.poiId || fallbackPoi.name };
  return Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng) ? normalized : null;
}

export async function resolveRoutePois(route) {
  if (!route || !hasAmapKey()) return route;
  const center = destinationCenters[route.destination] || destinationCenters[route.relatedDestinations?.[0]];

  const steps = await Promise.all((route.steps || []).map(async (step) => {
    if (!stepNeedsRealPoi(step) || step.source === "amap_poi") return step;
    const keyword = buildPoiKeywordForStep(route, step);
    const poi = await searchPoi(keyword, step.cost || route.foodCost || 20, route, step);
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
