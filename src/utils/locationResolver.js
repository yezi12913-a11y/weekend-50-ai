import { loadAmap } from "./amapClient.js";
import { amapLocationToLngLat } from "./amapService.js";
import { normalizeBeijingLocationAlias } from "../data/beijingLocationAliases.js";
import { findFallbackLocation } from "../data/beijingFallbackPois.js";
import { findRailwayStation } from "../data/beijingSubwayStations.js";
import { fuzzyFindSubwayStation, isSubwayStationQuery as isSubwayQueryByMatcher, resolveSubwayStation as resolveSubwayStationByMatcher } from "./subwayMatcher.js";
import { fuzzyFindUniversity, isUniversityQuery, resolveUniversity } from "./universityMatcher.js";

const knownLocations = [
  { match: /北邮|北京邮电大学/, name: "北京邮电大学", district: "海淀区", address: "北京市海淀区西土城路10号", lat: 39.9623, lng: 116.3588, nearestSubwayStations: ["蓟门桥站", "西土城站"], nearestBusStops: ["明光桥北公交站"], confidence: 0.92 },
  { match: /五道口/, name: "五道口", district: "海淀区", address: "北京市海淀区五道口", lat: 39.9929, lng: 116.3373, nearestSubwayStations: ["五道口站"], nearestBusStops: ["五道口公交站"], confidence: 0.9 },
  { match: /北京大学东门|北大东门/, name: "北京大学东门", district: "海淀区", address: "北京市海淀区成府路北京大学东门", lat: 39.9922, lng: 116.3158, nearestSubwayStations: ["北京大学东门站"], nearestBusStops: ["中关园公交站"], confidence: 0.94 },
  { match: /清华大学|清华/, name: "清华大学", district: "海淀区", address: "北京市海淀区清华园", lat: 40.0032, lng: 116.3269, nearestSubwayStations: ["清华东路西口站", "圆明园站"], nearestBusStops: ["清华大学西门公交站"], confidence: 0.9 },
  { match: /北京南站/, name: "北京南站", district: "丰台区", address: "北京市丰台区北京南站", lat: 39.8652, lng: 116.3788, nearestSubwayStations: ["北京南站"], nearestBusStops: ["北京南站公交站"], confidence: 0.95 },
  { match: /三里屯/, name: "三里屯", district: "朝阳区", address: "北京市朝阳区三里屯", lat: 39.9367, lng: 116.4551, nearestSubwayStations: ["团结湖站", "农业展览馆站"], nearestBusStops: ["三里屯公交站"], confidence: 0.9 },
  { match: /通州北关/, name: "通州北关", district: "通州区", address: "北京市通州区通州北关", lat: 39.9165, lng: 116.6624, nearestSubwayStations: ["通州北关站"], nearestBusStops: ["通州北关公交站"], confidence: 0.92 },
  { match: /通州北苑/, name: "通州北苑", district: "通州区", address: "北京市通州区通州北苑", lat: 39.9031, lng: 116.6377, nearestSubwayStations: ["通州北苑站"], nearestBusStops: ["通州北苑路口公交站"], confidence: 0.92 },
  { match: /海淀黄庄/, name: "海淀黄庄", district: "海淀区", address: "北京市海淀区海淀黄庄", lat: 39.9756, lng: 116.3176, nearestSubwayStations: ["海淀黄庄站"], nearestBusStops: ["海淀黄庄北公交站"], confidence: 0.94 },
  { match: /亦庄文化园/, name: "亦庄文化园", district: "大兴区", address: "北京市大兴区亦庄文化园", lat: 39.8062, lng: 116.4908, nearestSubwayStations: ["亦庄文化园站"], nearestBusStops: ["亦庄文化园公交站"], confidence: 0.9 },
  { match: /良乡大学城/, name: "良乡大学城", district: "房山区", address: "北京市房山区良乡大学城", lat: 39.7299, lng: 116.1673, nearestSubwayStations: ["良乡大学城站"], nearestBusStops: ["良乡大学城公交站"], confidence: 0.92 },
  { match: /前门/, name: "前门", district: "东城区", address: "北京市东城区前门", lat: 39.8993, lng: 116.3976, nearestSubwayStations: ["前门站"], nearestBusStops: ["前门公交站"], confidence: 0.92 },
  { match: /^学校东门$/, name: "北京大学东门", district: "海淀区", address: "北京市海淀区成府路北京大学东门", lat: 39.9922, lng: 116.3158, nearestSubwayStations: ["北京大学东门站"], nearestBusStops: ["中关园公交站"], confidence: 0.68 }
];

const ambiguousLocations = {
  万达: [
    { name: "通州万达广场", district: "通州区", address: "北京市通州区新华西街58号", lat: 39.9026, lng: 116.6428 },
    { name: "石景山万达广场", district: "石景山区", address: "北京市石景山区石景山路乙18号", lat: 39.9077, lng: 116.2227 },
    { name: "丰台万达广场", district: "丰台区", address: "北京市丰台区丰科路6号", lat: 39.8254, lng: 116.2964 }
  ]
};

export function isRailwayStationQuery(input) {
  return /北京站|北京南站|北京西站/.test(String(input || "").trim());
}

export function isSubwayStationQuery(input) {
  const text = String(input || "").trim();
  if (isRailwayStationQuery(text)) return false;
  return isSubwayQueryByMatcher(text);
}

function hasExplicitSubwayHint(input) {
  const text = String(input || "").trim();
  if (isRailwayStationQuery(text)) return false;
  return /地铁站|地铁|站/.test(text);
}

function hasPrimaryLocalSubwayMatch(input) {
  return /^(良乡大学城|良乡大学城站|沙河|沙河站|西土城|西土城站|五道口|五道口站|中关村|中关村站)$/.test(String(input || "").trim());
}

function stationToLocation(station, rawInput, source) {
  return {
    rawInput,
    name: station.name,
    type: station.type,
    district: station.district,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    subwayLines: station.subwayLines || [],
    nearestSubwayStations: station.type === "subway_station" ? [station.name] : station.subwayLines?.length ? [station.name] : [],
    nearbySubwayStations: station.type === "subway_station" ? [station.name] : [station.name],
    nearbyBusStops: station.nearbyBusStops || [],
    nearestBusStops: station.nearbyBusStops || [],
    region: station.region,
    confidence: 0.95,
    source,
    candidates: [],
    needsClarification: false
  };
}

export async function resolveSubwayStation(input) {
  const result = await resolveSubwayStationByMatcher(input);
  return result.status === "resolved" ? result.location : null;
}

export async function resolveRailwayStation(input) {
  const station = findRailwayStation(input);
  if (station) return stationToLocation(station, input, "beijing_railway_fallback");
  return null;
}

export async function resolveSchoolOrCampus(input) {
  const result = await resolveUniversity(input);
  if (result.status === "resolved") return result.location;
  if (result.status === "ambiguous") {
    return {
      rawInput: input,
      name: result.universityName || "",
      district: "",
      address: "",
      lat: undefined,
      lng: undefined,
      nearestSubwayStations: [],
      nearestBusStops: [],
      confidence: 0.82,
      source: "local_university_database",
      candidates: result.candidates || [],
      needsClarification: true,
      message: result.message
    };
  }
  const local = knownLocations.find((item) => /大学|学院|学校|北邮|北大|清华|人大/.test(input) && item.match.test(input));
  return local ? localCandidateToLocation(local, input) : null;
}

export async function resolveScenicSpot(input) {
  const normalizedInput = normalizeBeijingLocationAlias(input);
  const fallback = findFallbackLocation(normalizedInput) || findFallbackLocation(input);
  return fallback ? fallbackGroupToLocation(fallback, input) : null;
}

export async function resolveBusinessArea(input) {
  const candidates = await getLocationCandidates(input);
  return candidates[0] || null;
}

function localCandidateToLocation(candidate, rawInput, source = "local_knowledge") {
  return {
    rawInput,
    name: candidate.name,
    district: candidate.district || "",
    address: candidate.address || "",
    lat: candidate.lat,
    lng: candidate.lng,
    nearestSubwayStations: candidate.nearestSubwayStations || [],
    nearestBusStops: candidate.nearestBusStops || [],
    confidence: candidate.confidence || 0.72,
    source,
    candidates: []
  };
}

function fallbackGroupToLocation(group, rawInput) {
  return {
    rawInput,
    name: group.name,
    district: group.district,
    address: group.address,
    lat: group.lat,
    lng: group.lng,
    nearestSubwayStations: group.nearbySubwayStations || [],
    nearestBusStops: group.nearbyBusStops || [],
    confidence: 0.86,
    source: "fallback_location",
    candidates: []
  };
}

export function normalizeAmapLocation(poi, rawInput = "") {
  const point = amapLocationToLngLat(poi.location);
  return {
    rawInput,
    name: poi.name || rawInput,
    district: poi.adname || poi.district || "",
    address: poi.address || poi.name || "",
    lat: point.lat,
    lng: point.lng,
    nearestSubwayStations: [],
    nearestBusStops: [],
    confidence: poi.location ? 0.88 : 0.55,
    source: "amap",
    poiId: poi.id,
    candidates: []
  };
}

export function getDistrictFromLocation(location) {
  return location?.district || location?.adname || "";
}

async function searchPlaceText(keyword) {
  try {
    const AMap = await loadAmap();
    if (!AMap.PlaceSearch) {
      const error = { code: "poi_failed", message: "AMap.PlaceSearch 插件没加载。" };
      console.error("PlaceSearch failed:", "error", error);
      return [];
    }
    const placeSearch = new AMap.PlaceSearch({
      city: "北京",
      citylimit: true,
      pageSize: 6,
      extensions: "all"
    });
    return await new Promise((resolve) => {
      placeSearch.search(keyword, (status, result) => {
        console.error("PlaceSearch status/result:", status, result);
        if (status === "complete") {
          resolve(result?.poiList?.pois || []);
          return;
        }
        console.error("PlaceSearch failed:", status, result);
        resolve([]);
      });
    });
  } catch (error) {
    if (!["missing_key", "missing_security_code"].includes(error?.code)) console.error("PlaceSearch failed:", "error", error);
    return [];
  }
}

export async function getLocationCandidates(input) {
  const rawInput = String(input || "").trim();
  if (!rawInput) return [];
  const normalizedInput = normalizeBeijingLocationAlias(rawInput);

  if (isRailwayStationQuery(rawInput)) {
    const railway = await resolveRailwayStation(rawInput);
    if (railway) return [railway];
  }
  if (isSubwayStationQuery(rawInput)) {
    const subway = await resolveSubwayStation(rawInput);
    if (subway) return [subway];
  }
  if (isUniversityQuery(rawInput)) {
    const school = await resolveSchoolOrCampus(rawInput);
    if (school?.needsClarification) return school.candidates || [];
    if (school) return [school];
  }

  const ambiguousKey = Object.keys(ambiguousLocations).find((key) => rawInput === key);
  if (ambiguousKey) return ambiguousLocations[ambiguousKey].map((candidate) => localCandidateToLocation(candidate, rawInput, "local_candidates"));

  const fallback = findFallbackLocation(normalizedInput) || findFallbackLocation(rawInput);

  const amapPois = await searchPlaceText(normalizedInput);
  if (amapPois.length) {
    return amapPois
      .filter((poi) => poi.location)
      .slice(0, 6)
      .map((poi) => normalizeAmapLocation(poi, rawInput));
  }

  const local = knownLocations.filter((item) => item.match.test(rawInput) || item.match.test(normalizedInput));
  if (local.length) return local.map((candidate) => localCandidateToLocation(candidate, rawInput));
  if (fallback) return [fallbackGroupToLocation(fallback, rawInput)];
  return [];
}

export async function resolveStartLocation(input) {
  const rawInput = String(input || "").trim();
  if (!rawInput) {
    return {
      rawInput: input,
      name: "",
      district: "",
      address: "",
      lat: undefined,
      lng: undefined,
      nearestSubwayStations: [],
      nearestBusStops: [],
      confidence: 0,
      source: "unresolved",
      candidates: [],
      needsClarification: true,
      message: "请输入出发地。"
    };
  }
  if (isRailwayStationQuery(rawInput)) {
    const railway = await resolveRailwayStation(rawInput);
    if (railway) return railway;
  }
  if (hasExplicitSubwayHint(rawInput) || hasPrimaryLocalSubwayMatch(rawInput)) {
    const subway = await resolveSubwayStation(rawInput);
    if (subway) return subway;
  }
  if (isUniversityQuery(rawInput)) {
    const school = await resolveSchoolOrCampus(rawInput);
    if (school) return school;
  }
  const fuzzyUniversity = fuzzyFindUniversity(rawInput);
  if (fuzzyUniversity && fuzzyUniversity.confidence >= 0.85) {
    const school = await resolveSchoolOrCampus(rawInput);
    if (school) return school;
  }
  const fuzzySubway = fuzzyFindSubwayStation(rawInput);
  if (fuzzySubway && fuzzySubway.confidence >= 0.85) {
    const subway = await resolveSubwayStation(rawInput);
    if (subway) return subway;
  }
  const scenic = await resolveScenicSpot(rawInput);
  if (scenic) return scenic;
  const candidates = await getLocationCandidates(input);
  if (!candidates.length) {
    return {
      rawInput: input,
      name: "",
      district: "",
      address: "",
      lat: undefined,
      lng: undefined,
      nearestSubwayStations: [],
      nearestBusStops: [],
      confidence: 0,
      source: "unresolved",
      candidates: [],
      needsClarification: true,
      message: "没有找到唯一匹配地点，请从下面候选项中选择，或换成更具体的学校名、地铁站名、商圈名。"
    };
  }

  const [first, second] = candidates;
  const isAmbiguous = candidates.length > 1 && first.confidence < 0.85 && second && first.district !== second.district;
  return {
    ...first,
    candidates,
    needsClarification: isAmbiguous
  };
}

export async function resolveDestination(input) {
  const candidates = await getLocationCandidates(input);
  return candidates[0] || null;
}
