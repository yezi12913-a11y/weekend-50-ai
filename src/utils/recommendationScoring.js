import { getDestinationTransitInfo } from "../data/destinationTransitMap.js";
import { detectStartInfo } from "../startArea.js";
import { estimateTransitCost } from "../transitEstimate.js";
import { distanceMeters } from "./amapService.js";
import { calculateRouteBudget, getBudgetStatus, normalizeCost } from "./budget.js";

function getBudgetValue(form) {
  if (form?.budgetType === "自定义预算") {
    return normalizeCost(form.customBudget) || 50;
  }
  return normalizeCost(String(form?.budgetType || "50元").replace("元", "")) || 50;
}

function textIncludesAny(text, words = []) {
  return words.some((word) => word && text.includes(word));
}

function startTextForMatch(startLocation) {
  return [
    startLocation?.originalInput,
    startLocation?.rawInput,
    startLocation?.input,
    startLocation?.area,
    startLocation?.district,
    startLocation?.matchedStation,
    startLocation?.name,
    ...(startLocation?.matchedStationInfo?.aliases || [])
  ].filter(Boolean).join(" ");
}

function distanceScore(route, startLocation) {
  const destination = route.destinationLocation || route.primaryLocation;
  const meters = distanceMeters(startLocation, destination);
  if (!Number.isFinite(meters)) return 0;
  if (meters <= 5000) return 80;
  if (meters <= 10000) return 58;
  if (meters <= 18000) return 30;
  if (meters <= 30000) return 4;
  return -40;
}

export function scoreRouteByStartLocation(route, startLocation) {
  const startInfo = startLocation?.transitZone ? startLocation : detectStartInfo(startLocation?.rawInput || startLocation?.name || "");
  const transit = estimateTransitCost(startInfo, getDestinationTransitInfo(route.destination));
  const startText = startTextForMatch(startLocation);
  const routeAreaText = [
    route.region,
    route.localArea,
    ...(route.areaTags || []),
    ...(route.suitableStartAreas || [])
  ].filter(Boolean).join(" ");

  let score = 0;
  score += distanceScore(route, startLocation);
  if (transit.trafficPressure === "低") score += 60;
  if (transit.trafficPressure === "中") score += 20;
  if (transit.trafficPressure === "高") score -= 55;
  score += Math.max(0, 28 - transit.roundTripFare * 2);

  if (route.region && startText.includes(route.region)) score += 50;
  if (textIncludesAny(startText, route.areaTags)) score += 44;
  if (textIncludesAny(startText, route.suitableStartAreas)) score += 56;
  if (route.startAreaFit?.includes(startLocation.area)) score += 22;
  if (route.startAreaFit?.includes("通用区域")) score += 4;

  return score;
}

export function scoreRouteByPreference(route, form) {
  const budget = getBudgetValue(form);
  const routeBudget = calculateRouteBudget(route);
  const budgetStatus = getBudgetStatus(routeBudget.totalCost, budget);
  const preferenceText = [
    ...(form?.activities || []),
    ...(form?.moods || []),
    form?.weather,
    form?.companion,
    form?.destination
  ].filter(Boolean).join(" ");
  const routeText = [
    route.routeName,
    route.category,
    route.destination,
    ...(route.suitableFor || []),
    ...(route.preferenceTags || [])
  ].filter(Boolean).join(" ");

  let score = 0;
  if (routeBudget.totalCost <= Math.floor(budget * 0.9)) score += 40;
  else if (routeBudget.totalCost <= budget) score += 18;
  else if (routeBudget.totalCost <= budget * 1.12) score -= 35;
  else score -= 90;
  if (budgetStatus.level === "safe") score += 10;

  (form?.activities || []).forEach((activity) => {
    if (route.suitableFor?.includes(activity) || route.preferenceTags?.includes(activity)) score += 18;
  });
  (form?.moods || []).forEach((mood) => {
    if (route.preferenceTags?.includes(mood)) score += 14;
    if (mood === "想放空" && /公园|胡同|湖|河|散步|图书馆/.test(routeText)) score += 16;
    if (mood === "想拍照" && /798|三里屯|鼓楼|什刹海|蓝色港湾|首钢|前门|大栅栏/.test(routeText)) score += 16;
    if (mood === "想省钱" && routeBudget.totalCost <= Math.floor(budget * 0.9)) score += 18;
    if (mood === "想聊天" && /河|胡同|商圈|街区|公园|朋友/.test(routeText)) score += 10;
  });

  if (route.weatherFit?.includes(form?.weather)) score += 18;
  if (route.companionFit?.includes(form?.companion)) score += 16;
  if (form?.destination && !form.destination.includes("不指定") && (route.destination.includes(form.destination) || form.destination.includes(route.destination))) score += 38;
  if (textIncludesAny(routeText, preferenceText.split(/\s+/))) score += 3;
  return score;
}

function personalizationReason(route, form, startLocation, transit) {
  const start = form?.start || startLocation.matchedStation || startLocation.area || "你的出发地";
  const nearbyText = transit.trafficPressure === "低"
    ? `你从${start}出发，到${route.destination}属于相对近的周末路线，往返交通约${transit.roundTripFare}元。`
    : transit.trafficPressure === "中"
      ? `你从${start}出发，到${route.destination}通勤成本中等，适合半天以上安排。`
      : `这条路线离${start}稍远，但和你的偏好匹配度高，所以作为跨区备选。`;
  const moodText = (form?.moods || []).length
    ? `你选择了${form.moods.filter((mood) => mood !== "让 AI 判断").join("、") || "让 AI 判断"}，所以路线会尽量减少无意义转场和临时消费。`
    : "你没有手动选择心情，我会优先按低预算、低折腾和可执行来排序。";
  const companionText = form?.companion === "多人"
    ? "朋友同行时，集合方便和边走边聊的公共空间更重要。"
    : form?.companion === "双人"
      ? "双人出行更适合把预算留给聊天停留点，而不是连续消费。"
      : "一个人出行时，路线要能随时结束、社交压力低。";
  return `${nearbyText}${moodText}${companionText}`;
}

export function sortRoutesForUser(routes, form, resolvedStartLocation) {
  const startLocation = resolvedStartLocation || detectStartInfo(form?.start || "");
  const startInfo = startLocation?.transitZone ? startLocation : detectStartInfo(startLocation?.rawInput || startLocation?.name || form?.start || "");
  const userBudget = getBudgetValue(form);
  const scored = routes.map((route) => {
    const transit = estimateTransitCost(startInfo, getDestinationTransitInfo(route.destination));
    const startScore = scoreRouteByStartLocation(route, startLocation);
    const preferenceScore = scoreRouteByPreference(route, form);
    const routeBudget = calculateRouteBudget(route);
    const budgetStatus = getBudgetStatus(routeBudget.totalCost, userBudget);
    const overBudgetPenalty = budgetStatus.isOverBudget ? 80 : 0;
    const score = startScore * 1.15 + preferenceScore - overBudgetPenalty;

    return {
      route,
      score,
      startScore,
      preferenceScore,
      transit,
      isNearbyCandidate: startScore >= 55 && transit.trafficPressure !== "高",
      isCrossRegionFallback: startScore < 35 || transit.trafficPressure === "高",
      budgetStatus
    };
  }).sort((a, b) => b.score - a.score);

  const safeOrTight = scored.filter((item) => !item.budgetStatus.isOverBudget);
  const nearby = safeOrTight.filter((item) => item.isNearbyCandidate);
  const selected = [];
  const add = (item) => {
    if (!item || selected.some((picked) => picked.route.routeId === item.route.routeId)) return;
    const duplicateRegionCount = selected.filter((picked) => picked.route.region === item.route.region).length;
    if (duplicateRegionCount >= 2 && selected.length < 2) return;
    selected.push(item);
  };

  nearby.forEach(add);
  safeOrTight.forEach(add);
  scored.filter((item) => !item.budgetStatus.isOverBudget || item.preferenceScore > 80).forEach(add);

  return selected.slice(0, 3).map((item, index) => ({
    ...item.route,
    personalizationScore: Math.round(item.score),
    nearbyMatch: item.isNearbyCandidate,
    crossRegionFallback: item.isCrossRegionFallback && index > 0,
    transitEstimate: item.transit,
    personalizedReason: personalizationReason(item.route, form, startLocation, item.transit)
  }));
}
