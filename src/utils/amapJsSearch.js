import { loadAmap } from "./amapClient.js";
import { amapLocationToLngLat, buildAmapRouteUrl, distanceMeters } from "./amapService.js";

const DEFAULT_RADII = [1000, 2000, 3000];
const FOOD_KEYWORDS = ["小吃", "面馆", "盖饭", "麻辣烫", "兰州拉面", "沙县小吃", "快餐", "便利店", "咖啡", "书店", "商场"];

function statusDetail(status, result) {
  return [result?.info, result?.infocode].filter(Boolean).join(" / ") || status;
}

function estimatedCostForName(name = "", fallback = 18) {
  if (/便利店|便利蜂|罗森|7-ELEVEn|全家|超市/.test(name)) return 12;
  if (/包子|粥|煎饼|小吃/.test(name)) return 16;
  if (/奶茶|饮品|咖啡/.test(name)) return 18;
  if (/面馆|兰州|拉面|米线|粉|饺子|馄饨|沙县/.test(name)) return 22;
  if (/麻辣烫|盖饭|快餐|麦当劳|肯德基|黄焖鸡/.test(name)) return 24;
  return fallback;
}

function normalizePoi(poi, origin, fallbackCost = 18) {
  const point = amapLocationToLngLat(poi.location);
  const location = { lat: point.lat, lng: point.lng };
  const estimatedCost = estimatedCostForName(poi.name, fallbackCost);
  return {
    name: poi.name,
    address: poi.address || poi.name,
    lat: point.lat,
    lng: point.lng,
    estimatedCost,
    cost: estimatedCost,
    distance: poi.distance ? Number(poi.distance) : distanceMeters(origin, location),
    mapUrl: buildAmapRouteUrl(origin, { ...location, name: poi.name }),
    source: "amap_js_api",
    poiId: poi.id,
    type: poi.type
  };
}

async function runPlaceSearch(keyword, location, radius, options = {}) {
  const AMap = await loadAmap();
  if (!AMap.PlaceSearch) {
    const error = { status: "poi_failed", info: "AMap.PlaceSearch 插件没加载。" };
    console.error("PlaceSearch failed:", "error", error);
    return { status: "poi_failed", pois: [], info: error.info };
  }
  const placeSearch = new AMap.PlaceSearch({
    city: "北京",
    citylimit: true,
    pageSize: options.pageSize || 10,
    extensions: "all",
    type: options.types
  });

  return new Promise((resolve) => {
    placeSearch.searchNearBy(keyword, [location.lng, location.lat], radius, (status, result) => {
      console.error("PlaceSearch status/result:", status, result);
      if (status === "complete") {
        const pois = result?.poiList?.pois || [];
        resolve({ status: pois.length ? "ok" : "poi_no_result", pois, info: statusDetail(status, result), result });
        return;
      }
      if (status === "no_data") {
        resolve({ status: "poi_no_result", pois: [], info: statusDetail(status, result), result });
        return;
      }
      console.error("PlaceSearch failed:", status, result);
      resolve({ status: "poi_failed", pois: [], info: statusDetail(status, result), infocode: result?.infocode, result });
    });
  });
}

export async function searchPoiByJsApi({ keyword, location, radius = 1000, types, fallbackCost = 18 }) {
  if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) {
    return { status: "invalid_coordinate", pois: [], info: "坐标无效。" };
  }
  const result = await runPlaceSearch(keyword, location, radius, { types });
  return {
    ...result,
    pois: result.pois.map((poi) => normalizePoi(poi, location, fallbackCost))
  };
}

export async function searchNearbyFoodByJsApi({ location, budget = 50, keywords = FOOD_KEYWORDS, types = "050000|060100", fallbackCost = 18 }) {
  if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) {
    return { status: "invalid_coordinate", pois: [], info: "坐标无效。" };
  }
  let last = { status: "poi_no_result", pois: [], info: "" };
  for (const radius of DEFAULT_RADII) {
    for (const keyword of keywords) {
      const result = await searchPoiByJsApi({ keyword, location, radius, types, fallbackCost });
      if (result.status === "ok" && result.pois.length) {
        const budgetLimit = budget <= 60 ? 32 : Math.max(45, budget * 0.45);
        const pois = result.pois
          .filter((poi) => poi.estimatedCost <= budgetLimit)
          .sort((a, b) => a.estimatedCost - b.estimatedCost || a.distance - b.distance);
        if (pois.length) return { ...result, pois };
      }
      last = result;
    }
  }
  return { ...last, status: last.status === "poi_failed" ? "poi_failed" : "poi_no_result", pois: [] };
}

export async function geocodeByJsApi(address) {
  try {
    const AMap = await loadAmap();
    if (!AMap.Geocoder) return { status: "geocode_failed", info: "AMap.Geocoder 插件没加载。" };
    const geocoder = new AMap.Geocoder({ city: "北京" });
    return await new Promise((resolve) => {
      geocoder.getLocation(address, (status, result) => {
        console.error("Geocoder status/result:", status, result);
        if (status === "complete" && result?.geocodes?.length) {
          const first = result.geocodes[0];
          resolve({ status: "ok", location: amapLocationToLngLat(first.location), raw: first });
          return;
        }
        resolve({ status: "geocode_failed", info: statusDetail(status, result), result });
      });
    });
  } catch (error) {
    console.error("Geocoder status/result:", "error", error);
    return { status: "geocode_failed", info: error?.message || "地理编码失败。", error };
  }
}

export async function planTransferByJsApi({ from, to }) {
  if (!Number.isFinite(from?.lng) || !Number.isFinite(from?.lat) || !Number.isFinite(to?.lng) || !Number.isFinite(to?.lat)) {
    return { status: "invalid_coordinate", info: "坐标无效。" };
  }
  try {
    const AMap = await loadAmap();
    if (!AMap.Transfer) return { status: "route_failed", info: "AMap.Transfer 插件没加载。" };
    const transfer = new AMap.Transfer({ city: "北京市", cityd: "北京市", policy: AMap.TransferPolicy?.LEAST_TIME });
    return await new Promise((resolve) => {
      transfer.search([from.lng, from.lat], [to.lng, to.lat], (status, result) => {
        console.error("Transfer status/result:", status, result);
        if (status === "complete" && result?.plans?.length) {
          resolve({ status: "ok", plan: result.plans[0], result });
          return;
        }
        resolve({ status: status === "no_data" ? "route_no_result" : "route_failed", info: statusDetail(status, result), result });
      });
    });
  } catch (error) {
    console.error("Transfer status/result:", "error", error);
    return { status: "route_failed", info: error?.message || "路线规划失败。", error };
  }
}
