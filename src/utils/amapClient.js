const AMAP_JS_API_BASE = "https://webapi.amap.com/maps";

export function getAmapBrowserConfig() {
  return {
    key: import.meta.env?.VITE_AMAP_KEY || "",
    securityCode: import.meta.env?.VITE_AMAP_SECURITY_CODE || ""
  };
}

export function getAmapWebServiceKey() {
  return import.meta.env?.VITE_AMAP_WEB_SERVICE_KEY || import.meta.env?.VITE_AMAP_KEY || "";
}

export function hasAmapBrowserConfig() {
  const { key, securityCode } = getAmapBrowserConfig();
  return Boolean(key && securityCode);
}

export function loadAmapJsApi() {
  const { key, securityCode } = getAmapBrowserConfig();
  if (!key || !securityCode || typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("AMap browser key is not configured."));
  }

  window._AMapSecurityConfig = { securityJsCode: securityCode };
  if (window.AMap) return Promise.resolve(window.AMap);

  const existing = document.querySelector("script[data-weekend-amap='true']");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.AMap));
      existing.addEventListener("error", () => reject(new Error("AMap script failed to load.")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.weekendAmap = "true";
    script.src = `${AMAP_JS_API_BASE}?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Scale,AMap.ToolBar`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = () => reject(new Error("AMap script failed to load."));
    document.head.appendChild(script);
  });
}
