import { useState } from "react";
import { aiActivityOption, formatActivities, getEffectiveActivities, toggleActivity } from "./activityPreference.js";
import CopyRouteButton from "./components/CopyRouteButton.jsx";
import RealMap from "./components/RealMap.jsx";
import { getDestinationTransitInfo } from "./data/destinationTransitMap.js";
import { routesData } from "./data/routeTemplates.js";
import { keepUnspecifiedDestinationLast } from "./destinationOptions.js";
import { detectStartArea, detectStartInfo } from "./startArea.js";
import { formatTimePreference, isRouteTimeFit, timePreferenceLabelForAi } from "./timePreference.js";
import { estimateTransitCost } from "./transitEstimate.js";
import { attachBudgetSummary, calculateRouteBudget } from "./utils/budget.js";
import { resolveStartLocation } from "./utils/locationResolver.js";
import { buildAmapNavigationUrl, buildAmapSearchUrl, buildCopyableRouteText, buildPlaceListText } from "./utils/mapLinks.js";
import { findNearbyBusStops, findNearbySubwayStations } from "./utils/nearbyTransit.js";
import { searchNearbyBudgetFood, searchNearbyComfortStops, searchNearbyConvenienceStores, searchNearbyDrinkShops, selectBestPoiByDistanceAndBudget } from "./utils/poiSearch.js";
import { sortRoutesForUser } from "./utils/recommendationScoring.js";
import { planTransitRoute } from "./utils/transitPlanner.js";

const activityOptions = [
  "逛街",
  "散步放空",
  "拍照打卡",
  "看展",
  "吃东西",
  "安静学习",
  "雨天室内",
  "低预算约会",
  "一个人独处",
  "朋友社交"
];

const aiMoodOption = "让 AI 判断";

const moodOptions = [
  "想放空",
  "想拍照",
  "想省钱",
  "想聊天",
  "想吃点好的",
  "想学习",
  "想随便走走",
  "想有一点仪式感",
  "想避开人群",
  "想找室内地方",
  "想短时间透透气",
  "想和朋友热闹一点",
  aiMoodOption
];

const destinationOptions = {
  逛街: ["合生汇", "三里屯", "朝阳大悦城", "西单大悦城", "荟聚", "蓝色港湾", "大悦春风里", "不指定，让 AI 推荐"],
  散步放空: ["奥森公园", "什刹海", "亮马河", "玉渊潭", "紫竹院", "朝阳公园", "北海公园周边", "不指定，让 AI 推荐"],
  拍照打卡: ["鼓楼/什刹海", "798", "首钢园", "亮马河", "五道营胡同", "北海公园周边", "蓝色港湾", "不指定，让 AI 推荐"],
  看展: ["798", "今日美术馆", "国家典籍博物馆", "中国电影博物馆", "北京时代美术馆", "UCCA 周边", "不指定，让 AI 推荐"],
  吃东西: ["牛街", "护国寺", "合生汇 B1", "西单商圈", "簋街", "商场美食区", "不指定，让 AI 推荐"],
  安静学习: ["书店", "图书馆", "咖啡店", "商场公共区", "校园周边安静空间", "不指定，让 AI 推荐"],
  雨天室内: ["合生汇", "朝阳大悦城", "西单大悦城", "书店", "展馆", "商场公共区", "不指定，让 AI 推荐"],
  低预算约会: ["什刹海", "亮马河", "奥森公园", "三里屯", "蓝色港湾", "五道营胡同", "不指定，让 AI 推荐"],
  一个人独处: ["奥森公园", "紫竹院", "书店", "美术馆", "什刹海", "玉渊潭", "不指定，让 AI 推荐"],
  朋友社交: ["合生汇", "三里屯", "朝阳大悦城", "牛街", "西单商圈", "亮马河", "不指定，让 AI 推荐"]
};

const initialForm = {
  start: "",
  budgetType: "50元",
  customBudget: "",
  time: "半天",
  timeMode: "quick",
  customStartTime: "",
  customEndTime: "",
  activities: ["散步放空"],
  destination: "不指定，让 AI 推荐",
  weather: "晴天",
  companion: "独自",
  moods: [],
  transportPreference: "subway_first"
};

function getBudgetValue(form) {
  if (form.budgetType === "自定义预算") {
    const parsed = Number(form.customBudget);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  }
  return Number(form.budgetType.replace("元", ""));
}

function getBudgetTier(budget) {
  if (budget <= 39) {
    return {
      key: "veryLow",
      label: "极低预算",
      strategy: "免费活动为主，餐饮控制在便利店、自带水或平价小吃，不安排付费展览、咖啡店和正餐。",
      flexibleRange: [5, 10]
    };
  }
  if (budget <= 69) {
    return {
      key: "low",
      label: "低预算",
      strategy: "免费活动 + 简餐/小吃 + 地铁往返，可以留少量机动费用。",
      flexibleRange: [5, 12]
    };
  }
  if (budget <= 119) {
    return {
      key: "normal",
      label: "普通预算",
      strategy: "可以加入饮品、低价展览、轻餐或甜品，但仍然避免连续消费。",
      flexibleRange: [10, 20]
    };
  }
  if (budget <= 199) {
    return {
      key: "comfortable",
      label: "舒适预算",
      strategy: "可以加入正餐、咖啡、展览、体验项目或文创小消费，路线更完整。",
      flexibleRange: [20, 40]
    };
  }
  return {
    key: "high",
    label: "高预算",
    strategy: "保留一个省钱方案，同时给出更舒适的餐饮、展览、电影、体验或文创升级。",
    flexibleRange: [30, 60]
  };
}

function budgetTier(budget) {
  const tier = getBudgetTier(budget).key;
  if (tier === "veryLow") return "tight";
  if (tier === "low") return "balanced";
  if (tier === "normal") return "roomy";
  return "plus";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToYuan(value) {
  return Math.max(0, Math.round(value));
}

function getBudgetStatus(totalCost, budget) {
  if (totalCost <= budget * 0.85) return "预算内";
  if (totalCost <= budget) return "接近预算";
  if (totalCost <= budget * 1.1) return "可能略超";
  return "明显超预算";
}

function getExplicitMoods(form) {
  return Array.isArray(form.moods) ? form.moods.filter((mood) => mood !== aiMoodOption) : [];
}

function shouldAiJudgeMoods(form) {
  return !Array.isArray(form.moods) || form.moods.length === 0 || form.moods.includes(aiMoodOption);
}

function inferMoodsFromContext(form, area, budget) {
  const inferred = [];
  const add = (mood) => {
    if (!inferred.includes(mood)) inferred.push(mood);
  };
  const timeLabel = timePreferenceLabelForAi(form);

  if (budget <= 50) add("想省钱");
  if (budget <= 50 && form.companion === "独自" && timeLabel === "只想出去 2-3 小时") add("想放空");
  if (timeLabel === "只想出去 2-3 小时") add("想短时间透透气");
  if (["雨天", "太热", "太冷"].includes(form.weather)) add("想找室内地方");
  if (form.companion === "多人") add("想和朋友热闹一点");
  if (form.companion === "双人" && (timeLabel === "晚上" || budget >= 50)) add("想聊天");
  if (form.companion === "双人" && timeLabel === "晚上" && budget >= 50) add("想有一点仪式感");
  if (form.companion === "独自") add("想随便走走");
  if (form.activities.includes("安静学习") || (form.companion === "独自" && timeLabel === "上午")) add("想学习");
  if (form.activities.includes("拍照打卡")) add("想拍照");
  if (form.activities.includes("吃东西")) add("想吃点好的");
  if (area === "海淀高校区" && budget <= 60) add("想短时间透透气");

  add("想省钱");
  add("想随便走走");
  return inferred.slice(0, 4);
}

function getEffectiveMoods(form, area = detectStartArea(form.start), budget = getBudgetValue(form)) {
  return shouldAiJudgeMoods(form) ? inferMoodsFromContext(form, area, budget) : getExplicitMoods(form);
}

function formatMoodsForDisplay(form) {
  const explicit = getExplicitMoods(form);
  if (!shouldAiJudgeMoods(form) && explicit.length) return explicit.join("、");
  return aiMoodOption;
}

function toggleMood(selectedMoods, option) {
  if (option === aiMoodOption) {
    return selectedMoods.includes(aiMoodOption) ? [] : [aiMoodOption];
  }

  const manualMoods = selectedMoods.filter((mood) => mood !== aiMoodOption);
  if (manualMoods.includes(option)) {
    return manualMoods.filter((mood) => mood !== option);
  }
  return [...manualMoods, option];
}

function getActivityContext(form, area, budget) {
  return getEffectiveActivities({
    activities: form.activities,
    startArea: area,
    budget,
    weather: form.weather,
    time: timePreferenceLabelForAi(form),
    companion: form.companion,
    moods: getEffectiveMoods(form, area, budget)
  });
}

function getTransitForRoute(route, form) {
  const startInfo = form.startLocation?.transitZone ? form.startLocation : detectStartInfo(form.start);
  return estimateTransitCost(startInfo, getDestinationTransitInfo(route.destination));
}

function startInfoFromResolvedLocation(startLocation, fallbackStart = "") {
  const fallback = detectStartInfo(startLocation?.rawInput || fallbackStart || startLocation?.name || "");
  return {
    ...fallback,
    rawInput: startLocation?.rawInput || fallbackStart,
    name: startLocation?.name || fallback.matchedStation || fallbackStart,
    type: startLocation?.type,
    district: startLocation?.district || fallback.area,
    address: startLocation?.address || "",
    lat: startLocation?.lat,
    lng: startLocation?.lng,
    universityName: startLocation?.universityName,
    region: startLocation?.region || fallback.transitZone,
    coordinateStatus: startLocation?.coordinateStatus,
    subwayLines: startLocation?.subwayLines || [],
    nearbySubwayStations: startLocation?.nearbySubwayStations || startLocation?.nearestSubwayStations || [],
    nearbyBusStops: startLocation?.nearbyBusStops || startLocation?.nearestBusStops || [],
    nearestSubwayStations: startLocation?.nearestSubwayStations || startLocation?.nearbySubwayStations || [],
    nearestBusStops: startLocation?.nearestBusStops || startLocation?.nearbyBusStops || [],
    confidence: startLocation?.confidence ?? 0.6,
    source: startLocation?.source || fallback.confidence
  };
}

function primaryDestinationLocation(route) {
  const step = route.steps.find((item) => item.costType !== "transport" && Number.isFinite(item.lat) && Number.isFinite(item.lng));
  return {
    name: route.destination,
    address: step?.address || "",
    lat: step?.lat,
    lng: step?.lng,
    nearestSubwayStations: step?.nearestSubway ? step.nearestSubway.split("/").map((value) => value.trim()).filter(Boolean) : [],
    nearestBusStops: [],
    district: step?.district || route.region || "",
    source: step?.source || "route_template"
  };
}

function routeWithDestinationLocation(route) {
  return { ...route, destinationLocation: primaryDestinationLocation(route), primaryLocation: primaryDestinationLocation(route) };
}

async function enrichStartLocationTransit(startLocation) {
  if (!Number.isFinite(startLocation?.lat) || !Number.isFinite(startLocation?.lng)) return startLocation;
  if ((startLocation.nearestSubwayStations || []).length || (startLocation.nearestBusStops || []).length) return startLocation;
  const [subway, bus] = await Promise.all([
    findNearbySubwayStations(startLocation.lat, startLocation.lng),
    findNearbyBusStops(startLocation.lat, startLocation.lng)
  ]);
  return {
    ...startLocation,
    nearestSubwayStations: subway.map((station) => station.name).slice(0, 3),
    nearestBusStops: bus.map((station) => station.name).slice(0, 3)
  };
}

async function buildPoiStep(step, route, budget) {
  const destination = route.destinationLocation || primaryDestinationLocation(route);
  if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) return step;
  const [foods, convenience, drinks] = await Promise.all([
    searchNearbyBudgetFood({ lat: destination.lat, lng: destination.lng, name: destination.name || route.destination, rawInput: route.destination, budget }),
    searchNearbyConvenienceStores({ lat: destination.lat, lng: destination.lng, name: destination.name || route.destination, rawInput: route.destination }),
    searchNearbyDrinkShops({ lat: destination.lat, lng: destination.lng, name: destination.name || route.destination, rawInput: route.destination, budget })
  ]);
  const candidates = foods.length ? foods : [...convenience, ...drinks];
  const primaryPoi = selectBestPoiByDistanceAndBudget(candidates, budget);
  if (!primaryPoi) {
    return {
      ...step,
      source: "poi_unavailable",
      whyRecommended: "暂未获取到稳定店铺信息，请以地图实时搜索为准。",
      tip: "暂未获取到稳定店铺信息，请以地图实时搜索为准。"
    };
  }
  const alternatives = candidates
    .filter((poi) => poi.poiId !== primaryPoi.poiId)
    .slice(0, 2)
    .map((poi) => ({
      name: poi.name,
      address: poi.address,
      estimatedCost: poi.estimatedCost,
      distance: poi.distance,
      mapUrl: poi.mapUrl,
      lat: poi.lat,
      lng: poi.lng,
      poiId: poi.poiId
    }));

  return {
    ...step,
    type: "food",
    costType: "food",
    place: primaryPoi.name,
    action: `去具体店铺补给：${primaryPoi.name}`,
    cost: primaryPoi.estimatedCost,
    address: primaryPoi.address,
    lat: primaryPoi.lat,
    lng: primaryPoi.lng,
    source: "amap_poi",
    poiId: primaryPoi.poiId,
    amapKeyword: primaryPoi.name,
    primaryPoi: {
      name: primaryPoi.name,
      address: primaryPoi.address,
      lat: primaryPoi.lat,
      lng: primaryPoi.lng,
      estimatedCost: primaryPoi.estimatedCost,
      distance: primaryPoi.distance,
      mapUrl: primaryPoi.mapUrl,
      poiId: primaryPoi.poiId
    },
    alternatives,
    distanceFromPrevious: primaryPoi.distance,
    whyRecommended: `离${route.destination}约 ${primaryPoi.distance} 米，价格相对稳定，适合控制在 ${budget} 元预算内。`,
    tip: `首选 ${primaryPoi.name}；备选：${alternatives.map((poi) => poi.name).join(" / ") || "暂无稳定备选"}。`
  };
}

function poiToStep(poi, route, kind) {
  const labels = {
    food: ["餐饮推荐", "价格相对稳定，适合控制预算。"],
    convenience: ["便利店/饮品推荐", "适合买水、饮料或简单补给，不容易超预算。"],
    comfort: ["舒适停留点", "适合短暂停留、休息、调整路线。"]
  };
  const [label, reason] = labels[kind];
  return {
    id: `${route.routeId}-${kind}-${poi.poiId || poi.name}`,
    type: kind === "comfort" ? "rest" : "food",
    costType: kind === "comfort" ? "other" : "food",
    place: poi.name,
    action: `${label}：${poi.name}`,
    tip: `${poi.source === "fallback_poi" ? "此处为兜底推荐，请以地图实时信息为准。" : "我为你找到的具体地点。"}${reason}`,
    cost: poi.estimatedCost,
    address: poi.address,
    district: route.region || "",
    nearestSubway: route.transport?.endStation || route.destination,
    lat: poi.lat,
    lng: poi.lng,
    amapKeyword: poi.name,
    openTime: "以地图实时信息为准",
    estimatedStay: kind === "comfort" ? "20-45分钟" : "15-35分钟",
    whyRecommended: `距离当前路线点约 ${poi.distance} 米，${reason}${poi.source === "fallback_poi" ? "此处为兜底推荐，请以地图实时信息为准。" : ""}`,
    source: poi.source,
    poiId: poi.poiId,
    primaryPoi: poi,
    alternatives: [],
    distanceFromPrevious: poi.distance
  };
}

async function ensureConcretePoiSteps(route, steps, budget) {
  const destination = route.destinationLocation || primaryDestinationLocation(route);
  if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) return steps;
  const searchBase = { lat: destination.lat, lng: destination.lng, name: destination.name || route.destination, rawInput: route.destination };
  const [foods, convenience, drinks, comfort] = await Promise.all([
    searchNearbyBudgetFood({ ...searchBase, budget }),
    searchNearbyConvenienceStores(searchBase),
    searchNearbyDrinkShops({ ...searchBase, budget }),
    searchNearbyComfortStops(searchBase)
  ]);
  const withPois = [...steps];
  const existingFood = withPois.some((step) => step.costType === "food" && (step.source === "amap_poi" || step.source === "fallback_poi"));
  const existingConvenience = withPois.some((step) => /便利|饮品|咖啡|奶茶/.test(step.action + step.place) && (step.source === "amap_poi" || step.source === "fallback_poi"));
  const existingComfort = withPois.some((step) => step.type === "rest" && (step.source === "amap_poi" || step.source === "fallback_poi"));
  const foodPoi = selectBestPoiByDistanceAndBudget(foods, budget);
  const conveniencePoi = selectBestPoiByDistanceAndBudget([...convenience, ...drinks], budget);
  const comfortPoi = selectBestPoiByDistanceAndBudget(comfort, budget);

  if (!existingFood && foodPoi) withPois.push(poiToStep(foodPoi, route, "food"));
  if (!existingConvenience && conveniencePoi) withPois.push(poiToStep(conveniencePoi, route, "convenience"));
  if (!existingComfort && comfortPoi) withPois.push(poiToStep(comfortPoi, route, "comfort"));
  return withPois;
}

async function enhanceRouteWithMapData(route, form, startLocation) {
  const budget = getBudgetValue(form);
  const routeWithLocation = routeWithDestinationLocation(route);
  const transport = await planTransitRoute({ from: startLocation, to: routeWithLocation.destinationLocation });
  const replacedSteps = await Promise.all(routeWithLocation.steps.map((step) => (
    step.costType === "food" || /餐|吃|小吃|轻食|简餐|饮品|便利店|补给/.test(step.action + step.place)
      ? buildPoiStep(step, routeWithLocation, budget)
      : Promise.resolve(step)
  )));
  const enhancedSteps = await ensureConcretePoiSteps({ ...routeWithLocation, transport }, replacedSteps, budget);

  return {
    ...routeWithLocation,
    transport,
    transitEstimate: {
      ...(route.transitEstimate || {}),
      arrivalStations: [transport.endStation],
      recommendedMode: transport.startStationType === "bus" ? "公交/地铁结合" : "地铁 + 步行",
      roundTripFare: transport.estimatedTransportCost,
      estimatedTime: transport.estimatedDuration,
      estimatedDistanceLevel: transport.estimatedDistance,
      startLabel: `识别到「${startLocation.name}」`,
      explanation: "交通费为估算值，实际以地图导航和公共交通票价为准。"
    },
    steps: enhancedSteps
  };
}

function routeContains(route, words) {
  const text = `${route.routeName} ${route.category} ${route.destination} ${route.suitableFor.join(" ")} ${route.preferenceTags.join(" ")}`;
  return words.some((word) => text.includes(word));
}

function scoreMoodFit(route, form, transit, activities, area, budget) {
  const moods = getEffectiveMoods(form, area, budget);
  let score = 0;

  moods.forEach((mood) => {
    if (route.preferenceTags.includes(mood)) score += 10;
    if (mood === "想放空") {
      if (routeContains(route, ["奥森公园", "紫竹院", "玉渊潭", "什刹海", "亮马河", "散步放空", "一个人独处"])) score += 14;
      if (routeContains(route, ["三里屯", "西单", "合生汇", "商圈", "牛街"]) || route.trafficPressure === "高") score -= 8;
    }
    if (mood === "想拍照" && routeContains(route, ["三里屯", "蓝色港湾", "亮马河", "鼓楼", "什刹海", "798", "首钢园", "五道营", "拍照打卡"])) score += 16;
    if (mood === "想省钱") {
      if (route.activityCost === 0) score += 7;
      if (route.estimatedCost <= 50) score += 10;
      if (transit.roundTripFare <= 10) score += 6;
      if (route.estimatedCost > budget || transit.roundTripFare > 14) score -= 10;
    }
    if (mood === "想聊天" && routeContains(route, ["亮马河", "三里屯", "蓝色港湾", "什刹海", "合生汇", "大悦城", "公园", "朋友社交", "低预算约会"])) score += 13;
    if (mood === "想吃点好的") {
      if (routeContains(route, ["牛街", "护国寺", "合生汇 B1", "西单", "朝阳大悦城", "商场美食区", "吃东西"])) score += 16;
      if (budget <= 50 && route.foodCost > 35) score -= 5;
    }
    if (mood === "想学习" && routeContains(route, ["书店", "图书馆", "咖啡店", "商场公共区", "安静学习"])) score += 18;
    if (mood === "想随便走走") {
      if (routeContains(route, ["胡同", "公园", "河", "城市漫游", "散步", "什刹海", "亮马河"])) score += 12;
      if (route.activityCost > 0) score -= 4;
    }
    if (mood === "想有一点仪式感") {
      if (routeContains(route, ["蓝色港湾", "三里屯", "亮马河", "798", "首钢园", "看展", "低预算约会"])) score += 15;
      if (route.estimatedCost > budget + 15) score -= 8;
    }
    if (mood === "想避开人群") {
      if (routeContains(route, ["紫竹院", "奥森公园", "玉渊潭", "书店", "安静学习", "一个人独处"]) || transit.trafficPressure === "低") score += 16;
      if (routeContains(route, ["三里屯", "西单", "合生汇", "大悦城", "商圈", "牛街"])) score -= 14;
    }
    if (mood === "想找室内地方") {
      if (routeContains(route, ["合生汇", "朝阳大悦城", "西单大悦城", "书店", "展馆", "商场公共区", "雨天室内"])) score += 15;
      if (["雨天", "太热", "太冷"].includes(form.weather) && route.weatherFit.includes(form.weather)) score += 8;
    }
    if (mood === "想短时间透透气") {
      if (route.timeNeeded === "只想出去 2-3 小时") score += 14;
      if (transit.trafficPressure === "低") score += 9;
      if (transit.trafficPressure === "高" || route.transportTime > 45) score -= 16;
    }
    if (mood === "想和朋友热闹一点") {
      if (routeContains(route, ["商圈", "美食", "牛街", "合生汇", "朝阳大悦城", "西单", "三里屯", "朋友社交"])) score += 15;
      if (form.companion === "多人") score += 8;
      if (!route.companionFit.includes("多人")) score -= 5;
    }
  });

  if (activities.some((activity) => route.suitableFor.includes(activity) || route.preferenceTags.includes(activity))) score += 4;
  return score;
}

function scoreRoute(route, form) {
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const transit = getTransitForRoute(route, form);
  const activities = getActivityContext(form, area, budget);
  const moods = getEffectiveMoods(form, area, budget);
  const tier = getBudgetTier(budget);
  const timeLabel = timePreferenceLabelForAi(form);
  const destinationSpecified = !form.destination.includes("不指定");
  const activityMatches = activities.filter((activity) => route.suitableFor.includes(activity) || route.preferenceTags.includes(activity));
  let score = 0;

  if (destinationSpecified && (route.destination.includes(form.destination) || form.destination.includes(route.destination) || route.routeName.includes(form.destination))) score += 22;
  if (activityMatches.length > 0) score += 14 + activityMatches.length * 9;
  score += scoreMoodFit(route, form, transit, activities, area, budget);
  if (route.weatherFit.includes(form.weather)) score += ["雨天", "太热", "太冷"].includes(form.weather) ? 22 : 12;
  if (["雨天", "太热", "太冷"].includes(form.weather) && routeContains(route, ["雨天室内", "商场", "书店", "展馆", "室内"])) score += 12;
  if (form.weather === "晴天" && ["公园", "河", "胡同", "散步", "拍照"].some((word) => route.routeName.includes(word) || route.category.includes(word))) score += 10;
  if (route.companionFit.includes(form.companion)) score += 12;
  if (form.companion === "多人" && routeContains(route, ["商圈", "美食", "牛街", "大悦城", "合生汇", "朋友社交"])) score += 12;
  if (form.companion === "双人" && routeContains(route, ["亮马河", "蓝色港湾", "三里屯", "什刹海", "低预算约会"])) score += 9;
  if (form.companion === "独自" && routeContains(route, ["书店", "公园", "安静", "一个人独处"])) score += 10;
  if (isRouteTimeFit(route, form)) score += 12;
  if (form.timeMode === "custom" && !isRouteTimeFit(route, form)) score -= 18;
  if (timeLabel === "晚上" && routeContains(route, ["夜景", "亮马河", "蓝色港湾", "三里屯", "商圈"])) score += 18;
  if (timeLabel === "只想出去 2-3 小时" && route.timeNeeded === "只想出去 2-3 小时") score += 18;
  if (timeLabel === "只想出去 2-3 小时" && route.timeNeeded !== "只想出去 2-3 小时") score -= 5;
  if (timeLabel === "一天" && routeContains(route, ["看展", "798", "首钢园", "商圈", "牛街"])) score += 10;
  if (route.startAreaFit.includes(area)) score += 13;
  if (budget >= route.budgetRange[0] - 10 && budget <= route.budgetRange[1] + 40) score += 8;
  if (["veryLow", "low"].includes(tier.key) && route.budgetRange[0] <= 50) score += 12;
  if (["comfortable", "high"].includes(tier.key) && routeContains(route, ["看展", "三里屯", "蓝色港湾", "798", "首钢园", "牛街", "商圈", "夜景"])) score += 10;
  if (["comfortable", "high"].includes(tier.key) && route.estimatedCost <= 45 && !moods.includes("想省钱")) score -= 8;
  if (budget < route.budgetRange[0] - 15) score -= 14;
  if (transit.trafficPressure === "低") score += 12;
  if (transit.trafficPressure === "中") score += 3;
  if (transit.trafficPressure === "高") score -= 18;
  if ((form.time === "只想出去 2-3 小时" || timeLabel === "只想出去 2-3 小时") && transit.trafficPressure === "高") score -= 28;
  if (budget <= 69 && transit.roundTripFare > 12) score -= 18;
  if (form.time === "一天" && transit.trafficPressure === "高") score -= 3;
  if (form.activities.includes(aiActivityOption) && transit.trafficPressure !== "高" && route.weatherFit.includes(form.weather)) score += 8;
  if (form.companion === "独自" && transit.trafficPressure === "高") score -= 5;

  return score;
}

function tagFor(route, form, variant) {
  const tags = new Set();
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const transit = getTransitForRoute(route, form);
  const activities = getActivityContext(form, area, budget);
  const matchingMoods = getRouteMatchingMoods(route, form);
  tags.add(route.budgetWarning ? "可能超预算" : variant === "cheap" ? "不超预算" : variant === "steady" ? "交通可控" : "有氛围感");
  if (route.weatherFit.includes(form.weather)) tags.add(`${form.weather}友好`);
  if (route.companionFit.includes(form.companion)) tags.add(form.companion === "独自" ? "一个人也舒服" : form.companion === "双人" ? "适合聊天" : "集合方便");
  if (route.activityCost === 0) tags.add("不强制消费");
  matchingMoods.slice(0, 2).forEach((mood) => tags.add(mood));
  if (transit.trafficPressure === "低") tags.add("交通省心");
  if (transit.trafficPressure === "高") tags.add("路程偏长");
  if (route.timeNeeded === "只想出去 2-3 小时" || formatTimePreference(form) === "半天") tags.add("适合周末轻出行");
  if (form.activities.includes(aiActivityOption)) tags.add("AI 推荐");
  if (activities.some((activity) => route.preferenceTags.includes(activity))) tags.add("兴趣匹配");
  if (route.preferenceTags.includes("拍照打卡") || route.preferenceTags.includes("想拍照")) tags.add("适合拍照");
  if (route.badWeatherAlternative) tags.add("雨天可替代");
  return [...tags].slice(0, 6);
}

function getRouteMatchingMoods(route, form) {
  const budget = getBudgetValue(form);
  const area = detectStartArea(form.start);
  const transit = getTransitForRoute(route, form);
  const moods = getEffectiveMoods(form, area, budget);
  return moods.filter((mood) => scoreMoodFit(route, { ...form, moods: [mood] }, transit, getActivityContext(form, area, budget), area, budget) > 5);
}

function moodFitReason(moods) {
  const reasons = moods.map((mood) => {
    if (mood === "想省钱") return "没有强制消费点，餐饮和机动费会更保守";
    if (mood === "想聊天") return "步行、公共空间或集合点较多，适合边走边聊";
    if (mood === "想拍照") return "场景辨识度更高，更容易获得出片记忆点";
    if (mood === "想有一点仪式感") return "把氛围感放在夜景、街区或轻展览上，而不是高消费上";
    if (mood === "想放空") return "节奏轻、可随时停下，不需要完成很多任务";
    if (mood === "想避开人群") return "优先低交通压力和相对安静的空间";
    if (mood === "想吃点好的") return "把预算更多留给小吃、简餐或商场 B1 餐饮";
    if (mood === "想和朋友热闹一点") return "更适合多人集合、分享食物和逛公共空间";
    if (mood === "想学习") return "有书店、公共区或安静停留点";
    if (mood === "想找室内地方") return "天气不好时也能执行，室内停留更稳定";
    if (mood === "想短时间透透气") return "节点更少，交通和执行压力更低";
    if (mood === "想随便走走") return "固定消费点少，适合城市漫游";
    return "";
  }).filter(Boolean);
  return reasons.length ? `这条路线${reasons.join("；")}。` : "这条路线和你的约束更接近，预算、交通和活动强度比较均衡。";
}

function moodTradeoffNote(selectedMoods, budget) {
  if (selectedMoods.includes("想省钱") && selectedMoods.includes("想吃点好的")) {
    return "这两个需求有一定冲突，所以本方案把正餐控制在平价小吃或商场 B1，避免餐饮占掉全部预算。";
  }
  if (selectedMoods.includes("想避开人群") && selectedMoods.some((mood) => ["想和朋友热闹一点", "想吃点好的", "想有一点仪式感"].includes(mood))) {
    return "安静和热闹/氛围感有一点冲突，所以我会建议错开周末下午高峰，尽量选择上午、傍晚或非饭点执行。";
  }
  if (selectedMoods.includes("想避开人群")) {
    return "你选择了想避开人群，所以本方案建议尽量避开周末下午高峰，优先上午、傍晚或非饭点执行。";
  }
  if (selectedMoods.includes("想有一点仪式感") && budget <= 50) {
    return "预算较紧时，仪式感优先来自夜景、街区和少量饮品，不自动推荐高消费项目。";
  }
  if (selectedMoods.includes("想短时间透透气")) {
    return "因为你想短时间透透气，我会减少路线节点，并降低交通成本和路程压力。";
  }
  return "";
}

function planTargetRange(budget, planType) {
  const ranges = {
    cheap: [0.4, 0.65, 0.55],
    steady: [0.65, 0.85, 0.78],
    vibe: [0.8, 1.05, 0.95]
  };
  const [minRate, maxRate, targetRate] = ranges[planType];
  const adjustedTargetRate = planType === "cheap" && budget <= 69 ? 0.62 : targetRate;
  return {
    min: Math.max(roundToYuan(budget * minRate), planType === "cheap" && budget <= 69 ? 30 : 0),
    max: roundToYuan(budget * maxRate),
    target: roundToYuan(budget * adjustedTargetRate)
  };
}

function upgradeLabelFor(route, form, planType, tier) {
  if (planType === "cheap" || ["veryLow", "low"].includes(tier.key)) return "";
  if (routeContains(route, ["看展", "798", "美术馆", "展馆"])) return tier.key === "normal" ? "低价展览" : "付费展览";
  if (routeContains(route, ["三里屯", "蓝色港湾", "亮马河", "低预算约会", "夜景"])) return tier.key === "normal" ? "咖啡/甜品" : "咖啡甜品 + 夜景停留";
  if (routeContains(route, ["牛街", "护国寺", "吃东西", "美食", "商场"])) return tier.key === "normal" ? "小吃升级" : "正餐升级";
  if (routeContains(route, ["西单", "大悦城", "合生汇", "商圈", "荟聚"])) return tier.key === "normal" ? "饮品/文创小物" : "电影/文创小消费";
  if (form.activities.includes("拍照打卡")) return "拍照停留 + 饮品";
  return tier.key === "high" ? "体验项目" : "舒适停留";
}

function activityCostFor(route, form, tier, planType, remainingAfterTraffic) {
  if (["veryLow", "low"].includes(tier.key) || planType === "cheap") {
    return route.activityCost > 0 && getEffectiveMoods(form).includes("想省钱") ? 0 : Math.min(route.activityCost, 8);
  }
  let cost = route.activityCost;
  if (routeContains(route, ["看展", "798", "美术馆", "展馆"]) || form.activities.includes("看展")) {
    cost += planType === "steady" ? 25 : tier.key === "high" ? 70 : 45;
  }
  if (routeContains(route, ["电影", "商圈", "大悦城", "合生汇"]) && planType === "vibe") {
    cost += tier.key === "high" ? 55 : 35;
  }
  return roundToYuan(Math.min(cost, remainingAfterTraffic * 0.45));
}

function foodCostFor(route, form, tier, planType, remainingAfterTraffic) {
  const budget = getBudgetValue(form);
  const moods = getEffectiveMoods(form, detectStartArea(form.start), budget);
  const companionBoost = form.companion === "多人" ? 1.12 : form.companion === "双人" ? 1.05 : 0.95;
  const moodBoost = moods.includes("想吃点好的") ? 1.35 : moods.includes("想省钱") ? 0.72 : 1;
  const planBoost = planType === "cheap" ? 0.72 : planType === "steady" ? 1 : 1.25;
  const tierMin = { veryLow: 8, low: 16, normal: 28, comfortable: 45, high: 65 }[tier.key];
  const tierMax = { veryLow: 24, low: 45, normal: 80, comfortable: 130, high: 190 }[tier.key];
  const routeBase = routeContains(route, ["牛街", "护国寺", "吃东西", "美食", "B1"]) ? route.foodCost + 12 : route.foodCost;
  const raw = routeBase * companionBoost * moodBoost * planBoost;
  const maxByRemaining = remainingAfterTraffic * (planType === "vibe" ? 0.62 : planType === "steady" ? 0.54 : 0.48);
  return roundToYuan(clamp(raw, tierMin, Math.max(tierMin, Math.min(tierMax, maxByRemaining))));
}

function generateBudgetPlan(route, userBudget, planType, form, transit) {
  const tier = getBudgetTier(userBudget);
  const moods = getEffectiveMoods(form, detectStartArea(form.start), userBudget);
  const targetRange = planTargetRange(userBudget, planType);
  const trafficCost = transit.roundTripFare;
  const targetCost = Math.max(targetRange.min, targetRange.target);
  const remainingAfterTraffic = Math.max(12, targetCost - trafficCost);
  const activityCost = activityCostFor(route, form, tier, planType, remainingAfterTraffic);
  let foodCost = foodCostFor(route, form, tier, planType, Math.max(12, remainingAfterTraffic - activityCost));
  const flexRange = tier.flexibleRange;
  const flexibleBase = planType === "cheap" ? flexRange[0] : planType === "steady" ? (flexRange[0] + flexRange[1]) / 2 : flexRange[1];
  let flexibleCost = roundToYuan(flexibleBase);
  let upgradeCost = 0;
  const upgradeLabel = upgradeLabelFor(route, form, planType, tier);
  const currentSubtotal = trafficCost + foodCost + activityCost + flexibleCost;
  const upgradeRoom = targetCost - currentSubtotal;

  if (upgradeLabel && planType !== "cheap" && !["veryLow", "low"].includes(tier.key)) {
    upgradeCost = roundToYuan(Math.max(10, upgradeRoom));
  } else if (upgradeRoom > 0) {
    flexibleCost += roundToYuan(Math.min(upgradeRoom, flexRange[1]));
  }

  let totalCost = trafficCost + foodCost + activityCost + flexibleCost + upgradeCost;
  if (totalCost < targetRange.min) {
    const gap = targetRange.min - totalCost;
    if (planType === "cheap") flexibleCost += gap;
    else if (upgradeLabel) upgradeCost += gap;
    else foodCost += gap;
    totalCost = targetRange.min;
  }
  if (totalCost > targetRange.max) {
    const excess = totalCost - targetRange.max;
    if (upgradeCost >= excess) upgradeCost -= excess;
    else if (flexibleCost - flexRange[0] >= excess) flexibleCost -= excess;
    totalCost = trafficCost + foodCost + activityCost + flexibleCost + upgradeCost;
  }

  const budgetStatus = getBudgetStatus(totalCost, userBudget);
  const usageRate = Math.round((totalCost / userBudget) * 100);
  const foodText = moods.includes("想吃点好的")
    ? "餐饮预算被提高，优先小吃组合、舒适轻餐或正餐升级"
    : moods.includes("想省钱")
      ? "餐饮预算被压低，优先便利店、平价小吃或自带水"
      : tier.key === "high"
        ? "餐饮不再按低配处理，可以选择更舒适的正餐或分享餐"
        : "餐饮控制在可执行的简餐和轻食范围";
  const activityText = activityCost > route.activityCost ? "活动预算加入了展览、电影或室内体验。" : "活动以免费公共空间为主。";
  const upgradeText = upgradeCost > 0 ? `升级项：${upgradeLabel}，约 ${upgradeCost} 元。` : "没有强行增加升级消费。";

  return {
    trafficCost,
    foodCost,
    activityCost,
    flexibleCost,
    upgradeCost,
    totalCost,
    budgetStatus,
    budgetUsageRate: usageRate,
    budgetExplanation: `${tier.label}策略：${tier.strategy}${foodText}；${activityText}${upgradeText}`
  };
}

function cloneWithAdjustments(route, form, variant, index) {
  const budget = getBudgetValue(form);
  const transit = route.transitEstimate || getTransitForRoute(route, form);
  const transport = route.transport;
  const budgetPlan = generateBudgetPlan(route, budget, variant, form, transit);
  const tier = budgetTier(budget);
  const lowBudgetNote = tier === "tight"
    ? "我会把消费点压到一个以内，优先免费空间和自带水。"
    : tier === "balanced"
      ? "这个预算适合地铁往返 + 一顿简餐，不建议再临时加甜品。"
      : getBudgetTier(budget).key === "high"
        ? "你这次预算比较充足，我会保留省钱底线，同时给方案留出真实的体验升级。"
        : "预算稍微宽松，可以留一个舒适停留点，但仍然要避免连续消费。";
  const matchingMoods = getRouteMatchingMoods(route, form);
  const tradeoffNote = moodTradeoffNote(getEffectiveMoods(form, detectStartArea(form.start), budget), budget);
  const upgradeStep = budgetPlan.upgradeCost > 0
    ? {
        id: `${route.routeId}-upgrade-${variant}`,
        type: "activity",
        place: variant === "vibe" ? "体验升级点" : "舒适停留点",
        action: budgetPlan.budgetExplanation.match(/升级项：([^，。]+)/)?.[1] || "加入一个预算内的体验升级",
        cost: budgetPlan.upgradeCost,
        tip: budgetPlan.budgetStatus === "可能略超" ? "如果临场价格偏高，可以把这个升级项取消。" : "这是让高预算方案不再停留在低配路线的关键。",
        address: `${route.destination}附近，按现场价格选择低价展览、咖啡、甜品或体验项目`,
        district: "北京市",
        nearestSubway: route.transitEstimate?.arrivalStations?.join(" / ") || route.destination,
        lat: route.steps.find((step) => Number.isFinite(step.lat))?.lat,
        lng: route.steps.find((step) => Number.isFinite(step.lng))?.lng,
        amapKeyword: `${route.destination} 平价咖啡 低价展览 甜品`,
        openTime: "以地图店铺信息为准",
        estimatedStay: "45-60分钟",
        whyRecommended: "这是预算更宽松时的可选升级，现场价格不合适就直接取消。",
        copyText: `${variant === "vibe" ? "体验升级点" : "舒适停留点"}：${budgetPlan.upgradeCost}元，可现场取消。`
      }
    : null;
  const routeSteps = route.steps.map((step) => ({
    ...step,
    costType: step.costType || (/餐|吃|小吃|轻食|简餐|饮品|便利店|补给/.test(step.action + step.place) ? "food" : "activity")
  }));
  const dynamicSteps = routeSteps.map((step) => {
    if (step.source === "amap_poi" || step.primaryPoi) return step;
    if (step.cost === route.foodCost || /餐|吃|小吃|轻食|简餐|饮品/.test(step.action + step.place)) {
      return { ...step, cost: budgetPlan.foodCost, tip: budgetPlan.foodCost > route.foodCost ? "预算更充足时，可以从简餐升级到更舒服的餐饮选择。" : step.tip };
    }
    if (/展|电影|体验/.test(step.action + step.place)) {
      return { ...step, cost: Math.max(step.cost, budgetPlan.activityCost), tip: budgetPlan.activityCost > step.cost ? "这次预算允许加入付费内容，但先看现场价格。" : step.tip };
    }
    return step;
  });
  if (upgradeStep) dynamicSteps.push(upgradeStep);
  const transitStep = {
    id: `${route.routeId}-transport`,
    type: "transport",
    place: `${transport?.fromName || form.start || "出发地"}往返${route.destination}`,
    action: transport?.transitSummary || `${transit.recommendedMode}，到达站建议：${transit.arrivalStations.join(" / ") || route.destination}`,
    cost: transport?.estimatedTransportCost || transit.roundTripFare,
    costType: "transport",
    tip: "交通费为估算值，实际以地图导航和公共交通票价为准。",
    address: transport?.fromAddress || form.start || "用户输入的出发地",
    district: transit.startArea,
    nearestSubway: `出发：${transport?.startStation || "附近地铁/公交站"}；到达：${transport?.endStation || transit.arrivalStations.join(" / ") || route.destination}`,
    lat: transport?.fromLat || dynamicSteps.find((step) => Number.isFinite(step.lat))?.lat,
    lng: transport?.fromLng || dynamicSteps.find((step) => Number.isFinite(step.lng))?.lng,
    amapKeyword: `${form.start || transit.startArea} 到 ${route.destination}`,
    openTime: "以公共交通运营时间为准",
    estimatedStay: transport?.estimatedDuration || transit.estimatedTime,
    whyRecommended: transport?.transitSummary || `从${form.start || transit.startArea}出发，${route.destination}往返交通估算约 ${transit.roundTripFare} 元。`,
    copyText: `交通：${transport?.transitSummary || transit.recommendedMode}，往返约 ${transport?.estimatedTransportCost || transit.roundTripFare} 元。`,
    mapRouteUrl: transport?.mapRouteUrl
  };
  const stepsWithTransport = [transitStep, ...dynamicSteps];
  const budgetPreview = calculateRouteBudget({ steps: stepsWithTransport });
  const budgetWarning = budgetPreview.totalCost > budget;
  const tightBudgetNote = budgetPreview.totalCost > budget
    ? " 这条路线超出预算，建议减少升级项、把饮品换成便利店饮料，或取消额外体验。"
    : budgetPreview.totalCost > budget * 0.9
      ? " 这条路线预算较紧，建议保留 5 元左右机动空间。"
      : "";
  const baseRoute = {
    ...route,
    planType: index === 0 ? "方案 A：近距离优先" : index === 1 ? "方案 B：预算稳妥" : "方案 C：偏好匹配",
    userBudget: budget,
    budgetExplanation: budgetPlan.budgetExplanation,
    transportTime: transit.estimatedTime,
    trafficPressure: transit.trafficPressure,
    transitEstimate: transit,
    transport,
    budgetWarning,
    matchingMoods,
    moodFitReason: moodFitReason(matchingMoods),
    moodTradeoffNote: tradeoffNote,
    budgetMoodNote: budgetPlan.budgetExplanation,
    steps: stepsWithTransport,
    tags: tagFor({ ...route, budgetWarning, estimatedCost: budgetPreview.totalCost }, form, variant),
    aiNote: `${route.personalizedReason ? `${route.personalizedReason} ` : ""}${route.crossRegionFallback ? "稍远但值得去：这条路线不是最近选项，但和你的偏好匹配，所以作为补充方案。 " : ""}${lowBudgetNote}${budgetWarning ? " 这个方案已经超出预算，只有在你特别想去这个方向时才建议保留。" : ""}${tightBudgetNote} ${budgetPlan.budgetExplanation}${tradeoffNote ? ` ${tradeoffNote}` : ""}${form.companion === "独自" ? " 你是独自出行，所以我也优先考虑了可随时结束、社交压力低的路线。" : form.companion === "双人" ? " 双人出行更适合把钱花在聊天停留点，而不是堆消费项目。" : " 多人出行时集合和选择弹性更重要，所以我避开了过窄、过依赖预约的路线。"}`
  };

  return attachBudgetSummary(baseRoute, budget);
}

function planSpecificScore(route, form, planType) {
  const budget = getBudgetValue(form);
  const transit = getTransitForRoute(route, form);
  const tier = getBudgetTier(budget);
  const base = scoreRoute(route, form);
  let score = base;

  if (planType === "cheap") {
    if (route.activityCost === 0) score += 18;
    if (route.estimatedCost <= 55) score += 15;
    if (transit.roundTripFare <= 10) score += 14;
    if (transit.trafficPressure === "低") score += 12;
    if (routeContains(route, ["公园", "胡同", "河", "散步", "书店"])) score += 8;
    if (routeContains(route, ["正餐", "电影", "付费", "商圈"]) && tier.key !== "high") score -= 8;
  }

  if (planType === "steady") {
    if (transit.trafficPressure !== "高") score += 20;
    if (route.weatherFit.includes(form.weather)) score += 10;
    if (route.companionFit.includes(form.companion)) score += 8;
    if (route.estimatedCost <= budget * 0.9 || ["comfortable", "high"].includes(tier.key)) score += 8;
  }

  if (planType === "vibe") {
    if (routeContains(route, ["夜景", "蓝色港湾", "三里屯", "亮马河", "798", "首钢园", "看展", "拍照", "牛街", "商圈"])) score += 24;
    if (["normal", "comfortable", "high"].includes(tier.key) && routeContains(route, ["看展", "商圈", "美食", "低预算约会", "拍照打卡"])) score += 14;
    if (tier.key === "high" && route.estimatedCost <= 45) score -= 12;
  }

  return score;
}

function pickRouteForPlan(scoredRoutes, form, planType, picked) {
  const usedDestinations = new Set(picked.map((route) => route.destination));
  const usedCategories = new Set(picked.map((route) => route.category));
  const sorted = [...scoredRoutes]
    .map((route) => ({
      route,
      score: planSpecificScore(route, form, planType)
        - (usedDestinations.has(route.destination) ? 60 : 0)
        - (usedCategories.has(route.category) ? 14 : 0)
    }))
    .sort((a, b) => b.score - a.score);

  return sorted.find(({ route }) => !picked.some((item) => item.routeId === route.routeId))?.route
    || scoredRoutes.find((route) => !picked.some((item) => item.routeId === route.routeId));
}

async function generateRecommendationResult(form) {
  const rawResolvedStart = form.startLocation || (await resolveStartLocation(form.start));
  const resolvedStart = await enrichStartLocationTransit(rawResolvedStart);
  if (resolvedStart.needsClarification || !Number.isFinite(resolvedStart.lat) || !Number.isFinite(resolvedStart.lng)) {
    return {
      routes: [],
      startLocation: resolvedStart,
      candidates: resolvedStart.candidates || [],
      message: resolvedStart.message || "这个出发地有多个可能位置，请先选择一个更准确的候选地点。"
    };
  }

  const startLocation = startInfoFromResolvedLocation(resolvedStart, form.start);
  const formWithLocation = { ...form, startLocation };
  const routePool = routesData.map(routeWithDestinationLocation);
  const rankedForUser = sortRoutesForUser(routePool, formWithLocation, startLocation);
  const mapEnhancedRoutes = await Promise.all(rankedForUser.slice(0, 3).map((route) => enhanceRouteWithMapData(route, formWithLocation, startLocation)));
  const routes = mapEnhancedRoutes.map((route, index) => cloneWithAdjustments(route, formWithLocation, ["cheap", "steady", "vibe"][index], index));

  return { routes, startLocation, candidates: [], message: "" };
}

async function generateRecommendations(form) {
  const result = await generateRecommendationResult(form);
  return result.routes;
}

function trafficDecisionNote(form, firstRoute) {
  const budget = getBudgetValue(form);
  const startInfo = form.startLocation || detectStartInfo(form.start);
  const stationText = [...(startInfo.nearestSubwayStations || []), ...(startInfo.nearestBusStops || [])].slice(0, 3).join(" / ");
  const startText = startInfo.name
    ? `是【${startInfo.name}】，位于【${startInfo.district || startInfo.area || "北京"}】`
    : startInfo.matchedStation
      ? `接近【${startInfo.matchedStation}】站`
      : "还不够明确";
  const targetTransit = firstRoute?.transitEstimate;
  const base = startInfo.name
    ? `我识别到你的出发地${startText}。${stationText ? `附近交通站点：${stationText}。` : ""}`
    : "没有找到唯一匹配地点，请先从候选项中选择，或换成更具体的学校名、地铁站名、商圈名。";
  if (!targetTransit) return `${base}交通费用会结合地图位置和目的地附近站点估算。`;
  if (budget <= 60 && targetTransit.roundTripFare <= 10) {
    return `${base}在 ${budget} 元预算下，交通费需要控制在 10 元左右，所以我优先考虑往返交通较可控的方案。`;
  }
  if (timePreferenceLabelForAi(form) === "只想出去 2-3 小时" && targetTransit.trafficPressure !== "低") {
    return `${base}因为你只想出去 2-3 小时，我会降低长距离和高交通压力路线的权重，优先推荐近一些、少折腾的目的地。`;
  }
  if (targetTransit.trafficPressure === "高") {
    return `${base}当前首选方案路程偏长，适合时间更宽松时考虑，实际出行前仍建议看地图导航。`;
  }
  return `${base}我会把目的地附近站点、往返票价和交通压力一起纳入排序，避免只看兴趣不看路程。`;
}

function moodDecisionCopy(form, activities, budget, area) {
  const timeText = formatTimePreference(form);
  const tier = getBudgetTier(budget);
  const budgetCopy = ["comfortable", "high"].includes(tier.key)
    ? "你这次预算比较充足，所以我保留了一个省钱方案，同时给了两个体验升级方案，加入了更舒适的餐饮、展览或夜景停留选择，避免所有方案都停留在 50 元低配路线。"
    : ["veryLow", "low"].includes(tier.key)
      ? "你的预算比较紧，所以我优先控制交通和餐饮成本，把免费活动作为核心，避免推荐需要门票、正餐或高消费商圈的方案。"
      : "你的预算处在普通区间，所以我会让 A/B/C 在省钱、稳妥和体验升级之间拉开花费差异。";
  if (shouldAiJudgeMoods(form)) {
    const inferred = getEffectiveMoods(form, area, budget).join("、");
    return `你没有明确选择心情偏好，所以我根据你的预算、时间、天气、同行人数和兴趣，自动判断你更适合【${inferred}】这类低压力、预算透明、容易执行的路线。${budgetCopy}`;
  }

  return `你这次选择了【${formatMoodsForDisplay(form)}】，预算是【${budget}元】，时间是【${timeText}】，出发地是【${form.start || "大致位置"}】。所以我会把【${formatActivities(activities)}】和这些心情一起纳入排序，优先避开明显不匹配的高消费、长路程或强拥挤路线。${budgetCopy}`;
}

function App() {
  const [page, setPage] = useState("home");
  const [form, setForm] = useState(initialForm);
  const [results, setResults] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  const [locationCandidates, setLocationCandidates] = useState([]);
  const [locationStatus, setLocationStatus] = useState("idle");

  function updateForm(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "activities") next.destination = "不指定，让 AI 推荐";
      if (key === "start") {
        next.startLocation = null;
        setLocationCandidates([]);
        setLocationNotice("");
        setLocationStatus("idle");
      }
      return next;
    });
  }

  async function generate(targetForm = form) {
    setIsGenerating(true);
    setLocationNotice("");
    setLocationStatus("resolving");
    try {
      const result = await generateRecommendationResult(targetForm);
      if (!result.routes.length) {
        setLocationCandidates(result.candidates || []);
        setLocationNotice(result.message);
        setLocationStatus(result.candidates?.length ? "ambiguous" : "failed");
        return;
      }
      const nextForm = { ...targetForm, startLocation: result.startLocation, start: result.startLocation.name || targetForm.start };
      setForm(nextForm);
      setLocationCandidates([]);
      setLocationNotice("");
      setLocationStatus("resolved");
      setResults(result.routes);
      setSelectedRoute(result.routes[0]);
      setPage("results");
    } finally {
      setIsGenerating(false);
    }
  }

  function chooseStartCandidate(candidate) {
    const nextForm = { ...form, start: candidate.name, startLocation: candidate };
    setForm(nextForm);
    setLocationCandidates([]);
    setLocationNotice(`已选择：${candidate.name}，位于${candidate.district || "北京"}。`);
    setLocationStatus("resolved");
    generate(nextForm);
  }

  return (
    <main className="screen font-sans">
      {page === "home" && <HomePage onStart={() => setPage("form")} />}
      {page === "form" && <FormPage form={form} updateForm={updateForm} onGenerate={() => generate()} onBack={() => setPage("home")} isGenerating={isGenerating} locationNotice={locationNotice} locationCandidates={locationCandidates} locationStatus={locationStatus} onChooseStartCandidate={chooseStartCandidate} />}
      {page === "results" && (
        <ResultPage
          form={form}
          results={results}
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          onBack={() => setPage("form")}
          onFeedback={() => setPage("feedback")}
        />
      )}
      {page === "feedback" && <FeedbackPage selectedRoute={selectedRoute} onBack={() => setPage("results")} onRestart={() => setPage("home")} />}
    </main>
  );
}

function HomePage({ onStart }) {
  const tags = ["预算可控", "交通不折腾", "适合北京大学生", "周末半日/一日轻出行", "AI 帮你快速决策"];
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-8 sm:px-8">
      <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-leaf shadow-sm">你的个性化推荐助手</div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black leading-none tracking-normal text-ink sm:text-7xl lg:text-8xl">周末50元</h1>
            <p className="text-2xl font-bold text-leaf sm:text-3xl">北京大学生低预算轻出行 AI 助手</p>
            <p className="max-w-2xl text-xl leading-8 text-slate-700">输入预算、心情和出发地，30秒生成一条真的能去的周末路线。</p>
          </div>
          <p className="max-w-2xl rounded-[24px] bg-white/75 p-5 text-lg leading-8 text-slate-700 shadow-soft">
            不是不想出门，是攻略太多、预算太紧、北京太大，不知道怎么选。
          </p>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">{tag}</span>
            ))}
          </div>
          <button onClick={onStart} className="rounded-full bg-ink px-8 py-4 text-lg font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-leaf">
            开始生成我的路线
          </button>
        </div>
        <div className="rounded-[32px] bg-white/80 p-5 shadow-soft">
          <div className="rounded-[26px] bg-gradient-to-br from-mint via-skysoft to-cream p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-leaf">AI 正在帮你省钱</span>
              <span className="text-sm font-semibold text-slate-600">预算：50 元</span>
            </div>
            <div className="space-y-4">
              {["从五道口出发，别把路程排太满。", "晴天优先免费户外空间，餐饮压到简餐。", "给你 3 个方案：省钱、稳妥、氛围感。"].map((line) => (
                <div key={line} className="rounded-2xl bg-white/85 p-4 text-base font-semibold text-slate-700 shadow-sm">{line}</div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {["30元", "50元", "80元"].map((budget) => (
                <div key={budget} className="rounded-2xl bg-white/70 p-4 text-center">
                  <p className="text-2xl font-black text-ink">{budget}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">可执行路线</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormPage({ form, updateForm, onGenerate, onBack, isGenerating, locationNotice, locationCandidates, locationStatus, onChooseStartCandidate }) {
  const selectedManualActivities = form.activities.filter((activity) => activity !== aiActivityOption);
  const destinationSourceActivities = selectedManualActivities.length ? selectedManualActivities : ["散步放空"];
  const currentDestinations = keepUnspecifiedDestinationLast(destinationSourceActivities.flatMap((activity) => destinationOptions[activity] || []));
  const startLocation = detectStartInfo(form.start);
  const resolvedStationText = [...(form.startLocation?.nearestSubwayStations || []), ...(form.startLocation?.nearestBusStops || [])].slice(0, 3).join(" / ");
  const locationStatusText = locationStatus === "resolving"
    ? "正在识别你的真实位置..."
    : form.startLocation
      ? form.startLocation.type === "subway_station"
        ? `我识别到你的出发地是【${form.startLocation.name}】，属于北京地铁站。线路：${form.startLocation.subwayLines?.join(" / ") || "以地图实时信息为准"}。主出发站：${form.startLocation.name}。`
        : `我识别到你的出发地是【${form.startLocation.name}】，位于【${form.startLocation.district || startLocation.area}】。${resolvedStationText ? `推荐出发站：${resolvedStationText}。` : "生成时继续查询附近站点。"}`
      : locationStatus === "ambiguous"
        ? "我找到了多个可能位置，请先从下面候选项中选择。"
        : locationStatus === "failed"
          ? "没有找到唯一匹配地点，请从候选项中选择，或换成更具体的学校名、校区名、地铁站名。"
          : "点击生成后，我会用地图解析你的出发地，并优先推荐附近路线。";
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <HeaderBar title="轻量问卷" subtitle="像和 AI 助手聊天一样，把周末约束告诉它。" onBack={onBack} />
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] bg-white/85 p-6 shadow-soft">
          <label className="text-xl font-black text-ink">请输入你的出发地</label>
          <input
            value={form.start}
            onChange={(event) => updateForm("start", event.target.value)}
            placeholder="请输入你的出发地"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
          />
          <p className="mt-3 text-sm leading-6 text-slate-500">可以填写学校、宿舍、校门、公交站、地铁站或你当前所在的大致位置。</p>
          <div className="mt-6 rounded-2xl bg-mint/70 p-4">
            <p className="text-sm font-bold text-leaf">地图位置识别</p>
            <p className="mt-1 text-lg font-black text-ink">{form.startLocation?.name || startLocation.matchedStation || "等待生成时解析真实位置"}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{locationStatusText}</p>
          </div>
          {locationNotice && <p className="mt-4 rounded-2xl bg-sun/25 p-4 text-sm font-black leading-6 text-ink">{locationNotice}</p>}
          {locationCandidates?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-black text-ink">请选择更准确的出发地</p>
              {locationCandidates.map((candidate) => (
                <button
                  key={`${candidate.name}-${candidate.address}`}
                  type="button"
                  onClick={() => onChooseStartCandidate(candidate)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-leaf"
                >
                  <p className="font-black text-ink">{candidate.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{candidate.district} · {candidate.address}</p>
                  {[...(candidate.nearestSubwayStations || []), ...(candidate.nearbySubwayStations || [])].length > 0 && (
                    <p className="mt-1 text-xs font-bold text-leaf">推荐出发站：{[...(candidate.nearestSubwayStations || []), ...(candidate.nearbySubwayStations || [])].slice(0, 2).join(" / ")}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <QuestionCard title="预算选择">
          <div className="grid choice-grid gap-3">
            {["30元", "50元", "80元", "100元", "自定义预算"].map((option) => (
              <OptionButton key={option} active={form.budgetType === option} onClick={() => updateForm("budgetType", option)}>{option}</OptionButton>
            ))}
          </div>
          {form.budgetType === "自定义预算" && (
            <input
              value={form.customBudget}
              onChange={(event) => updateForm("customBudget", event.target.value)}
              inputMode="numeric"
              placeholder="输入你的预算，例如 65"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-5 py-3 outline-none focus:border-leaf focus:ring-4 focus:ring-mint"
            />
          )}
        </QuestionCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <QuestionCard title="时间选择">
          <TimeSelector form={form} updateForm={updateForm} />
        </QuestionCard>
        <QuestionCard title="今天想干什么">
          <MultiChoiceGroup
            options={[...activityOptions, aiActivityOption]}
            value={form.activities}
            onChange={(option) => updateForm("activities", toggleActivity(form.activities, option))}
          />
        </QuestionCard>
        <QuestionCard title="想去的地方">
          <ChoiceGroup options={currentDestinations} value={form.destination} onChange={(value) => updateForm("destination", value)} />
        </QuestionCard>
        <QuestionCard title="天气选择">
          <ChoiceGroup options={["晴天", "雨天", "太热", "太冷", "不确定"]} value={form.weather} onChange={(value) => updateForm("weather", value)} />
        </QuestionCard>
        <QuestionCard title="同行人数">
          <ChoiceGroup options={["独自", "双人", "多人"]} value={form.companion} onChange={(value) => updateForm("companion", value)} />
        </QuestionCard>
        <QuestionCard title="心情选择">
          <MultiChoiceGroup
            options={moodOptions}
            value={form.moods}
            onChange={(option) => updateForm("moods", toggleMood(form.moods, option))}
            featuredOption={aiMoodOption}
          />
        </QuestionCard>
      </div>

      <div className="sticky bottom-4 mt-7 rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">当前为原型版本，使用规则匹配模拟 AI 推荐，后续可接入真实地图、天气和大模型 API。</p>
          <button onClick={onGenerate} disabled={isGenerating} className="rounded-full bg-ink px-7 py-3 font-black text-white transition hover:bg-leaf disabled:cursor-wait disabled:bg-slate-400">
            {isGenerating ? "正在识别你的真实位置..." : "生成 3 个路线方案"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ResultPage({ form, results, selectedRoute, setSelectedRoute, onBack, onFeedback }) {
  const budget = getBudgetValue(form);
  const area = form.startLocation?.district || detectStartArea(form.start || "");
  const activities = getActivityContext(form, area, budget);
  const cheapest = results[0];
  const decisionNote = trafficDecisionNote(form, cheapest);
  const moodNote = moodDecisionCopy(form, activities, budget, area);
  const startName = form.startLocation?.name || form.start || "大致位置";
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <HeaderBar title="AI 路线结果" subtitle="不是推荐最贵的地方，而是推荐真的能执行的周末方案。" onBack={onBack} />
      <div className="mt-6 rounded-[28px] bg-ink p-6 text-white shadow-soft">
        <p className="text-sm font-bold text-sun">AI 决策说明</p>
        <p className="mt-3 text-lg leading-8">
          {moodNote} 根据你从<span className="font-black text-sun">【{startName}】</span>出发、预算
          <span className="font-black text-sun">【{budget}元】</span>、想要<span className="font-black text-sun">【{formatActivities(activities)}】</span>、时间是
          <span className="font-black text-sun">【{formatTimePreference(form)}】</span>、天气是
          <span className="font-black text-sun">【{form.weather}】</span>、同行状态是<span className="font-black text-sun">【{form.companion}】</span>，我没有优先推荐高消费路线，而是选择了几条预算更透明、交通相对可控、可以真的执行的轻出行方案。{decisionNote}
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {results.map((route) => (
            <RouteCard key={route.routeId} route={route} form={form} selected={selectedRoute?.routeId === route.routeId} onSelect={() => setSelectedRoute(route)} />
          ))}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <RealMap route={selectedRoute || cheapest} form={form} />
          <BudgetBreakdown route={selectedRoute || cheapest} />
          <AlternativeOptions route={selectedRoute || cheapest} />
          <button onClick={onFeedback} className="w-full rounded-full bg-leaf px-6 py-4 text-lg font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-ink">
            去做用户反馈验证
          </button>
        </aside>
      </div>
    </section>
  );
}

function RouteCard({ route, form, selected, onSelect }) {
  const fullText = buildCopyableRouteText(route, form);
  const placeText = buildPlaceListText(route);
  return (
    <article className={`rounded-[28px] border bg-white/90 p-6 shadow-soft transition ${selected ? "border-leaf ring-4 ring-mint" : "border-white/70"}`}>
      <div
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelect();
        }}
        role="button"
        tabIndex={0}
        className="w-full text-left outline-none"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-leaf">{route.planType}</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{route.routeName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{route.category} · 适合：{route.suitableFor.slice(0, 4).join(" / ")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[260px]">
            <Metric label="总花费" value={`${route.estimatedCost}元`} />
            <Metric label="使用率" value={`${route.budgetUsageRate}%`} />
            <Metric label="预算状态" value={route.budgetStatus} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-2xl bg-cream/80 p-4 text-sm font-black text-slate-700 sm:grid-cols-4">
          <span>用户预算：{route.userBudget}元</span>
          <span>预计花费：{route.estimatedCost}元</span>
          <span>预算使用率：{route.budgetUsageRate}%</span>
          <span>状态：{route.budgetStatus}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {route.tags.map((tag) => <span key={tag} className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-slate-700">{tag}</span>)}
        </div>
        <p className="mt-5 text-base leading-8 text-slate-700">{route.description}</p>
        <div className="mt-4 grid gap-3 rounded-2xl bg-mint/60 p-4 text-sm font-semibold leading-7 text-slate-700">
          <p><span className="font-black text-leaf">匹配心情：</span>{route.matchingMoods.length ? route.matchingMoods.join("、") : "AI 综合判断"}</p>
          <p><span className="font-black text-leaf">为什么适合：</span>{route.moodFitReason}</p>
          {route.moodTradeoffNote && <p><span className="font-black text-leaf">取舍说明：</span>{route.moodTradeoffNote}</p>}
        </div>
        <p className="mt-3 rounded-2xl bg-skysoft/70 p-4 text-sm font-semibold leading-7 text-slate-700">{route.aiNote}</p>
      </div>
      <TransitEstimateBlock estimate={route.transitEstimate} />
      <TransportPlanBlock transport={route.transport} />
      <LocationDetails route={route} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <CopyRouteButton text={fullText} className="w-full rounded-full bg-ink px-5 py-4 text-sm font-black text-white transition hover:bg-leaf">
          复制完整方案
        </CopyRouteButton>
        <CopyRouteButton text={placeText} className="w-full rounded-full bg-leaf px-5 py-4 text-sm font-black text-white transition hover:bg-ink">
          复制地点清单
        </CopyRouteButton>
        <a
          href={buildAmapSearchUrl(route.destination || route.routeName)}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-full bg-sun px-5 py-4 text-center text-sm font-black text-ink transition hover:-translate-y-0.5"
        >
          查看目的地地图
        </a>
      </div>
      <div className="mt-5 grid gap-3">
        {route.steps.map((step, index) => (
          <div key={`${step.place}-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[120px_1fr_90px]">
            <p className="font-black text-ink">{step.place}</p>
            <div>
              <p className="font-semibold text-slate-700">{step.action}</p>
              <p className="mt-1 text-sm text-slate-500">{step.tip}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{step.nearestSubway} · {step.estimatedStay}</p>
            </div>
            <p className="font-black text-leaf">{step.cost}元</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoBlock title="省钱提醒" text={route.savingTip} />
        <InfoBlock title="可能踩雷点" text={route.riskTip} />
        <InfoBlock title="预算策略" text={route.budgetExplanation} />
      </div>
    </article>
  );
}

function LocationDetails({ route }) {
  const locationSteps = route.steps.filter((step) => step.costType !== "transport");
  return (
    <section className="mt-5 rounded-2xl bg-cream/80 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-leaf">具体位置</p>
          <h3 className="text-lg font-black text-ink">能直接打开地图的地点清单</h3>
        </div>
        <p className="text-sm font-semibold text-slate-600">建议出门前再看一次高德实时导航和店铺状态。</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {locationSteps.map((step) => (
          <div key={step.id} className="rounded-2xl bg-white/85 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-ink">{step.place}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{step.address}</p>
              </div>
              <span className="shrink-0 rounded-full bg-mint px-3 py-1 text-xs font-black text-leaf">{step.type}</span>
            </div>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
              <span>最近地铁：{step.nearestSubway}</span>
              <span>预计停留：{step.estimatedStay}</span>
              <span>预计花费：{step.cost}元</span>
              <span>开放：{step.openTime}</span>
            </div>
            {step.primaryPoi && (
              <div className="mt-3 rounded-2xl bg-mint/70 p-3 text-sm font-semibold leading-6 text-slate-700">
                <p><span className="font-black text-leaf">首选：</span>{step.primaryPoi.name} · 约 {step.primaryPoi.distance} 米 · {step.primaryPoi.estimatedCost}元</p>
                {step.alternatives?.length > 0 && <p><span className="font-black text-leaf">备选：</span>{step.alternatives.map((poi) => `${poi.name}（约${poi.estimatedCost}元）`).join(" / ")}</p>}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a
                href={buildAmapNavigationUrl(step)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-ink px-4 py-3 text-center text-sm font-black text-white"
              >
                打开地图
              </a>
              <a
                href={buildAmapSearchUrl(step.amapKeyword || step.place)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-4 py-3 text-center text-sm font-black text-leaf ring-1 ring-mint"
              >
                地图确认
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TransportPlanBlock({ transport }) {
  if (!transport) return null;
  return (
    <section className="mt-5 rounded-2xl bg-ink p-4 text-white">
      <p className="text-sm font-black text-sun">真实交通建议</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs font-bold text-sun">从哪里出发</p>
          <p className="mt-1 font-black">{transport.fromName}</p>
          <p className="mt-1 text-sm font-semibold text-white/80">主出发站：{transport.primaryStartStation?.name || transport.startStation}{transport.primaryStartStation?.lines?.length ? `（${transport.primaryStartStation.lines.join(" / ")}）` : ""}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs font-bold text-sun">去哪里</p>
          <p className="mt-1 font-black">{transport.destinationName}</p>
          <p className="mt-1 text-sm font-semibold text-white/80">主到达站：{transport.primaryEndStation?.name || transport.endStation}{transport.primaryEndStation?.lines?.length ? `（${transport.primaryEndStation.lines.join(" / ")}）` : ""}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs font-bold text-sun">时间/距离</p>
          <p className="mt-1 font-black">{transport.estimatedDuration} · {transport.estimatedDistance}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-xs font-bold text-sun">交通费</p>
          <p className="mt-1 font-black">往返约 {transport.estimatedTransportCost} 元</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/85">{transport.transitSummary}</p>
      {transport.nearbyBusStops?.length > 0 && (
        <p className="mt-2 text-xs font-semibold leading-5 text-white/65">
          附近公交补充：{transport.nearbyBusStops.slice(0, 2).map((stop) => stop.name).join(" / ")}
        </p>
      )}
      {transport.mapRouteUrl && (
        <a href={transport.mapRouteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full bg-sun px-4 py-3 text-sm font-black text-ink">
          打开高德路线
        </a>
      )}
    </section>
  );
}

function BudgetBreakdown({ route }) {
  if (!route) return null;
  const budget = calculateRouteBudget(route);
  const items = [
    ["交通费", budget.transportCost],
    ["餐饮/饮品", budget.foodCost],
    ["门票", budget.ticketCost],
    ["活动消费", budget.activityCost],
    ["其他", budget.otherCost]
  ];
  return (
    <section className="rounded-[28px] bg-white/90 p-6 shadow-soft">
      <h3 className="text-xl font-black text-ink">预算明细</h3>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
            <span className="font-bold text-slate-600">{label}</span>
            <span className="text-lg font-black text-ink">{value}元</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-ink p-4 text-white">
        <p className="text-sm font-bold text-sun">预计总花费</p>
        <p className="mt-1 text-4xl font-black">{budget.totalCost}元</p>
        <p className="mt-2 text-sm font-bold text-sun">用户预算 {route.userBudget} 元 · 使用率 {route.budgetUsageRate}% · {route.budgetStatus}</p>
        {route.budgetWarning && <p className="mt-2 text-sm font-bold text-sun">可能超预算，建议减少升级项、餐饮或机动费用。</p>}
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">交通费为估算值，实际以地图导航和公共交通票价为准。</p>
    </section>
  );
}

function TransitEstimateBlock({ estimate }) {
  if (!estimate) return null;
  const rows = [
    ["出发地识别", estimate.startLabel],
    ["推荐到达站", estimate.arrivalStations.join(" / ")],
    ["推荐交通方式", estimate.recommendedMode],
    ["单程票价估计", `约 ${estimate.oneWayFare} 元`],
    ["往返交通费", `约 ${estimate.roundTripFare} 元`],
    ["单程时间估计", estimate.estimatedTime],
    ["交通压力", estimate.trafficPressure],
    ["接驳费用/时间", `${estimate.accessFare} · ${estimate.accessTime}`]
  ];

  return (
    <section className="mt-5 rounded-2xl bg-mint/60 p-4 text-left">
      <p className="text-sm font-black text-leaf">交通估算</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/75 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-black text-ink">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{estimate.explanation}</p>
    </section>
  );
}

function AlternativeOptions({ route }) {
  if (!route) return null;
  return (
    <section className="rounded-[28px] bg-white/90 p-6 shadow-soft">
      <h3 className="text-xl font-black text-ink">替代方案</h3>
      <div className="mt-4 space-y-3">
        <InfoBlock title="坏天气替代" text={route.badWeatherAlternative} />
        <InfoBlock title="推荐理由" text={route.whyRecommended} />
      </div>
    </section>
  );
}

function FeedbackPage({ selectedRoute, onBack, onRestart }) {
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({
    willGo: "可能会",
    budgetTrust: "基本可信",
    usefulInfo: "总预算",
    addMore: "",
    difference: ""
  });

  function setAnswer(key, value) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  if (submitted) {
    return (
      <section className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-8">
        <div className="rounded-[32px] bg-white/90 p-8 text-center shadow-soft">
          <p className="text-sm font-black text-leaf">课堂验证反馈已记录</p>
          <h1 className="mt-3 text-4xl font-black text-ink">感谢反馈！</h1>
          <p className="mt-4 text-lg leading-8 text-slate-700">你的回答会帮助我们判断这个低预算 AI 出行助手是否真的解决了大学生周末出行的决策困难。</p>
          <button onClick={onRestart} className="mt-7 rounded-full bg-ink px-7 py-3 font-black text-white">回到首页</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <HeaderBar title="用户反馈验证" subtitle={selectedRoute ? `当前验证路线：${selectedRoute.routeName}` : "让非组员试用后填写。"} onBack={onBack} />
      <div className="mt-6 space-y-5 rounded-[32px] bg-white/90 p-6 shadow-soft">
        <QuestionCard title="你会真的去这条路线吗？">
          <ChoiceGroup options={["会", "可能会", "不会"]} value={answers.willGo} onChange={(value) => setAnswer("willGo", value)} />
        </QuestionCard>
        <QuestionCard title="你觉得预算可信吗？">
          <ChoiceGroup options={["可信", "基本可信", "不太可信"]} value={answers.budgetTrust} onChange={(value) => setAnswer("budgetTrust", value)} />
        </QuestionCard>
        <QuestionCard title="哪个信息最有用？">
          <ChoiceGroup options={["总预算", "交通时间", "省钱提醒", "替代方案", "推荐理由", "踩雷提醒"]} value={answers.usefulInfo} onChange={(value) => setAnswer("usefulInfo", value)} />
        </QuestionCard>
        <TextQuestion title="你还希望它补充什么？" value={answers.addMore} onChange={(value) => setAnswer("addMore", value)} />
        <TextQuestion title="它和小红书、地图、大众点评相比有什么不同？" value={answers.difference} onChange={(value) => setAnswer("difference", value)} />
        <button onClick={() => setSubmitted(true)} className="w-full rounded-full bg-leaf px-7 py-4 text-lg font-black text-white shadow-soft transition hover:bg-ink">提交反馈</button>
      </div>
    </section>
  );
}

function HeaderBar({ title, subtitle, onBack }) {
  return (
    <header className="flex flex-col gap-4 rounded-[28px] bg-white/75 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-leaf">周末50元</p>
        <h1 className="text-3xl font-black text-ink">{title}</h1>
        <p className="mt-1 text-slate-600">{subtitle}</p>
      </div>
      <button onClick={onBack} className="rounded-full border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-leaf hover:text-leaf">返回</button>
    </header>
  );
}

function QuestionCard({ title, children }) {
  return (
    <section className="rounded-[28px] bg-white/85 p-6 shadow-soft">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChoiceGroup({ options, value, onChange }) {
  return (
    <div className="grid choice-grid gap-3">
      {options.map((option) => (
        <OptionButton key={option} active={value === option} onClick={() => onChange(option)}>{option}</OptionButton>
      ))}
    </div>
  );
}

function MultiChoiceGroup({ options, value, onChange, featuredOption }) {
  return (
    <div className="grid choice-grid gap-3">
      {options.map((option) => (
        <OptionButton key={option} active={value.includes(option)} featured={option === featuredOption} onClick={() => onChange(option)}>{option}</OptionButton>
      ))}
    </div>
  );
}

function TimeSelector({ form, updateForm }) {
  const quickOptions = ["半天", "一天", "晚上", "只想出去 2-3 小时"];

  function chooseQuickTime(option) {
    updateForm("timeMode", "quick");
    updateForm("time", option);
  }

  return (
    <div>
      <div className="grid choice-grid gap-3">
        {quickOptions.map((option) => (
          <OptionButton key={option} active={form.timeMode === "quick" && form.time === option} onClick={() => chooseQuickTime(option)}>{option}</OptionButton>
        ))}
        <OptionButton active={form.timeMode === "custom"} onClick={() => updateForm("timeMode", "custom")}>自定义时间段</OptionButton>
      </div>
      {form.timeMode === "custom" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-600">
            开始时间
            <input
              type="time"
              value={form.customStartTime}
              onChange={(event) => updateForm("customStartTime", event.target.value)}
              onInput={(event) => updateForm("customStartTime", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
            />
          </label>
          <label className="text-sm font-bold text-slate-600">
            结束时间
            <input
              type="time"
              value={form.customEndTime}
              onChange={(event) => updateForm("customEndTime", event.target.value)}
              onInput={(event) => updateForm("customEndTime", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function OptionButton({ active, featured = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-ink text-white shadow-soft"
          : featured
            ? "bg-sun/25 text-ink ring-2 ring-sun hover:-translate-y-0.5"
            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-leaf"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-mint/70 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}

function InfoBlock({ title, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-black text-leaf">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function TextQuestion({ title, value, onChange }) {
  return (
    <section>
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white px-5 py-4 outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint"
        placeholder="请写下你的真实想法，课堂验证时可以直接让同学填写。"
      />
    </section>
  );
}

export { generateRecommendations, getBudgetTier };

export default App;
