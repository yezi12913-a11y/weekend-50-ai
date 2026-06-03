export function buildAmapSearchUrl(keyword, city = "北京") {
  const query = encodeURIComponent(keyword || "北京 周末 低预算");
  const encodedCity = encodeURIComponent(city);
  return `https://uri.amap.com/search?keyword=${query}&city=${encodedCity}&src=weekend-50-ai&callnative=1`;
}

export function buildAmapNavigationUrl(stepOrPlace) {
  const step = typeof stepOrPlace === "string" ? { place: stepOrPlace } : stepOrPlace || {};
  const name = step.name || step.place || step.address || "目的地";

  if (Number.isFinite(step.lat) && Number.isFinite(step.lng)) {
    const destinationName = encodeURIComponent(name);
    return `https://uri.amap.com/navigation?to=${step.lng},${step.lat},${destinationName}&mode=bus&policy=1&src=weekend-50-ai&callnative=1`;
  }

  return buildAmapSearchUrl(step.amapKeyword || name);
}

export function buildCopyableRouteText(route, form = {}) {
  if (!route) return "";
  const lines = [
    `【周末50元个性化路线】${form.start || "大致位置"}出发 · ${route.routeName}`,
    `预算：${route.userBudget || 50}元`,
    `预计总花费：${route.estimatedCost}元`,
    `预算状态：${route.budgetStatus}`,
    "",
    "路线安排："
  ];

  route.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.place}：${step.action}，预计 ${step.cost} 元`);
    lines.push(`   地图：${buildAmapNavigationUrl(step)}`);
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
