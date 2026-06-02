const AMAP_REST_BASE = "https://restapi.amap.com/v3";

export function getAmapKey() {
  return import.meta.env?.VITE_AMAP_KEY || "";
}

export function hasAmapKey() {
  return Boolean(getAmapKey());
}

export async function amapGet(path, params = {}) {
  const key = getAmapKey();
  if (!key || typeof fetch !== "function") return null;

  const search = new URLSearchParams({ ...params, key, city: params.city || "北京", output: "json" });
  const response = await fetch(`${AMAP_REST_BASE}${path}?${search.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== "1") return null;
  return data;
}

export function amapLocationToLngLat(location) {
  if (!location || typeof location !== "string") return {};
  const [lng, lat] = location.split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
}

export function distanceMeters(a, b) {
  if (!Number.isFinite(a?.lat) || !Number.isFinite(a?.lng) || !Number.isFinite(b?.lat) || !Number.isFinite(b?.lng)) {
    return Infinity;
  }
  const earthRadius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function buildAmapRouteUrl(from, to) {
  if (!from || !to || !Number.isFinite(from.lat) || !Number.isFinite(from.lng) || !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) {
    return "";
  }
  const fromName = encodeURIComponent(from.name || "出发地");
  const toName = encodeURIComponent(to.name || "目的地");
  return `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${fromName}&to=${to.lng},${to.lat},${toName}&mode=bus&policy=1&src=weekend-50-ai&callnative=1`;
}
