const AMAP_PLUGINS = [
  "AMap.PlaceSearch",
  "AMap.Geocoder",
  "AMap.AutoComplete",
  "AMap.Transfer",
  "AMap.Walking",
  "AMap.ToolBar",
  "AMap.Scale"
];

let amapPromise = null;
let amapInstance = null;

export const AMAP_KEY_ERROR_CODES = [
  "INVALID_USER_KEY",
  "INVALID_USER_SCODE",
  "USERKEY_PLAT_NOMATCH",
  "INVALID_USER_DOMAIN"
];

export function getAmapConfigStatus() {
  const hasKey = Boolean(import.meta.env?.VITE_AMAP_KEY);
  const hasSecurityCode = Boolean(import.meta.env?.VITE_AMAP_SECURITY_CODE);
  if (hasKey && hasSecurityCode) return { status: "configured", hasKey, hasSecurityCode, label: "已配置高德 Key，正在使用真实 POI。" };
  if (!hasKey) return { status: "missing_key", hasKey, hasSecurityCode, label: "缺少 VITE_AMAP_KEY。" };
  return { status: "missing_security_code", hasKey, hasSecurityCode, label: "缺少 VITE_AMAP_SECURITY_CODE。" };
}

export function hasAmapConfig() {
  return getAmapConfigStatus().status === "configured";
}

export function getAmap() {
  return amapInstance || (typeof window !== "undefined" ? window.AMap : null) || null;
}

function normalizeAmapError(error) {
  if (!error) return { code: "route_failed", message: "地图服务调用失败。", raw: error };
  const text = typeof error === "string" ? error : JSON.stringify(error);
  const code = AMAP_KEY_ERROR_CODES.find((item) => text.includes(item)) || "route_failed";
  return { code, message: amapErrorMessage(code), raw: error };
}

export function isAmapKeyError(code) {
  return AMAP_KEY_ERROR_CODES.includes(code);
}

export function amapErrorMessage(code) {
  const messages = {
    INVALID_USER_KEY: "Key 错误或 Key 不存在。",
    INVALID_USER_SCODE: "安全密钥错误或设置顺序错误。",
    USERKEY_PLAT_NOMATCH: "Key 平台类型不匹配。",
    INVALID_USER_DOMAIN: "域名白名单不匹配。",
    map_loaded: "地图加载成功。",
    missing_web_service_key: "真实地图已加载，但实时店铺/路线接口需要 Web服务 Key。请检查 .env 中的 VITE_AMAP_WEB_SERVICE_KEY。",
    poi_no_result: "地图已加载，但附近暂未搜索到合适店铺，可重新生成或扩大搜索范围。",
    poi_failed: "POI 搜索失败。",
    route_no_result: "地图已加载，但本次路线规划未返回结果，已使用估算交通信息。",
    route_failed: "路线规划失败，已使用估算交通信息。",
    partial_map_result: "地图已加载，部分店铺或路线信息未返回，已保留可参考路线。",
    amap_web_service_error: "高德 Web服务返回异常。",
    http_error: "高德 Web服务 HTTP 请求失败。",
    invalid_coordinate: "地图坐标无效。"
  };
  return messages[code] || "地图服务调用未返回可用结果。";
}

export function getAmapPoiFailureMessage(code, detail = "") {
  if (code === "missing_key") return "当前未配置高德地图 Key，无法获取实时店铺。";
  if (code === "missing_security_code") return "当前缺少高德安全密钥，地图服务可能无法正常调用。";
  if (code === "amap_key_error") return "高德地图 Key 或安全密钥配置异常，请检查高德控制台配置。";
  if (isAmapKeyError(code)) return "高德地图 Key 或安全密钥配置异常，请检查高德控制台配置。";
  if (code === "missing_web_service_key") return "真实地图已加载，但实时店铺/路线接口需要 Web服务 Key。请检查 .env 中的 VITE_AMAP_WEB_SERVICE_KEY。";
  if (code === "poi_no_result") return "地图已加载，但附近暂未搜索到合适店铺，可重新生成或扩大搜索范围。";
  if (code === "poi_failed") return detail ? `POI 搜索失败：${detail}` : "POI 搜索失败。";
  if (code === "route_no_result") return "地图已加载，但本次路线规划未返回结果，已使用估算交通信息。";
  if (code === "route_failed") return detail ? `路线规划失败：${detail}` : "路线规划失败，已使用估算交通信息。";
  if (code === "partial_map_result") return "地图已加载，部分店铺或路线信息未返回，已保留可参考路线。";
  if (code === "amap_web_service_error") return detail ? `高德 Web服务返回异常：${detail}` : "高德 Web服务返回异常。";
  if (code === "http_error") return detail ? `高德 Web服务 HTTP 请求失败：${detail}` : "高德 Web服务 HTTP 请求失败。";
  if (code === "invalid_coordinate") return "地图坐标无效，暂未获取到真实店铺。";
  if (code === "map_loaded") return "地图加载成功。";
  return detail || amapErrorMessage(code);
}

export async function loadAmap() {
  const config = getAmapConfigStatus();
  if (config.status !== "configured") {
    const error = { code: config.status, message: config.label };
    throw error;
  }
  if (typeof window === "undefined") {
    const error = { code: "route_failed", message: "AMap JS API 只能在浏览器环境加载。" };
    console.error("AMap load error:", error);
    throw error;
  }
  if (amapInstance) return amapInstance;
  if (!amapPromise) {
    window._AMapSecurityConfig = {
      securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE
    };
    amapPromise = import("@amap/amap-jsapi-loader")
      .then((module) => module.default.load({
        key: import.meta.env.VITE_AMAP_KEY,
        version: "2.0",
        plugins: AMAP_PLUGINS
      }))
      .then((AMap) => {
        amapInstance = AMap;
        const missingPlugin = AMAP_PLUGINS.find((plugin) => {
          const name = plugin.replace("AMap.", "");
          return !AMap[name];
        });
        if (missingPlugin) {
          const error = { code: "route_failed", message: `${missingPlugin} 插件没加载。` };
          console.error("AMap load error:", error);
          throw error;
        }
        return AMap;
      })
      .catch((error) => {
        const normalized = normalizeAmapError(error);
        console.error("AMap load error:", normalized.raw || normalized);
        amapPromise = null;
        throw normalized;
      });
  }
  return amapPromise;
}
