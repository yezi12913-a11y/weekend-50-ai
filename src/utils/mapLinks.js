import { calculateRouteBudget, formatBudgetBreakdown } from "./budget.js";

export function buildAmapSearchUrl(keyword, city = "北京") {
  const query = encodeURIComponent(keyword || "北京 周末 低预算");
  const encodedCity = encodeURIComponent(city);
  return `https://uri.amap.com/search?keyword=${query}&city=${encodedCity}&src=weekend-50-ai&callnative=1`;
}

export function buildAmapNavigationUrl({ name, lat, lng, address }) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const destinationName = encodeURIComponent(name || address || "目的地");
    return `https://uri.amap.com/navigation?to=${lng},${lat},${destinationName}&mode=bus&policy=1&src=weekend-50-ai&callnative=1`;
  }

  return buildAmapSearchUrl(name || address || "北京 低预算 出行");
}

export function buildCopyableRouteText(route, form = {}) {
  if (!route) return "";

  const start = form.start || "大致位置";
  const budget = calculateRouteBudget(route);
  const userBudget = route.userBudget || 50;
  const budgetDeltaText = budget.totalCost <= userBudget
    ? `低于预算 ${userBudget - budget.totalCost} 元`
    : `超出预算 ${budget.totalCost - userBudget} 元`;
  const activities = Array.isArray(form.activities) ? form.activities.filter((item) => item !== "让 AI 判断").join("、") : "";
  const lines = [
    `【周末50元个性化路线】${start}出发 · ${route.routeName}`,
    "",
    "为什么推荐你这条：",
    route.personalizedReason || route.aiNote || "这条路线综合考虑了出发地、预算、通勤成本和偏好匹配。",
    "",
    `预算：${userBudget}元`,
    `预计总花费：${budget.totalCost}元`,
    `预算状态：${route.budgetStatus || budgetDeltaText}`,
    `适合：${activities || route.suitableFor?.slice(0, 3).join("、") || "低预算周末出行"}`,
    `出发地识别：${route.transitEstimate?.startLabel || start}`,
    `推荐交通：${route.transitEstimate?.recommendedMode || "地铁/公交优先"}`,
    `推荐到达站：${route.transitEstimate?.arrivalStations?.join(" / ") || route.destination}`,
    route.transport ? `推荐出发站：${route.transport.primaryStartStation?.name || route.transport.startStation}${route.transport.primaryStartStation?.lines?.length ? `（${route.transport.primaryStartStation.lines.join(" / ")}）` : ""}` : "",
    route.transport ? `推荐到达站：${route.transport.primaryEndStation?.name || route.transport.endStation}` : "",
    "",
    route.transport ? `交通建议：${route.transport.transitSummary}` : "",
    route.transport ? `交通路线：${route.transport.mapRouteUrl}` : "",
    "",
    "预算明细：",
    formatBudgetBreakdown(route),
    "",
    "交通费为估算值，实际以地图导航和公共交通票价为准。",
    ""
  ];

  lines.push("路线安排：");

  route.steps.forEach((step, index) => {
    lines.push("");
    lines.push(`${index + 1}. ${step.costType === "transport" ? "交通" : "到达"}：${step.place}`);
    lines.push(`   行动：${step.action}`);
    lines.push(`   地址：${step.address}`);
    lines.push(`   最近地铁：${step.nearestSubway}`);
    lines.push(`   预计停留：${step.estimatedStay}`);
    lines.push(`   花费：${step.cost}元`);
    lines.push(`   推荐理由：${step.whyRecommended || step.tip}`);
    if (step.primaryPoi) {
      lines.push(`   推荐店铺：${step.primaryPoi.name}`);
      lines.push(`   店铺地址：${step.primaryPoi.address}`);
      lines.push(`   距离：约 ${step.primaryPoi.distance} 米`);
      if (step.alternatives?.length) lines.push(`   备选：${step.alternatives.map((poi) => poi.name).join(" / ")}`);
    }
    lines.push(`   地图导航：${buildAmapNavigationUrl(step)}`);
  });

  lines.push("");
  lines.push(`预计总花费：${budget.totalCost}元，${budgetDeltaText}。`);
  lines.push(`省钱提示：${route.savingTip}`);
  lines.push("");
  lines.push("地图搜索：");
  route.steps.filter((step) => step.costType !== "transport").forEach((step) => {
    lines.push(`${step.place}：${buildAmapNavigationUrl(step)}`);
  });
  lines.push("");
  lines.push(`可能踩雷：${route.riskTip}`);

  return lines.join("\n");
}

export function buildPlaceListText(route) {
  if (!route) return "";
  return route.steps
    .map((step, index) => `${index + 1}. ${step.place}\n地址：${step.address}\n最近地铁：${step.nearestSubway}\n地图：${buildAmapNavigationUrl(step)}`)
    .join("\n\n");
}
