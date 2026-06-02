import test from "node:test";
import assert from "node:assert/strict";

import { destinationTransitMap } from "./data/destinationTransitMap.js";
import { detectStartInfo } from "./startArea.js";
import { estimateTransitCost } from "./transitEstimate.js";

function estimate(start, destination) {
  return estimateTransitCost(detectStartInfo(start), destinationTransitMap[destination]);
}

test("estimates Wudaokou to Shichahai as a controlled nearby city trip", () => {
  const estimateResult = estimate("五道口", "鼓楼/什刹海");

  assert.equal(estimateResult.startLabel, "识别到「五道口」站");
  assert.equal(estimateResult.oneWayFare, 4);
  assert.equal(estimateResult.roundTripFare, 8);
  assert.equal(estimateResult.trafficPressure, "低");
  assert.ok(estimateResult.arrivalStations.includes("什刹海"));
});

test("estimates Liangxiang University Town to Sanlitun as long-distance cross-district travel", () => {
  const estimateResult = estimate("良乡大学城", "三里屯");

  assert.equal(estimateResult.oneWayFare, 7);
  assert.equal(estimateResult.roundTripFare, 14);
  assert.equal(estimateResult.trafficPressure, "高");
  assert.equal(estimateResult.estimatedTime, "75-120分钟");
});

test("estimates Communication University to Hopson as nearby eastern travel", () => {
  const estimateResult = estimate("中国传媒大学", "合生汇");

  assert.equal(estimateResult.oneWayFare, 4);
  assert.equal(estimateResult.roundTripFare, 8);
  assert.equal(estimateResult.trafficPressure, "低");
});

test("adds access-leg warning for a specific place that is not a station", () => {
  const estimateResult = estimate("学校东门", "798");

  assert.equal(estimateResult.matchedStation, null);
  assert.equal(estimateResult.accessFare, "0-2元");
  assert.equal(estimateResult.accessTime, "5-20分钟");
  assert.match(estimateResult.explanation, /未识别到具体地铁站/);
  assert.match(estimateResult.explanation, /步行、骑车或公交/);
});

test("estimates Shahe Higher Education Park to Olympic Forest as nearby northern travel", () => {
  const estimateResult = estimate("沙河高教园", "奥森公园");

  assert.equal(estimateResult.oneWayFare, 4);
  assert.equal(estimateResult.roundTripFare, 8);
  assert.equal(estimateResult.trafficPressure, "低");
});
