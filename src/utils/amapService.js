const AMAP_REST_BASE = "https://restapi.amap.com/v3";
const AMAP_WEB_SERVICE_KEY = import.meta.env.VITE_AMAP_WEB_SERVICE_KEY;

const EMPTY_AMAP_RESULT = {
  status: "0",
  info: "NETWORK_ERROR",
  infocode: "FETCH_FAILED",
  count: "0",
  pois: [],
  tips: [],
  geocodes: [],
  districts: [],
  route: { paths: [], transits: [] }
};

function emptyAmapResult() {
  return {
    ...EMPTY_AMAP_RESULT,
    pois: [],
    tips: [],
    geocodes: [],
    districts: [],
    route: { paths: [], transits: [] }
  };
}

export async function safeFetchAmap(url) {
  if (typeof fetch !== "function") {
    return {
      ok: false,
      data: emptyAmapResult(),
      error: { code: "FETCH_UNAVAILABLE", message: "当前环境不支持 fetch。" }
    };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("AMap WebService HTTP error:", response.status, response.statusText);
      return {
        ok: false,
        data: {
          ...emptyAmapResult(),
          info: `HTTP ${response.status}`,
          infocode: String(response.status)
        },
        error: { code: String(response.status), message: response.statusText }
      };
    }

    try {
      return { ok: true, data: await response.json(), error: null };
    } catch (error) {
      console.error("AMap WebService JSON parse error:", error);
      return {
        ok: false,
        data: emptyAmapResult(),
        error: { code: "FETCH_FAILED", message: error?.message || "JSON parse failed" }
      };
    }
  } catch (error) {
    console.error("AMap WebService network error:", error);
    return {
      ok: false,
      data: emptyAmapResult(),
      error: { code: "FETCH_FAILED", message: error?.message || "fetch failed" }
    };
  }
}

export function getAmapWebServiceKey() {
  return AMAP_WEB_SERVICE_KEY || "";
}

export function hasAmapWebServiceKey() {
  return Boolean(getAmapWebServiceKey());
}

export async function amapWebServiceGet(path, params = {}) {
  const webServiceKey = getAmapWebServiceKey();
  if (!webServiceKey) {
    return {
      __amapError: "missing_web_service_key",
      info: "缺少 VITE_AMAP_WEB_SERVICE_KEY，无法调用高德 Web服务 API。"
    };
  }
  const search = new URLSearchParams({ ...params, key: webServiceKey, city: params.city || "北京", output: "json" });
  const result = await safeFetchAmap(`${AMAP_REST_BASE}${path}?${search.toString()}`);
  const data = result.data;
  if (!result.ok && data.infocode === "FETCH_FAILED") {
    return data;
  }
  if (!result.ok) {
    return {
      __amapError: data.infocode === "FETCH_UNAVAILABLE" ? "amap_web_service_error" : "http_error",
      info: data.info,
      infocode: data.infocode
    };
  }
  if (data.status !== "1") {
    console.error("AMap WebService API error:", data);
    return {
      __amapError: data.infocode || "amap_web_service_error",
      info: data.info || "高德 Web服务返回异常",
      infocode: data.infocode
    };
  }
  return data;
}

export function amapLocationToLngLat(location) {
  if (!location) return {};
  if (typeof location.getLng === "function" && typeof location.getLat === "function") {
    const lng = Number(location.getLng());
    const lat = Number(location.getLat());
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
  }
  if (Array.isArray(location)) {
    const [lng, lat] = location.map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
  }
  if (typeof location === "object") {
    const lng = Number(location.lng ?? location.longitude);
    const lat = Number(location.lat ?? location.latitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
  }
  if (typeof location !== "string") return {};
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
