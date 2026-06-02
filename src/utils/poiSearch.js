import { amapGet, amapLocationToLngLat, buildAmapRouteUrl, distanceMeters } from "./amapService.js";
import { findNearestFallbackPoiGroup } from "../data/beijingFallbackPois.js";

const budgetFriendlyKeywords = ["麦当劳", "肯德基", "便利店", "便利蜂", "罗森", "7-ELEVEn", "面馆", "包子", "小吃", "快餐", "奶茶"];
const expensiveKeywords = ["酒吧", "西餐", "牛排", "日料", "烧肉", "海鲜", "私房菜", "高端", "会所", "精酿"];

function estimatedCostForPoi(poi, fallback = 18) {
  const name = poi.name || "";
  if (/便利店|便利蜂|罗森|7-ELEVEn|超市/.test(name)) return 12;
  if (/麦当劳|肯德基|快餐|包子|小吃/.test(name)) return 20;
  if (/面|粉|饺子|馄饨|米线/.test(name)) return 22;
  if (/奶茶|饮品|咖啡/.test(name)) return 16;
  return fallback;
}

function normalizePoi(poi, origin, fallbackCost = 18) {
  const point = amapLocationToLngLat(poi.location);
  const location = { lat: point.lat, lng: point.lng };
  const estimatedCost = estimatedCostForPoi(poi, fallbackCost);
  return {
    name: poi.name,
    address: poi.address || poi.name,
    lat: point.lat,
    lng: point.lng,
    estimatedCost,
    cost: estimatedCost,
    distance: poi.distance ? Number(poi.distance) : distanceMeters(origin, location),
    mapUrl: buildAmapRouteUrl(origin, { ...location, name: poi.name }),
    source: "amap_poi",
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

async function searchNearby({ lat, lng, keywords, types, budget, fallbackCost }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const origin = { lat, lng };
  const data = await amapGet("/place/around", {
    location: `${lng},${lat}`,
    keywords,
    types,
    radius: "1000",
    sortrule: "distance",
    offset: "15",
    page: "1"
  });
  const pois = Array.isArray(data?.pois) ? data.pois : [];
  return pois
    .filter((poi) => poi.location && isBudgetFriendly(poi, budget))
    .map((poi) => normalizePoi(poi, origin, fallbackCost))
    .filter((poi) => poi.distance <= 1000)
    .sort((a, b) => a.estimatedCost - b.estimatedCost || a.distance - b.distance);
}

function fallbackPois(location, key) {
  const group = findNearestFallbackPoiGroup(location);
  return (group?.[key] || []).map((poi) => ({
    ...poi,
    mapUrl: poi.mapUrl || buildAmapRouteUrl(location, poi),
    source: "fallback_poi"
  }));
}

export async function searchNearbyBudgetFood({ lat, lng, budget = 50, name, rawInput }) {
  const found = await searchNearby({ lat, lng, budget, keywords: "快餐|面馆|小吃|包子|麦当劳|肯德基|庆丰包子铺|和合谷|永和大王|吉野家", types: "050000", fallbackCost: budget <= 60 ? 18 : 25 });
  return found.length ? found : fallbackPois({ lat, lng, name, rawInput }, "nearbyBudgetFoodPois");
}

export async function searchNearbyConvenienceStores({ lat, lng, name, rawInput }) {
  const found = await searchNearby({ lat, lng, budget: 50, keywords: "便利店|便利蜂|罗森|7-ELEVEn|全家|物美便利店|京客隆便利店", types: "060100", fallbackCost: 12 });
  return found.length ? found : fallbackPois({ lat, lng, name, rawInput }, "nearbyConveniencePois");
}

export async function searchNearbyDrinkShops({ lat, lng, budget = 50, name, rawInput }) {
  const found = await searchNearby({ lat, lng, budget, keywords: "蜜雪冰城|茶百道|瑞幸咖啡|库迪咖啡|奶茶|饮品|咖啡", types: "050000", fallbackCost: budget <= 60 ? 14 : 22 });
  return found.length ? found : fallbackPois({ lat, lng, name, rawInput }, "nearbyConveniencePois");
}

export async function searchNearbyFreeActivities({ lat, lng }) {
  return searchNearby({ lat, lng, budget: 50, keywords: "公园|广场|书店|商场", types: "110000|060000|141200", fallbackCost: 0 });
}

export async function searchNearbyComfortStops(location) {
  const { lat, lng, name, rawInput } = location || {};
  const found = await searchNearby({ lat, lng, budget: 50, keywords: "书店|商场|咖啡|公园|文化中心|图书馆", types: "060000|050000|110000|141200", fallbackCost: 0 });
  return found.length ? found : fallbackPois({ lat, lng, name, rawInput }, "nearbyComfortPois");
}

export function selectBestBudgetPoi(pois, budget = 50) {
  if (!Array.isArray(pois) || !pois.length) return null;
  return [...pois]
    .filter((poi) => budget > 60 || poi.estimatedCost <= 25)
    .sort((a, b) => a.estimatedCost - b.estimatedCost || a.distance - b.distance)[0] || null;
}

export function selectBestPoiByDistanceAndBudget(pois, budget = 50) {
  return selectBestBudgetPoi(pois, budget);
}
