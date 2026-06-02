import test from "node:test";
import assert from "node:assert/strict";

import { aiActivityOption, getEffectiveActivities, toggleActivity } from "./activityPreference.js";

test("toggles multiple manual activity interests", () => {
  assert.deepEqual(toggleActivity(["散步放空"], "看展"), ["散步放空", "看展"]);
  assert.deepEqual(toggleActivity(["散步放空", "看展"], "散步放空"), ["看展"]);
});

test("ai option recommends activities from trip context", () => {
  const activities = getEffectiveActivities({
    activities: [aiActivityOption],
    startArea: "朝阳/东部区域",
    budget: 50,
    weather: "雨天",
    time: "晚上",
    companion: "多人",
    moods: ["想聊天"]
  });

  assert.ok(activities.includes("雨天室内"));
  assert.ok(activities.includes("朋友社交"));
  assert.ok(activities.length >= 3);
});

test("ai option derives activities from multiple selected moods", () => {
  const activities = getEffectiveActivities({
    activities: [aiActivityOption],
    startArea: "城区交通便利区域",
    budget: 80,
    weather: "晴天",
    time: "半天",
    companion: "双人",
    moods: ["想拍照", "想吃点好的", "想学习"]
  });

  assert.ok(activities.includes("拍照打卡"));
  assert.ok(activities.includes("吃东西"));
  assert.ok(activities.includes("安静学习"));
});
