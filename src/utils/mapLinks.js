export function buildAmapSearchUrl(keyword, city = "北京") {
  const query = encodeURIComponent(keyword || "北京 周末 低预算");
  const encodedCity = encodeURIComponent(city);
  return `https://uri.amap.com/search?keyword=${query}&city=${encodedCity}&src=weekend-50-ai&callnative=1`;
}

function normalizeStart(startOrForm) {
  if (typeof startOrForm === "string") return { name: startOrForm };
  if (!startOrForm) return {};
  const start = startOrForm.startInfo || startOrForm.startLocation || startOrForm;
  return {
    name: start.name || start.input || start.originalInput || start.start || startOrForm.start || "",
    lat: start.lat ?? start.matchedStationInfo?.lat,
    lng: start.lng ?? start.matchedStationInfo?.lng
  };
}

function startParamFor(startOrForm) {
  const start = normalizeStart(startOrForm);
  if (!start.name) return "";
  if (Number.isFinite(start.lat) && Number.isFinite(start.lng)) return `${start.lng},${start.lat},${start.name}`;
  return start.name;
}

export function buildAmapNavigationUrl(stepOrPlace, startOrForm) {
  const step = typeof stepOrPlace === "string" ? { place: stepOrPlace } : stepOrPlace || {};
  const name = step.name || step.place || step.address || "目的地";
  const from = startParamFor(startOrForm);

  if (Number.isFinite(step.lat) && Number.isFinite(step.lng)) {
    const destinationName = encodeURIComponent(name);
    const startQuery = from ? `from=${from}&` : "";
    return `https://uri.amap.com/navigation?${startQuery}to=${step.lng},${step.lat},${destinationName}&mode=bus&policy=1&src=weekend-50-ai&callnative=1`;
  }

  const destination = step.amapKeyword || name;
  const startQuery = from ? `from=${from}&` : "";
  return `https://uri.amap.com/navigation?${startQuery}to=${encodeURIComponent(destination)}&mode=bus&policy=1&src=weekend-50-ai&callnative=1`;
}

export function buildCopyableRouteText(route, form = {}) {
  if (!route) return "";
  const transit = route.transitEstimate;
  const navigationTarget = route.steps?.find((step) => Number.isFinite(step.lat) && Number.isFinite(step.lng)) || route.steps?.[0];
  const lines = [
    `【周末50元个性化路线】${route.routeName}`,
    `适合人群：${(route.suitableFor || []).join(" / ") || "低预算轻出行"}`,
    `用户预算：${route.userBudget || 50}元`,
    `预计总花费：${route.estimatedCost}元`,
    `预算状态：${route.budgetStatus}`,
    `出发地：${form.start || "大致位置"}`,
    `目的地：${route.destination || route.routeName}`,
    transit ? `交通方式/估算：${transit.recommendedMode}，${transit.estimatedTime}，往返约 ${transit.roundTripFare} 元，交通压力 ${transit.trafficPressure}` : "交通方式/估算：以高德地图实际路线为准",
    `预算明细：交通 ${route.transportCost || 0}元，餐饮/饮品 ${route.foodCost || 0}元，活动 ${route.activityCost || 0}元，机动 ${route.flexibleCost || 0}元`,
    navigationTarget ? `地图导航链接：${buildAmapNavigationUrl(navigationTarget, form)}` : "",
    "",
    "路线安排："
  ].filter(Boolean);

  route.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.place}：${step.action}，预计 ${step.cost} 元`);
    if (step.primaryPoi) lines.push(`   餐饮/饮品地点：${step.primaryPoi.name}，${step.primaryPoi.address}`);
    lines.push(`   地图：${buildAmapNavigationUrl(step, form)}`);
  });

  lines.push("");
  lines.push(`省钱提示：${route.savingTip}`);
  lines.push(`可能踩雷：${route.riskTip}`);
  return lines.join("\n");
}

export function buildPlaceListText(route) {
  if (!route) return "";
  return route.steps
    .map((step, index) => `${index + 1}. ${step.place}\n地图：${buildAmapNavigationUrl(step)}`)
    .join("\n\n");
}
