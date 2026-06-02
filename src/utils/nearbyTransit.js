import { amapGet, amapLocationToLngLat, distanceMeters } from "./amapService.js";

function normalizeTransitPoi(poi, type, origin) {
  const point = amapLocationToLngLat(poi.location);
  return {
    name: poi.name,
    address: poi.address || poi.name,
    lat: point.lat,
    lng: point.lng,
    type,
    distance: poi.distance ? Number(poi.distance) : distanceMeters(origin, point),
    source: "amap",
    poiId: poi.id
  };
}

async function searchAround({ lat, lng, keywords, types }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const data = await amapGet("/place/around", {
    location: `${lng},${lat}`,
    keywords,
    types,
    radius: "1200",
    sortrule: "distance",
    offset: "8",
    page: "1"
  });
  return Array.isArray(data?.pois) ? data.pois : [];
}

export async function findNearbySubwayStations(lat, lng) {
  const origin = { lat, lng };
  const pois = await searchAround({ lat, lng, keywords: "地铁站", types: "150500" });
  return pois.map((poi) => normalizeTransitPoi(poi, "subway", origin)).slice(0, 4);
}

export async function findNearbyBusStops(lat, lng) {
  const origin = { lat, lng };
  const pois = await searchAround({ lat, lng, keywords: "公交站", types: "150700" });
  return pois.map((poi) => normalizeTransitPoi(poi, "bus", origin)).slice(0, 4);
}

export function selectBestTransitStation(stations, destination) {
  if (!Array.isArray(stations) || !stations.length) return null;
  const destinationText = `${destination?.name || ""}${destination?.district || ""}`;
  return [...stations].sort((a, b) => {
    const aBonus = destinationText && a.name.includes(destinationText) ? -200 : 0;
    const bBonus = destinationText && b.name.includes(destinationText) ? -200 : 0;
    return (a.distance + aBonus) - (b.distance + bBonus);
  })[0];
}

export function fallbackTransitFromLocation(location) {
  const subway = (location?.nearestSubwayStations || []).map((name, index) => ({
    name,
    type: "subway",
    distance: index === 0 ? 600 : 900,
    source: location.source || "fallback"
  }));
  const bus = (location?.nearestBusStops || []).map((name, index) => ({
    name,
    type: "bus",
    distance: index === 0 ? 400 : 700,
    source: location.source || "fallback"
  }));
  return { subway, bus };
}
