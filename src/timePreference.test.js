import test from "node:test";
import assert from "node:assert/strict";

import { formatTimePreference, isRouteTimeFit } from "./timePreference.js";

test("keeps original quick time logic when custom time is not selected", () => {
  assert.equal(isRouteTimeFit({ timeNeeded: "晚上" }, { timeMode: "quick", time: "半天" }), true);
  assert.equal(isRouteTimeFit({ timeNeeded: "晚上" }, { timeMode: "quick", time: "晚上" }), true);
  assert.equal(isRouteTimeFit({ timeNeeded: "只想出去 2-3 小时" }, { timeMode: "quick", time: "晚上" }), false);
});

test("matches route time from a custom time range", () => {
  assert.equal(isRouteTimeFit({ timeNeeded: "晚上" }, { timeMode: "custom", customStartTime: "18:30", customEndTime: "21:00" }), true);
  assert.equal(isRouteTimeFit({ timeNeeded: "只想出去 2-3 小时" }, { timeMode: "custom", customStartTime: "14:00", customEndTime: "16:00" }), true);
  assert.equal(isRouteTimeFit({ timeNeeded: "晚上" }, { timeMode: "custom", customStartTime: "10:00", customEndTime: "13:00" }), false);
});

test("formats custom and quick time labels", () => {
  assert.equal(formatTimePreference({ timeMode: "quick", time: "半天" }), "半天");
  assert.equal(formatTimePreference({ timeMode: "custom", customStartTime: "18:30", customEndTime: "21:00" }), "18:30-21:00");
});
