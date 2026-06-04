import { beijingSubwayStations } from "./data/beijingSubwayStations.js";
import { beijingUniversities } from "./data/beijingUniversities.js";

const specificPlacePattern = /学校东门|宿舍楼|校区|公寓|小区|校门|东门|西门|南门|北门/;

const areaFallbackRules = [
  { pattern: /五道口|中关村|海淀|魏公村|人大|北大|清华|学院路|北京大学/, area: "海淀高校区", transitZone: "northwest" },
  { pattern: /良乡|房山|北工商|首师大良乡/, area: "房山/良乡区域", transitZone: "southwest-far" },
  { pattern: /沙河|昌平|北航沙河|央财沙河/, area: "昌平/沙河区域", transitZone: "north-far" },
  { pattern: /传媒大学|中国传媒大学|朝阳|定福庄|管庄|国贸|望京|三里屯|朝阳大悦城|合生汇|798|青年路|团结湖|亮马桥|将台/, area: "朝阳/东部区域", transitZone: "east" },
  { pattern: /石景山|首钢|苹果园|古城|金安桥/, area: "石景山区域", transitZone: "west" },
  { pattern: /通州|梨园|土桥|北苑/, area: "通州区域", transitZone: "east-far" },
  { pattern: /大兴|西红门|黄村/, area: "大兴/南部区域", transitZone: "south" },
  { pattern: /西直门|北京站|北京南站|北京西站|前门|东单|西单|牛街|护国寺|平安里|广安门内|什刹海|南锣鼓巷|奥林匹克公园|森林公园南门/, area: "城区交通便利区域", transitZone: "city-center" }
];

const areaFallbackCenters = {
  海淀: { lat: 39.9623, lng: 116.3588 },
  朝阳: { lat: 39.9219, lng: 116.4855 },
  昌平: { lat: 40.1649, lng: 116.2885 },
  房山: { lat: 39.7299, lng: 116.1673 },
  通州: { lat: 39.9165, lng: 116.6624 },
  大兴: { lat: 39.7288, lng: 116.3309 },
  石景山: { lat: 39.9076, lng: 116.2529 },
  城区: { lat: 39.9042, lng: 116.4074 },
  通用区域: { lat: 39.9042, lng: 116.4074 }
};

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

function normalizeUniversityText(input) {
  return normalizeStartText(input)
    .replace(/本部/g, "")
    .replace(/北京市/g, "")
    .replace(/北京/g, "");
}

function universityAliases(university) {
  return [university.name, ...(university.aliases || [])];
}

function campusAliases(university, campus) {
  return [
    campus.name,
    `${university.name}${campus.name.replace(university.name, "")}`,
    ...(campus.aliases || [])
  ].filter(Boolean);
}

function universityArea(region, district) {
  if (region === "海淀") return { area: "海淀高校区", transitZone: "northwest" };
  if (region === "朝阳") return { area: "朝阳/东部区域", transitZone: "east" };
  if (region === "昌平") return { area: "昌平/沙河区域", transitZone: "north-far" };
  if (region === "房山") return { area: "房山/良乡区域", transitZone: "southwest-far" };
  if (region === "通州") return { area: "通州区域", transitZone: "east-far" };
  if (region === "大兴") return { area: "大兴/南部区域", transitZone: "south" };
  if (region === "石景山") return { area: "石景山区域", transitZone: "west" };
  if (/丰台|西城|东城/.test(district || "")) return { area: "城区交通便利区域", transitZone: "city-center" };
  return { area: "通用区域", transitZone: "unknown" };
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

function findUniversityCampus(input) {
  const normalized = normalizeUniversityText(input);
  if (!normalized) return null;

  for (const university of beijingUniversities) {
    for (const campus of university.campuses || []) {
      const aliases = campusAliases(university, campus).map(normalizeUniversityText);
      if (aliases.includes(normalized)) return { university, campus };
    }
  }

  for (const university of beijingUniversities) {
    const aliases = universityAliases(university).map(normalizeUniversityText);
    if (aliases.includes(normalized)) return { university, campus: university.campuses?.[0] };
  }

  for (const university of beijingUniversities) {
    for (const campus of university.campuses || []) {
      const aliases = [...universityAliases(university), ...campusAliases(university, campus)].map(normalizeUniversityText);
      if (aliases.some((alias) => alias && (normalized.includes(alias) || alias.includes(normalized)))) {
        return { university, campus };
      }
    }
  }

  return null;
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
    nearbySubwayStations: [`${station.name}站`],
    nearbyBusStops: [],
    convenience: station.convenience,
    isSpecificPlace: false,
    confidence: "station",
    debugText: `已识别：${station.name}｜${station.lines.join("、")}｜${station.area}｜交通便利度：${station.convenience}`
  };
}

function universityResult(input, match) {
  const { university, campus } = match;
  const subwayStations = campus.nearbySubwayStations || [];
  const primarySubway = subwayStations[0]?.replace(/站$/, "") || "";
  const station = primarySubway ? findStation(primarySubway) : null;
  const fallback = universityArea(campus.region, campus.district);
  const fallbackCenter = areaFallbackCenters[campus.region] || areaFallbackCenters[fallback.area] || areaFallbackCenters["通用区域"];

  return {
    originalInput: input,
    input,
    area: station?.area || fallback.area,
    transitZone: station?.transitZone || fallback.transitZone,
    matchedStation: station?.name || primarySubway || null,
    matchedStationInfo: station,
    lat: Number.isFinite(campus.lat) ? campus.lat : fallbackCenter.lat,
    lng: Number.isFinite(campus.lng) ? campus.lng : fallbackCenter.lng,
    address: campus.address,
    lines: station?.lines || [],
    nearbySubwayStations: subwayStations,
    nearbyBusStops: campus.nearbyBusStops || [],
    convenience: station?.convenience || "中",
    isSpecificPlace: true,
    confidence: "university",
    universityName: university.name,
    campusName: campus.name,
    debugText: `已识别：${campus.name}｜附近地铁：${subwayStations.join("、") || "待地图确认"}｜附近公交：${(campus.nearbyBusStops || []).join("、") || "待地图确认"}`
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
    nearbySubwayStations: [],
    nearbyBusStops: [],
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
    nearbySubwayStations: [],
    nearbyBusStops: [],
    convenience: "未知",
    isSpecificPlace: specificPlacePattern.test(normalizeStartText(input)),
    confidence: "unknown",
    debugText: "未识别到具体地铁站，将按通用位置粗略估算"
  };
}

export function detectStartLocation(input) {
  if (/校区/.test(normalizeStartText(input))) {
    const campusUniversity = findUniversityCampus(input);
    if (campusUniversity?.campus) return universityResult(input, campusUniversity);
  }

  const station = findStation(input);
  if (station) return stationResult(input, station);

  const university = findUniversityCampus(input);
  if (university?.campus) return universityResult(input, university);

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
