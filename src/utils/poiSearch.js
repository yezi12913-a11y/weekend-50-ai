import { isAmapKeyError, getAmapConfigStatus } from "./amapClient.js";
import { searchNearbyFoodByJsApi, searchPoiByJsApi } from "./amapJsSearch.js";
import { amapLocationToLngLat, amapWebServiceGet, buildAmapRouteUrl, distanceMeters, hasAmapWebServiceKey } from "./amapService.js";

const budgetFriendlyKeywords = ["麦当劳", "肯德基", "便利店", "便利蜂", "罗森", "7-ELEVEn", "面馆", "包子", "小吃", "快餐", "奶茶"];
const expensiveKeywords = ["酒吧", "西餐", "牛排", "日料", "烧肉", "海鲜", "私房菜", "高端", "会所", "精酿"];
const defaultFoodKeywords = ["小吃", "面馆", "盖饭", "麻辣烫", "兰州拉面", "沙县小吃", "饺子馆", "米线", "快餐", "家常菜", "简餐", "便利店"];
const defaultRadii = ["1000", "2000", "3000"];

function withPoiStatus(items = [], status = "ok", error = null) {
  return Object.assign(items, {
    poiStatus: status,
    poiError: error,
    poiErrorCode: error?.code || error?.infocode || error?.result?.infocode || "",
    poiErrorMessage: error?.message || error?.info || error?.result?.info || ""
  });
}

function estimatedCostForPoi(poi, fallback = 18) {
  const amapCost = Number(poi?.biz_ext?.cost);
  if (Number.isFinite(amapCost) && amapCost > 0) return Math.round(amapCost);
  const name = poi.name || "";
  if (/便利店|便利蜂|罗森|7-ELEVEn|超市/.test(name)) return 12;
  if (/麦当劳|肯德基|快餐|包子|小吃/.test(name)) return 20;
  if (/面|粉|饺子|馄饨|米线/.test(name)) return 22;
  if (/奶茶|饮品|咖啡/.test(name)) return 16;
  return fallback;
}

function normalizePoi(poi, origin, fallbackCost = 18, source = "amap_web_service") {
  const point = amapLocationToLngLat(poi.location);
  const location = { lat: point.lat, lng: point.lng };
  const estimatedCost = estimatedCostForPoi(poi, fallbackCost);
  return {
    name: poi.name,
    place: poi.name,
    address: poi.address || poi.name,
    lat: point.lat,
    lng: point.lng,
    estimatedCost,
    cost: estimatedCost,
    distance: poi.distance ? Number(poi.distance) : distanceMeters(origin, location),
    mapUrl: buildAmapRouteUrl(origin, { ...location, name: poi.name }),
    source,
    poiId: poi.id,
    type: poi.type
  };
}

function isBudgetFriendly(poi, budget = 50) {
  const text = `${poi.name || ""}${poi.type || ""}`;
  if (expensiveKeywords.some((keyword) => text.includes(keyword))) return false;
  if (budget <= 60 && estimatedCostForPoi(poi, 26) > 25) return false;
  return budgetFriendlyKeywords.some((keyword) => text.includes(keyword)) || estimatedCostForPoi(poi, 26) <= 25;
}

function keywordCandidates(keywords, types) {
  const candidates = String(keywords || "").split("|").map((keyword) => keyword.trim()).filter(Boolean);
  if (types === "050000" || /餐|吃|快餐|小吃|面馆|便利|咖啡|奶茶/.test(keywords || "")) {
    candidates.push(...defaultFoodKeywords);
  }
  return [...new Set(candidates)];
}

function normalizeWebServicePois(data, origin, fallbackCost, radius = Infinity) {
  if (data?.__amapError) return [];
  const pois = Array.isArray(data?.pois) ? data.pois : [];
  return pois
    .filter((poi) => poi.location)
    .map((poi) => normalizePoi(poi, origin, fallbackCost, "amap_web_service"))
    .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng))
    .filter((poi) => poi.distance <= radius)
    .sort((a, b) => a.estimatedCost - b.estimatedCost || a.distance - b.distance);
}

async function searchByAmapWebService({ origin, keywords, types, budget, fallbackCost, name, rawInput }) {
  if (!hasAmapWebServiceKey()) {
    return withPoiStatus([], "missing_web_service_key", {
      code: "missing_web_service_key",
      info: "缺少 VITE_AMAP_WEB_SERVICE_KEY，无法调用高德 Web服务 API。"
    });
  }

  const candidates = keywordCandidates(keywords, types);
  let lastError = null;
  for (const keyword of candidates) {
    for (const radius of defaultRadii) {
      const data = await amapWebServiceGet("/place/around", {
        location: `${origin.lng},${origin.lat}`,
        keywords: keyword,
        types,
        radius,
        city: "北京",
        sortrule: "distance",
        offset: "20",
        page: "1"
      });
      if (data?.__amapError) {
        lastError = { code: data.__amapError, info: data.info, infocode: data.infocode };
        continue;
      }
      const normalized = normalizeWebServicePois(data, origin, fallbackCost, Number(radius));
      if (normalized.length) return withPoiStatus(normalized, "ok");
    }
  }

  const areaName = name || rawInput || "";
  for (const keyword of candidates) {
    const data = await amapWebServiceGet("/place/text", {
      keywords: `${areaName} ${keyword}`.trim(),
      city: "北京",
      citylimit: "true",
      offset: "20",
      page: "1"
    });
    if (data?.__amapError) {
      lastError = { code: data.__amapError, info: data.info, infocode: data.infocode };
      continue;
    }
    const normalized = normalizeWebServicePois(data, origin, fallbackCost, Infinity);
    if (normalized.length) return withPoiStatus(normalized, "ok");
  }

  return withPoiStatus([], "poi_no_result", lastError || { code: "poi_no_result", info: "所有关键词、半径和文本搜索都未返回可用 POI。" });
}

async function searchNearby({ lat, lng, keywords, types, budget, fallbackCost, name, rawInput }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return withPoiStatus([], "invalid_coordinate", { message: "坐标无效。" });
  const origin = { lat, lng };

  const webServiceResult = await searchByAmapWebService({ origin, keywords, types, budget, fallbackCost, name, rawInput });
  if (webServiceResult.poiStatus === "ok" && webServiceResult.length) return webServiceResult;

  try {
    const config = getAmapConfigStatus();
    if (config.status !== "configured") return webServiceResult;
    const keywordList = String(keywords || "").split("|").filter(Boolean);
    const jsResult = types === "050000" || /餐|吃|快餐|小吃|面馆|便利|咖啡|奶茶/.test(keywords)
      ? await searchNearbyFoodByJsApi({ location: origin, budget, keywords: keywordList.length ? keywordList : undefined, types, fallbackCost })
      : await searchPoiByJsApi({ keyword: keywordList[0] || keywords, location: origin, radius: 1000, types, fallbackCost });
    if (jsResult.status === "ok" && jsResult.pois?.length) return withPoiStatus(jsResult.pois, "ok");
    if (webServiceResult?.poiStatus && !["missing_web_service_key", "poi_no_result"].includes(webServiceResult.poiStatus)) {
      return webServiceResult;
    }
    return withPoiStatus([], jsResult.status === "poi_failed" ? "poi_failed" : "poi_no_result", jsResult);
  } catch (error) {
    if (isAmapKeyError(error?.code)) return withPoiStatus([], "amap_key_error", error);
    console.error("PlaceSearch failed:", "error", error);
    return withPoiStatus([], error?.code === "missing_key" || error?.code === "missing_security_code" ? error.code : "poi_failed", error);
  }
}

export async function searchNearbyBudgetFood({ lat, lng, budget = 50, name, rawInput }) {
  return searchNearby({ lat, lng, budget, name, rawInput, keywords: defaultFoodKeywords.join("|"), types: "050000", fallbackCost: budget <= 60 ? 18 : 25 });
}

export async function searchNearbyConvenienceStores({ lat, lng, name, rawInput }) {
  return searchNearby({ lat, lng, budget: 50, name, rawInput, keywords: "便利店|便利蜂|罗森|7-ELEVEn|全家|物美便利店|京客隆便利店", types: "060100", fallbackCost: 12 });
}

export async function searchNearbyDrinkShops({ lat, lng, budget = 50, name, rawInput }) {
  return searchNearby({ lat, lng, budget, name, rawInput, keywords: "蜜雪冰城|茶百道|瑞幸咖啡|库迪咖啡|奶茶|饮品|咖啡", types: "050000", fallbackCost: budget <= 60 ? 14 : 22 });
}

export async function searchNearbyFreeActivities({ lat, lng }) {
  return searchNearby({ lat, lng, budget: 50, keywords: "公园|广场|书店|商场", types: "110000|060000|141200", fallbackCost: 0 });
}

export async function searchNearbyComfortStops(location) {
  const { lat, lng, name, rawInput } = location || {};
  return searchNearby({ lat, lng, budget: 50, name, rawInput, keywords: "书店|商场|咖啡|公园|文化中心|图书馆", types: "060000|050000|110000|141200", fallbackCost: 0 });
}

export function selectBestBudgetPoi(pois, budget = 50) {
  if (!Array.isArray(pois) || !pois.length) return null;
  const sorted = [...pois].sort((a, b) => a.estimatedCost - b.estimatedCost || a.distance - b.distance);
  const budgetFriendly = sorted.filter((poi) => budget > 60 || poi.estimatedCost <= 25);
  return budgetFriendly[0] || sorted[0] || null;
}

export function selectBestPoiByDistanceAndBudget(pois, budget = 50) {
  return selectBestBudgetPoi(pois, budget);
}
