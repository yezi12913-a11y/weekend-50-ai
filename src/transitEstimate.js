const nearbyZones = new Map([
  ["northwest", ["city-center", "west-central", "west-north", "north", "north-far"]],
  ["city-center", ["east-central", "west-central", "southwest-central", "west-north"]],
  ["east-central", ["city-center", "east", "northeast"]],
  ["east", ["east-central", "northeast"]],
  ["northeast", ["east", "east-central", "north"]],
  ["west-north", ["city-center", "west-central", "north"]],
  ["west-central", ["city-center", "west-north", "west", "southwest-central"]],
  ["west", ["west-central", "city-center"]],
  ["north", ["west-north", "northeast", "north-far"]],
  ["north-far", ["north", "west-north"]],
  ["southwest-far", ["southwest-central", "south", "city-center"]],
  ["southwest-central", ["city-center", "west-central", "southwest-far"]],
  ["south", ["city-center", "southwest-far"]],
  ["east-far", ["east", "east-central"]],
  ["campus-nearby", ["west-north", "north-far", "southwest-far"]]
]);

const farZonePairs = new Set([
  "southwest-far->east-central",
  "southwest-far->east",
  "southwest-far->northeast",
  "north-far->south",
  "north-far->southwest-far",
  "north-far->east-far",
  "east-far->west",
  "east-far->southwest-far",
  "east-far->north-far",
  "west->east",
  "west->east-far",
  "west->northeast",
  "west->southwest-far"
]);

function subwayFareByDistanceKm(km) {
  // 北京地铁粗估分段票价：6公里内3元；6-12公里4元；12-22公里5元；
  // 22-32公里6元；32公里以上每增加20公里加1元。本项目不接地图API，
  // 只把距离等级映射到一个合理的估算里程。
  if (km <= 6) return 3;
  if (km <= 12) return 4;
  if (km <= 22) return 5;
  if (km <= 32) return 6;
  return 6 + Math.ceil((km - 32) / 20);
}

function classifyDistance(startZone, destinationZone) {
  if (!startZone || startZone === "unknown") {
    return { level: "12-22公里", km: 16, pressure: "中", time: "45-75分钟" };
  }
  if (startZone === destinationZone) {
    return { level: "6-12公里", km: 10, pressure: "低", time: "25-50分钟" };
  }
  if (nearbyZones.get(startZone)?.includes(destinationZone)) {
    return { level: "6-12公里", km: 12, pressure: "低", time: "25-50分钟" };
  }
  if (farZonePairs.has(`${startZone}->${destinationZone}`)) {
    return { level: "32公里以上", km: 52, pressure: "高", time: "75-120分钟" };
  }
  return { level: "12-22公里", km: 20, pressure: "中", time: "45-75分钟" };
}

function recommendedMode(startInfo, destinationInfo) {
  if (startInfo.matchedStation && destinationInfo.nearbyStations?.length) return "地铁为主";
  if (startInfo.isSpecificPlace) return "步行骑行接驳 + 地铁";
  if (!startInfo.matchedStation) return "公交 + 地铁";
  return "地铁 + 步行";
}

export function estimateTransitCost(startInfo, destinationInfo) {
  const distance = classifyDistance(startInfo.transitZone, destinationInfo.transitZone);
  const oneWayFare = subwayFareByDistanceKm(distance.km);
  const needsAccess = !startInfo.matchedStation || startInfo.isSpecificPlace;
  const accessNotice = needsAccess
    ? "未识别到具体地铁站，交通费用按区域粗估，可能有偏差。可能需要先步行、骑车或公交到最近地铁/公交站，交通时间和费用会有一定浮动。"
    : "";

  return {
    matchedStation: startInfo.matchedStation,
    startArea: startInfo.area,
    startTransitZone: startInfo.transitZone,
    destinationArea: destinationInfo.area,
    destinationTransitZone: destinationInfo.transitZone,
    arrivalStations: destinationInfo.nearbyStations || [],
    recommendedMode: recommendedMode(startInfo, destinationInfo),
    oneWayFare,
    roundTripFare: oneWayFare * 2,
    estimatedDistanceLevel: distance.level,
    estimatedTime: distance.time,
    trafficPressure: distance.pressure,
    accessFare: needsAccess ? "0-2元" : "0元",
    accessTime: needsAccess ? "5-20分钟" : "0-10分钟",
    startLabel: startInfo.matchedStation ? `识别到「${startInfo.matchedStation}」站` : "未识别到具体地铁站",
    explanation: [
      "这是根据出发地和目的地附近站点做的粗略估算，实际以地图导航为准。",
      accessNotice
    ].filter(Boolean).join("")
  };
}
