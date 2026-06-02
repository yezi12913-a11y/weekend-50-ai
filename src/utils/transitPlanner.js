import { buildAmapRouteUrl, distanceMeters } from "./amapService.js";
import { fallbackTransitFromLocation, findNearbyBusStops, findNearbySubwayStations, selectBestTransitStation } from "./nearbyTransit.js";

export function estimateTransitCostByDistance(distance) {
  if (!Number.isFinite(distance)) return 12;
  const km = distance / 1000;
  if (km <= 4) return 4;
  if (km <= 10) return 8;
  if (km <= 22) return 12;
  if (km <= 38) return 18;
  return 22;
}

function estimateDuration(distance) {
  if (!Number.isFinite(distance)) return "45-75分钟";
  const minutes = Math.max(18, Math.round(distance / 1000 * 3.2 + 18));
  return `${minutes}-${minutes + 18}分钟`;
}

export function summarizeTransitPlan(plan) {
  if (!plan) return "";
  if (plan.primaryStartStation?.type === "subway") {
    return `从${plan.primaryStartStation.name}乘地铁出发，根据地图实时路线换乘，到达${plan.primaryEndStation.name}后步行到${plan.destinationName}。交通费按往返约 ${plan.estimatedTransportCost} 元估算。`;
  }
  return `建议从${plan.fromName}前往${plan.primaryStartStation?.name || plan.startStation}，乘地铁/公交前往${plan.primaryEndStation?.name || plan.endStation}，下车后步行到${plan.destinationName}。交通费按往返约 ${plan.estimatedTransportCost} 元估算。`;
}

export function selectStartTransitStation(location, subwayStations = [], busStations = []) {
  if (location?.type === "subway_station") {
    return {
      name: location.name,
      type: "subway",
      lines: location.subwayLines || [],
      lat: location.lat,
      lng: location.lng,
      reason: "用户输入的是地铁站，因此优先从该地铁站出发"
    };
  }
  if (location?.type === "railway_station") {
    return {
      name: location.name,
      type: "railway_station",
      lines: location.subwayLines || [],
      lat: location.lat,
      lng: location.lng,
      reason: "用户输入的是交通枢纽，因此从该站点出发"
    };
  }
  const subway = selectBestTransitStation(subwayStations, location);
  if (subway) return { ...subway, type: "subway", lines: subway.lines || [], reason: "默认地铁优先，选择附近地铁站作为主出发站" };
  const bus = selectBestTransitStation(busStations, location);
  if (bus) return { ...bus, type: "bus", lines: [], reason: "附近没有更合适地铁站，使用公交作为主出发站" };
  return { name: location?.name || "当前位置", type: "walking_start", lines: [], lat: location?.lat, lng: location?.lng, reason: "未找到附近站点，先按步行起点处理" };
}

export function selectEndTransitStation(destination, subwayStations = [], busStations = []) {
  const subway = selectBestTransitStation(subwayStations, destination);
  if (subway) return { ...subway, type: "subway", lines: subway.lines || [], exitSuggestion: "出站后按地图步行到目的地" };
  if (destination?.type === "railway_station") return { name: destination.name, type: "railway_station", lines: destination.subwayLines || [], lat: destination.lat, lng: destination.lng, exitSuggestion: "按站内导视出站" };
  const bus = selectBestTransitStation(busStations, destination);
  if (bus) return { ...bus, type: "bus", lines: [], exitSuggestion: "下车后步行到目的地" };
  return { name: destination?.name || "目的地", type: "walking_start", lines: [], lat: destination?.lat, lng: destination?.lng, exitSuggestion: "按地图步行到目的地" };
}

export async function planTransitRoute({ from, to }) {
  const distance = distanceMeters(from, to);
  const [startSubwayFromApi, startBusFromApi, endSubwayFromApi, endBusFromApi] = await Promise.all([
    findNearbySubwayStations(from?.lat, from?.lng),
    findNearbyBusStops(from?.lat, from?.lng),
    findNearbySubwayStations(to?.lat, to?.lng),
    findNearbyBusStops(to?.lat, to?.lng)
  ]);
  const startFallback = fallbackTransitFromLocation(from);
  const endFallback = fallbackTransitFromLocation(to);
  const startSubway = startSubwayFromApi.length ? startSubwayFromApi : startFallback.subway;
  const startBus = startBusFromApi.length ? startBusFromApi : startFallback.bus;
  const endSubway = endSubwayFromApi.length ? endSubwayFromApi : endFallback.subway;
  const endBus = endBusFromApi.length ? endBusFromApi : endFallback.bus;
  const primaryStartStation = selectStartTransitStation(from, startSubway, startBus);
  const primaryEndStation = selectEndTransitStation(to, endSubway, endBus);
  const estimatedTransportCost = estimateTransitCostByDistance(distance);

  const plan = {
    fromName: from?.name || from?.rawInput || "出发地",
    fromType: from?.type || "place",
    fromAddress: from?.address || "",
    fromLat: from?.lat,
    fromLng: from?.lng,
    primaryStartStation,
    nearbyBusStops: startBus,
    nearbySubwayStations: startSubway,
    startStation: primaryStartStation.name,
    startStationType: primaryStartStation.type,
    endStation: primaryEndStation.name,
    endStationType: primaryEndStation.type,
    destinationName: to?.name || "目的地",
    destinationAddress: to?.address || "",
    destinationLat: to?.lat,
    destinationLng: to?.lng,
    primaryEndStation,
    estimatedDuration: estimateDuration(distance),
    estimatedDistance: Number.isFinite(distance) ? `${(distance / 1000).toFixed(1)}公里` : "按地图导航为准",
    estimatedTransportCost,
    mapRouteUrl: buildAmapRouteUrl(from, to)
  };
  return { ...plan, transitSummary: summarizeTransitPlan(plan) };
}
