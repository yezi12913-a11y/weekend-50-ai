import { useEffect, useMemo, useRef, useState } from "react";
import { detectStartArea } from "../startArea.js";
import { hasAmapBrowserConfig, loadAmapJsApi } from "../utils/amapClient.js";
import { buildAmapNavigationUrl, buildAmapSearchUrl } from "../utils/mapLinks.js";

const areaCenters = {
  "海淀高校区": { name: "海淀高校区", lat: 39.9929, lng: 116.3103 },
  "朝阳/东部区域": { name: "朝阳/东部区域", lat: 39.9219, lng: 116.4855 },
  "城区交通便利区域": { name: "城区交通便利区域", lat: 39.9042, lng: 116.4074 },
  "南部/良乡区域": { name: "南部/良乡区域", lat: 39.7232, lng: 116.1777 },
  "北部/昌平区域": { name: "北部/昌平区域", lat: 40.0926, lng: 116.2996 },
  "通用区域": { name: "北京市", lat: 39.9042, lng: 116.4074 }
};

const destinationCenters = {
  合生汇: { lat: 39.8936, lng: 116.4898 },
  三里屯: { lat: 39.9367, lng: 116.4540 },
  朝阳大悦城: { lat: 39.9247, lng: 116.5196 },
  西单大悦城: { lat: 39.9098, lng: 116.3746 },
  荟聚: { lat: 39.7894, lng: 116.3285 },
  蓝色港湾: { lat: 39.9483, lng: 116.4747 },
  "鼓楼/什刹海": { lat: 39.9403, lng: 116.3868 },
  什刹海: { lat: 39.9403, lng: 116.3868 },
  奥森公园: { lat: 40.0162, lng: 116.3929 },
  亮马河: { lat: 39.9494, lng: 116.4708 },
  紫竹院: { lat: 39.9486, lng: 116.3127 },
  玉渊潭: { lat: 39.9170, lng: 116.3175 },
  798: { lat: 39.9843, lng: 116.4976 },
  首钢园: { lat: 39.9137, lng: 116.1606 },
  牛街: { lat: 39.8863, lng: 116.3637 },
  护国寺: { lat: 39.9333, lng: 116.3738 },
  书店: { lat: 39.9042, lng: 116.4074 },
  图书馆: { lat: 39.9431, lng: 116.3252 },
  咖啡店: { lat: 39.9042, lng: 116.4074 },
  商场公共区: { lat: 39.9042, lng: 116.4074 }
};

function getStartCenter(form) {
  const area = detectStartArea(form?.start || "");
  return areaCenters[area] || areaCenters["通用区域"];
}

function pointForStep(step, route, index) {
  if (Number.isFinite(step.lat) && Number.isFinite(step.lng)) return step;
  const base = destinationCenters[step.place] || destinationCenters[route?.destination] || areaCenters["通用区域"];
  return {
    ...step,
    lat: base.lat + index * 0.0012,
    lng: base.lng + index * 0.0012,
    amapKeyword: step.amapKeyword || `${route?.destination || "北京"} ${step.place}`
  };
}

function MapPlaceholder({ route, form }) {
  const start = getStartCenter(form);
  return (
    <section className="rounded-[28px] bg-white/90 p-5 shadow-soft">
      <div className="rounded-2xl bg-skysoft/80 p-5">
        <p className="text-sm font-black text-leaf">路线预览模式</p>
        <h3 className="mt-2 text-xl font-black text-ink">真实地图需要配置高德地图 Key，当前显示为路线预览模式。</h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Cloudflare Pages 配置 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE` 后，会显示真实地图、marker 和弹窗。
        </p>
      </div>
      <div className="mt-4 rounded-2xl bg-mint/60 p-4">
        <p className="text-xs font-bold text-slate-500">出发地大致位置</p>
        <p className="mt-1 font-black text-ink">{form?.start || start.name}</p>
      </div>
      <div className="mt-4 space-y-3">
        {route?.steps?.map((step, index) => (
          <a
            key={`${step.place}-${index}`}
            href={buildAmapNavigationUrl(step)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-slate-50 p-4 transition hover:bg-cream"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-ink">{step.place}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{step.action}</p>
              </div>
              <span className="shrink-0 rounded-full bg-ink px-3 py-2 text-xs font-black text-white">打开高德地图导航</span>
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
  const startCenter = useMemo(() => getStartCenter(form), [form]);
  const points = useMemo(() => route?.steps?.map((step, index) => pointForStep(step, route, index)) || [], [route]);

  useEffect(() => {
    if (!hasAmapBrowserConfig() || !mapRef.current || !route) return undefined;

    let disposed = false;
    loadAmapJsApi()
      .then((AMap) => {
        if (disposed || !mapRef.current) return;
        if (mapInstanceRef.current) mapInstanceRef.current.destroy();

        const center = points[0] ? [points[0].lng, points[0].lat] : [startCenter.lng, startCenter.lat];
        const map = new AMap.Map(mapRef.current, { center, zoom: 12, viewMode: "2D" });
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: "RB" }));

        const markers = [
          new AMap.Marker({
            position: [startCenter.lng, startCenter.lat],
            title: form?.start || startCenter.name,
            content: '<div class="amap-custom-marker amap-start-marker">起</div>'
          })
        ];
        map.add(markers[0]);

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
                <p>${step.action}</p>
                <p>预计消费：${step.cost}元</p>
                <p>${step.tip || route.whyRecommended}</p>
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
  }, [form, points, route, startCenter]);

  if (!hasAmapBrowserConfig() || error) return <MapPlaceholder route={route} form={form} />;

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
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">点击地图 marker 可查看地点名称、预计消费和推荐理由。导航以高德地图实际路线为准。</p>
    </section>
  );
}
