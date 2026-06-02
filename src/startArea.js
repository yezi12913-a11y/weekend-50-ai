import { beijingSubwayStations } from "./data/beijingSubwayStations.js";

const specificPlacePattern = /学校东门|宿舍楼|校区|公寓|小区|校门|东门|西门|南门|北门/;

const areaFallbackRules = [
  { pattern: /五道口|中关村|海淀|魏公村|人大|北大|清华|学院路|北京大学/, area: "海淀高校区", transitZone: "northwest" },
  { pattern: /良乡|房山|北工商|首师大良乡/, area: "房山/良乡区域", transitZone: "southwest-far" },
  { pattern: /沙河|昌平|北航沙河|央财沙河/, area: "昌平/沙河区域", transitZone: "north-far" },
  { pattern: /传媒大学|中国传媒大学|朝阳|定福庄|管庄|国贸|望京|三里屯|朝阳大悦城|合生汇|798|青年路|团结湖|亮马桥|将台/, area: "朝阳/东部区域", transitZone: "east" },
  { pattern: /石景山|首钢|苹果园|古城|金安桥/, area: "石景山区域", transitZone: "west" },
  { pattern: /通州|梨园|土桥|北苑/, area: "通州区域", transitZone: "east-far" },
  { pattern: /亦庄|荣京东街|同济南路|经海路|旧宫/, area: "大兴/南部区域", transitZone: "south" },
  { pattern: /北京南站|丰台|陶然亭|菜市口|天坛|蒲黄榆/, area: "城区交通便利区域", transitZone: "southwest-central" },
  { pattern: /大兴|西红门|黄村/, area: "大兴/南部区域", transitZone: "south" },
  { pattern: /西直门|北京站|北京西站|前门|东单|西单|牛街|护国寺|平安里|广安门内|什刹海|南锣鼓巷|奥林匹克公园|森林公园南门/, area: "城区交通便利区域", transitZone: "city-center" }
];

function normalizeStartText(input) {
  return String(input || "")
    .trim()
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\s+/g, "")
    .replace(/北京地铁/g, "")
    .replace(/地铁站|地铁|附近|周边|从|出发/g, "")
    .replace(/[()（）]/g, "")
    .replace(/号线/g, "号线");
}

function searchableText(input) {
  return normalizeStartText(input).replace(/\d+号线/g, "");
}

function stationTokens(station) {
  return [station.name, ...(station.aliases || [])].map((value) => normalizeStartText(value));
}

function byLongerStationName(a, b) {
  return b.name.length - a.name.length;
}

function findStation(input) {
  const normalized = normalizeStartText(input);
  const keyword = searchableText(input);
  const stations = [...beijingSubwayStations].sort(byLongerStationName);

  return (
    stations.find((station) => normalizeStartText(station.name) === keyword) ||
    stations.find((station) => stationTokens(station).includes(normalized) || stationTokens(station).includes(keyword)) ||
    stations.find((station) => keyword.includes(normalizeStartText(station.name))) ||
    stations.find((station) => normalizeStartText(station.name).includes(keyword) && keyword.length >= 2)
  );
}

function fallbackArea(input) {
  const text = normalizeStartText(input);
  return areaFallbackRules.find((rule) => rule.pattern.test(text));
}

function stationResult(input, station) {
  return {
    originalInput: input,
    input,
    area: station.area,
    transitZone: station.transitZone,
    matchedStation: station.name,
    matchedStationInfo: station,
    lines: station.lines,
    convenience: station.convenience,
    isSpecificPlace: false,
    confidence: "station",
    debugText: `已识别：${station.name}｜${station.lines.join("、")}｜${station.area}｜交通便利度：${station.convenience}`
  };
}

function areaResult(input, fallback) {
  return {
    originalInput: input,
    input,
    area: fallback.area,
    transitZone: fallback.transitZone,
    matchedStation: null,
    matchedStationInfo: null,
    lines: [],
    convenience: "未知",
    isSpecificPlace: specificPlacePattern.test(normalizeStartText(input)),
    confidence: "area",
    debugText: `未识别到具体地铁站，已按关键词估算为：${fallback.area}`
  };
}

function unknownResult(input) {
  return {
    originalInput: input,
    input,
    area: "通用区域",
    transitZone: "unknown",
    matchedStation: null,
    matchedStationInfo: null,
    lines: [],
    convenience: "未知",
    isSpecificPlace: specificPlacePattern.test(normalizeStartText(input)),
    confidence: "unknown",
    debugText: "未识别到具体地铁站，将按通用位置粗略估算"
  };
}

export function detectStartLocation(input) {
  const station = findStation(input);
  if (station) return stationResult(input, station);

  const fallback = fallbackArea(input);
  if (fallback) return areaResult(input, fallback);

  return unknownResult(input);
}

export function detectStartInfo(start) {
  return detectStartLocation(start);
}

export function detectStartArea(start) {
  return detectStartLocation(start).area;
}
