import { fullBeijingSubwayStationDatabase } from "../data/beijingSubwayStations.js";

const primaryLocalStationAliases = new Map([
  ["良乡大学城", "良乡大学城站"],
  ["良乡大学城站", "良乡大学城站"],
  ["沙河", "沙河站"],
  ["沙河站", "沙河站"],
  ["西土城", "西土城站"],
  ["西土城站", "西土城站"],
  ["五道口", "五道口站"],
  ["五道口站", "五道口站"],
  ["中关村", "中关村站"],
  ["中关村站", "中关村站"]
]);

const regionCenters = {
  海淀: { lat: 39.9766, lng: 116.3540 },
  朝阳: { lat: 39.9333, lng: 116.4617 },
  东城: { lat: 39.9142, lng: 116.4116 },
  西城: { lat: 39.9072, lng: 116.3742 },
  通州: { lat: 39.9161, lng: 116.6611 },
  大兴: { lat: 39.8062, lng: 116.4908 },
  房山: { lat: 39.7299, lng: 116.1673 },
  昌平: { lat: 40.1649, lng: 116.2885 },
  石景山: { lat: 39.9162, lng: 116.1635 },
  城区: { lat: 39.9042, lng: 116.4074 }
};

export function normalizeStationInput(input) {
  return String(input || "")
    .trim()
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\s+/g, "")
    .replace(/^北京/, "")
    .replace(/地铁站|地铁/g, "")
    .replace(/站$/g, "");
}

export function isSubwayStationQuery(input) {
  const text = String(input || "").trim();
  return /地铁站|地铁|站/.test(text) || Boolean(findSubwayStationByAlias(text) || fuzzyFindSubwayStation(text));
}

export function findSubwayStationByAlias(input) {
  const normalized = normalizeStationInput(input);
  const primaryStationName = primaryLocalStationAliases.get(normalized) || primaryLocalStationAliases.get(String(input || "").trim());
  if (primaryStationName) {
    const primaryStation = fullBeijingSubwayStationDatabase.find((station) => station.name === primaryStationName);
    if (primaryStation) return primaryStation;
  }
  return fullBeijingSubwayStationDatabase.find((station) => station.aliases.some((alias) => normalizeStationInput(alias) === normalized));
}

function similarityScore(inputCore, stationCore) {
  if (!inputCore || !stationCore) return 0;
  if (inputCore === stationCore) return 1;
  if (stationCore.includes(inputCore) || inputCore.includes(stationCore)) return 0.9;
  let common = 0;
  [...new Set(inputCore)].forEach((char) => {
    if (stationCore.includes(char)) common += 1;
  });
  return common / Math.max(inputCore.length, stationCore.length);
}

export function fuzzyFindSubwayStation(input) {
  const normalized = normalizeStationInput(input);
  const scored = fullBeijingSubwayStationDatabase
    .map((station) => {
      const stationCore = normalizeStationInput(station.name);
      const aliasScore = Math.max(...station.aliases.map((alias) => similarityScore(normalized, normalizeStationInput(alias))));
      return { ...station, confidence: Math.max(similarityScore(normalized, stationCore), aliasScore) };
    })
    .filter((station) => station.confidence >= 0.72)
    .sort((a, b) => b.confidence - a.confidence);

  if (!scored.length) return null;
  const [first, second] = scored;
  if (first.confidence >= 0.85 && (!second || first.confidence - second.confidence >= 0.08 || normalizeStationInput(first.name) === normalized)) {
    return first;
  }
  return first.confidence >= 0.9 ? first : null;
}

export async function resolveSubwayStation(input) {
  const station = findSubwayStationByAlias(input) || fuzzyFindSubwayStation(input);
  if (!station) {
    return {
      status: "failed",
      message: "没有识别到这个北京地铁站，请检查站名是否正确。"
    };
  }
  return {
    status: "resolved",
    location: {
      ...station,
      rawInput: input,
      type: "subway_station",
      lat: station.lat ?? regionCenters[station.region]?.lat,
      lng: station.lng ?? regionCenters[station.region]?.lng,
      coordinateStatus: station.lat && station.lng ? "exact_or_curated" : "region_fallback_pending_amap",
      confidence: station.confidence || 0.95,
      source: station.source || "local_subway_database",
      nearestSubwayStations: [station.name],
      nearbySubwayStations: [station.name],
      nearestBusStops: station.nearbyBusStops || []
    }
  };
}
