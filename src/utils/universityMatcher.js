import { beijingUniversities } from "../data/beijingUniversities.js";

const regionCenters = {
  海淀: { lat: 39.9766, lng: 116.354 },
  朝阳: { lat: 39.9333, lng: 116.4617 },
  东城: { lat: 39.9142, lng: 116.4116 },
  西城: { lat: 39.9072, lng: 116.3742 },
  城区: { lat: 39.9042, lng: 116.4074 },
  丰台: { lat: 39.8584, lng: 116.2867 },
  昌平: { lat: 40.1649, lng: 116.2885 },
  房山: { lat: 39.7299, lng: 116.1673 },
  通州: { lat: 39.9161, lng: 116.6611 },
  大兴: { lat: 39.8062, lng: 116.4908 },
  石景山: { lat: 39.9162, lng: 116.1635 },
  怀柔: { lat: 40.316, lng: 116.6318 }
};

const schoolKeywords = /大学|学院|学校|校区|北大|清华|人大|北师大|北航|北理工|北邮|北交大|北科大|北化|北工大|农大|北林|北中医|北外|北语|中传|央财|贸大|法大|北体|民大|北工商|北联大|首医|首师大|首经贸|北二外|北服|北电|中戏|国戏|北舞|央音|国音|央美|北城|BTBU/i;

const removableWords = /大学|学院|学校|校区|本部|北京|北京市/g;

const localCampusOverrides = [
  {
    pattern: /北京理工大学良乡校区|北理工良乡校区|北理工良乡|北理良乡|良乡校区/,
    universityName: "北京理工大学",
    campus: {
      name: "北京理工大学良乡校区",
      district: "房山区",
      address: "北京市房山区良乡大学城",
      lat: 39.7299,
      lng: 116.1673,
      nearbySubwayStations: ["良乡大学城站"],
      nearbyBusStops: ["良乡大学城公交站"],
      region: "房山",
      source: "local_university_override"
    }
  }
];

export function normalizeUniversityInput(input) {
  return String(input || "")
    .trim()
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\s+/g, "")
    .replace(/威海校区/g, "威海");
}

function coreText(input) {
  return normalizeUniversityInput(input).replace(removableWords, "");
}

export function isUniversityQuery(input) {
  const normalized = normalizeUniversityInput(input);
  return schoolKeywords.test(normalized) || Boolean(findUniversityByAlias(normalized));
}

function similarityScore(inputCore, targetCore) {
  if (!inputCore || !targetCore) return 0;
  if (inputCore === targetCore) return 1;
  if (targetCore.includes(inputCore) || inputCore.includes(targetCore)) return 0.92;
  let common = 0;
  [...new Set(inputCore)].forEach((char) => {
    if (targetCore.includes(char)) common += 1;
  });
  return common / Math.max(inputCore.length, targetCore.length);
}

function allUniversityAliases(university) {
  return [university.name, ...(university.aliases || [])];
}

function allCampusAliases(university, campus) {
  return [
    campus.name,
    `${university.name}${campus.name.replace(university.name, "")}`,
    ...(campus.aliases || [])
  ].filter(Boolean);
}

function makeCampusLocation(university, campus, rawInput, confidence = 0.95) {
  const center = regionCenters[campus.region] || regionCenters[campus.district?.replace("区", "")] || regionCenters.城区;
  const lat = Number.isFinite(campus.lat) ? campus.lat : center?.lat;
  const lng = Number.isFinite(campus.lng) ? campus.lng : center?.lng;
  const nearestSubwayStations = campus.nearbySubwayStations || [];
  const nearestBusStops = campus.nearbyBusStops || [];
  return {
    rawInput,
    name: campus.name,
    universityName: university.name,
    type: "university_campus",
    district: campus.district,
    address: campus.address,
    lat,
    lng,
    coordinateStatus: Number.isFinite(campus.lat) && Number.isFinite(campus.lng) ? "curated" : "region_fallback_pending_amap",
    nearbySubwayStations: nearestSubwayStations,
    nearestSubwayStations,
    startSubwayStation: nearestSubwayStations[0] ? { name: nearestSubwayStations[0] } : undefined,
    nearbyBusStops: nearestBusStops,
    nearestBusStops,
    region: campus.region,
    confidence,
    source: campus.source || university.source || "local_university_database",
    candidates: [],
    needsClarification: false
  };
}

function findLocalCampusOverride(rawInput) {
  const normalized = normalizeUniversityInput(rawInput);
  const override = localCampusOverrides.find((item) => item.pattern.test(normalized));
  if (!override) return null;
  return makeCampusLocation({ name: override.universityName, source: "local_university_override" }, override.campus, rawInput, 0.99);
}

function exactCampusMatch(rawInput) {
  const normalized = normalizeUniversityInput(rawInput);
  for (const university of beijingUniversities) {
    const universityAliases = new Set(allUniversityAliases(university).map((alias) => normalizeUniversityInput(alias)));
    for (const campus of university.campuses || []) {
      const aliases = allCampusAliases(university, campus).filter((alias) => {
        if ((university.campuses || []).length <= 1) return true;
        return !universityAliases.has(normalizeUniversityInput(alias));
      });
      if (aliases.some((alias) => normalizeUniversityInput(alias) === normalized)) {
        return { university, campus, confidence: 0.98 };
      }
    }
  }
  return null;
}

export function findUniversityByAlias(input) {
  const normalized = normalizeUniversityInput(input);
  const campusMatch = exactCampusMatch(normalized);
  if (campusMatch) return campusMatch;

  for (const university of beijingUniversities) {
    if (allUniversityAliases(university).some((alias) => normalizeUniversityInput(alias) === normalized)) {
      return { university, campus: null, confidence: 0.96 };
    }
  }
  return null;
}

export function fuzzyFindUniversity(input) {
  const normalized = normalizeUniversityInput(input);
  const normalizedCore = coreText(normalized);
  if (!normalizedCore) return null;

  const scored = [];
  for (const university of beijingUniversities) {
    const universityScore = Math.max(...allUniversityAliases(university).map((alias) => similarityScore(normalizedCore, coreText(alias))));
    for (const campus of university.campuses || []) {
      const campusScore = Math.max(...allCampusAliases(university, campus).map((alias) => similarityScore(normalizedCore, coreText(alias))));
      scored.push({ university, campus, confidence: Math.max(universityScore, campusScore) });
    }
  }

  scored.sort((a, b) => b.confidence - a.confidence);
  const [first, second] = scored;
  if (!first || first.confidence < 0.78) return null;
  if (first.confidence >= 0.9 && (!second || first.confidence - second.confidence >= 0.08)) return first;
  if (first.confidence >= 0.85) return first;
  return null;
}

function ambiguousCampusResult(university, rawInput, message) {
  return {
    status: "ambiguous",
    universityName: university.name,
    message: message || `我找到了【${university.name}】的多个校区，请选择你的出发校区：`,
    candidates: (university.campuses || []).map((campus) => makeCampusLocation(university, campus, rawInput, 0.92))
  };
}

export async function resolveUniversity(input) {
  const rawInput = String(input || "").trim();
  const normalized = normalizeUniversityInput(rawInput);
  const localOverride = findLocalCampusOverride(rawInput);
  if (localOverride) return { status: "resolved", location: localOverride };
  if (/威海/.test(normalized)) {
    return {
      status: "failed",
      message: "这个校区不在北京，请输入北京本地校区或北京出发地。"
    };
  }

  const exact = findUniversityByAlias(rawInput);
  if (exact?.campus) {
    return { status: "resolved", location: makeCampusLocation(exact.university, exact.campus, rawInput, exact.confidence) };
  }
  if (exact?.university) {
    const campuses = exact.university.campuses || [];
    if (campuses.length === 1) {
      return { status: "resolved", location: makeCampusLocation(exact.university, campuses[0], rawInput, exact.confidence) };
    }
    return ambiguousCampusResult(exact.university, rawInput);
  }

  const fuzzy = fuzzyFindUniversity(rawInput);
  if (!fuzzy) {
    return {
      status: "failed",
      message: "没有识别到这个北京高校，请换成学校全称、简称或具体校区。"
    };
  }
  const campuses = fuzzy.university.campuses || [];
  if (fuzzy.campus && fuzzy.confidence >= 0.9) {
    return { status: "resolved", location: makeCampusLocation(fuzzy.university, fuzzy.campus, rawInput, fuzzy.confidence) };
  }
  if (campuses.length === 1) {
    return { status: "resolved", location: makeCampusLocation(fuzzy.university, campuses[0], rawInput, fuzzy.confidence) };
  }
  return ambiguousCampusResult(fuzzy.university, rawInput);
}
