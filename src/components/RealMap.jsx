import { useEffect, useMemo, useRef, useState } from "react";
import { beijingStartAreaCenters } from "../data/realPlaces.js";
import { buildAmapNavigationUrl, buildAmapSearchUrl } from "../utils/mapLinks.js";
import { detectStartArea } from "../startArea.js";

function getStartCenter(form) {
  if (Number.isFinite(form?.startLocation?.lat) && Number.isFinite(form?.startLocation?.lng)) {
    return { name: form.startLocation.name || form.start || "出发地", lat: form.startLocation.lat, lng: form.startLocation.lng };
  }
  const area = detectStartArea(form?.start || "");
  return beijingStartAreaCenters[area] || beijingStartAreaCenters["通用区域"];
}

function validPoint(step) {
  return step.costType !== "transport" && Number.isFinite(step.lat) && Number.isFinite(step.lng);
}

function MapPlaceholder({ route, form }) {
  const start = getStartCenter(form);
  return (
    <section className="rounded-[28px] bg-white/90 p-5 shadow-soft">
      <div className="rounded-2xl bg-skysoft/80 p-5">
        <p className="text-sm font-black text-leaf">路线预览模式</p>
        <h3 className="mt-2 text-xl font-black text-ink">真实地图需要配置高德地图 Key，当前显示为路线预览模式。</h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          本地创建 `.env` 并配置 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE` 后，会显示真实地图、marker 和弹窗。
        </p>
      </div>
      <div className="mt-4 rounded-2xl bg-mint/60 p-4">
        <p className="text-xs font-bold text-slate-500">出发地大致位置</p>
        <p className="mt-1 font-black text-ink">{form?.start || start.name}</p>
      </div>
      <div className="mt-4 space-y-3">
        {route?.steps?.filter((step) => step.costType !== "transport").map((step) => (
          <a
            key={step.id}
            href={buildAmapNavigationUrl(step)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-slate-50 p-4 transition hover:bg-cream"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-ink">{step.place}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{step.address}</p>
              </div>
              <span className="shrink-0 rounded-full bg-ink px-3 py-2 text-xs font-black text-white">打开地图</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function RealMap({ route, form }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [error, setError] = useState("");
  const amapKey = import.meta.env.VITE_AMAP_KEY;
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
  const startCenter = useMemo(() => getStartCenter(form), [form]);
  const points = useMemo(() => route?.steps?.filter(validPoint) || [], [route]);

  useEffect(() => {
    if (!amapKey || !securityCode || !mapRef.current || !route) return undefined;

    let disposed = false;
    window._AMapSecurityConfig = { securityJsCode: securityCode };

    import("@amap/amap-jsapi-loader")
      .then((module) => module.default.load({
      key: amapKey,
      version: "2.0",
      plugins: ["AMap.Scale", "AMap.ToolBar"]
    }))
      .then((AMap) => {
        if (disposed || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
          mapInstanceRef.current = null;
        }

        const center = points[0] ? [points[0].lng, points[0].lat] : [startCenter.lng, startCenter.lat];
        const map = new AMap.Map(mapRef.current, {
          center,
          zoom: 12,
          viewMode: "2D"
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: "RB" }));

        const markers = [];
        const startMarker = new AMap.Marker({
          position: [startCenter.lng, startCenter.lat],
          title: form?.start || startCenter.name,
          content: '<div class="amap-custom-marker amap-start-marker">起</div>'
        });
        map.add(startMarker);
        markers.push(startMarker);

        points.forEach((step, index) => {
          const marker = new AMap.Marker({
            position: [step.lng, step.lat],
            title: step.place,
            content: `<div class="amap-custom-marker">${index + 1}</div>`
          });

          const infoWindow = new AMap.InfoWindow({
            offset: new AMap.Pixel(0, -28),
            content: `
              <div class="amap-info-card">
                <strong>${step.place}</strong>
                <p>${step.address}</p>
                <p>最近地铁：${step.nearestSubway}</p>
                <p>预计消费：${step.cost}元</p>
                <p>${step.whyRecommended || step.tip}</p>
                <a href="${buildAmapNavigationUrl(step)}" target="_blank" rel="noreferrer">打开高德地图导航</a>
              </div>
            `
          });

          marker.on("click", () => infoWindow.open(map, marker.getPosition()));
          map.add(marker);
          markers.push(marker);
        });

        if (markers.length > 1) map.setFitView(markers, false, [50, 50, 50, 50], 15);
        mapInstanceRef.current = map;
        setError("");
      })
      .catch(() => {
        if (!disposed) setError("地图加载失败，当前显示为路线预览模式。");
      });

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [amapKey, securityCode, form, points, route, startCenter]);

  if (!amapKey || !securityCode || error) return <MapPlaceholder route={route} form={form} />;

  return (
    <section className="rounded-[28px] bg-white/90 p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-leaf">真实地图</p>
          <h3 className="text-xl font-black text-ink">{route?.routeName}</h3>
        </div>
        <a
          href={buildAmapSearchUrl(route?.destination || route?.routeName || "北京 周末路线")}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-4 py-3 text-center text-sm font-black text-white"
        >
          查看地图确认
        </a>
      </div>
      <div ref={mapRef} className="h-[360px] w-full overflow-hidden rounded-2xl bg-slate-100 sm:h-[420px]" />
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">点击地图 marker 可查看地点名称、地址、预计消费和推荐理由。导航以高德地图实际路线为准。</p>
    </section>
  );
}
