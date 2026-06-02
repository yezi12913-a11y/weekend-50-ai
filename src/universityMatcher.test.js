import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

import { findUniversityByAlias, normalizeUniversityInput } from "./utils/universityMatcher.js";

let appModule;
let locationModule;

async function loadModules() {
  if (appModule && locationModule) return { appModule, locationModule };
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  try {
    appModule = await server.ssrLoadModule("/src/App.jsx");
    locationModule = await server.ssrLoadModule("/src/utils/locationResolver.js");
    return { appModule, locationModule };
  } finally {
    await server.close();
  }
}

function makeForm(start, startLocation = null) {
  return {
    start,
    startLocation,
    budgetType: "自定义预算",
    customBudget: "50",
    time: "半天",
    timeMode: "quick",
    customStartTime: "",
    customEndTime: "",
    activities: ["散步放空", "拍照打卡"],
    destination: "不指定，让 AI 推荐",
    weather: "晴天",
    companion: "双人",
    moods: ["想省钱"],
    transportPreference: "subway_first"
  };
}

test("university normalization and alias lookup cover common Beijing school inputs", () => {
  assert.equal(normalizeUniversityInput(" 北京工商大学 良乡校区 "), "北京工商大学良乡校区");
  assert.equal(findUniversityByAlias("北工商").university.name, "北京工商大学");
  assert.equal(findUniversityByAlias("北京工商大学良乡校区").campus.name, "北京工商大学良乡校区");
});

test("multi-campus universities return campus candidates instead of failed results", async () => {
  const { locationModule: location } = await loadModules();
  const inputs = ["北京工商大学", "北工商", "北京邮电大学", "北邮", "北京师范大学", "北师大", "北京航空航天大学", "北航", "北京理工大学", "北理工", "中央财经大学", "央财"];

  for (const input of inputs) {
    const resolved = await location.resolveStartLocation(input);
    assert.equal(resolved.needsClarification, true, input);
    assert.ok(resolved.candidates.length >= 2, input);
    assert.ok(!resolved.message.includes("没有找到唯一匹配"), input);
    assert.ok(resolved.candidates.every((candidate) => candidate.type === "university_campus"), input);
  }
});

test("specific Beijing campuses resolve directly with district and start subway stations", async () => {
  const { appModule: app, locationModule: location } = await loadModules();
  const inputs = [
    ["北京工商大学良乡校区", "房山区", "良乡大学城站"],
    ["北京工商大学阜成路校区", "海淀区", "花园桥站"],
    ["北京邮电大学西土城校区", "海淀区", "蓟门桥站"],
    ["北京邮电大学沙河校区", "昌平区", "沙河高教园站"],
    ["中央财经大学沙河校区", "昌平区", "沙河高教园站"],
    ["中国政法大学昌平校区", "昌平区", "昌平站"]
  ];

  for (const [input, district, station] of inputs) {
    const resolved = await location.resolveStartLocation(input);
    assert.equal(resolved.type, "university_campus", input);
    assert.equal(resolved.district, district, input);
    assert.ok(resolved.nearestSubwayStations.includes(station), input);

    const routes = await app.generateRecommendations(makeForm(input));
    assert.equal(routes.length, 3, input);
    assert.equal(routes[0].transport.primaryStartStation.type, "subway", input);
    assert.ok(routes[0].transport.primaryStartStation.name.includes(station.replace("站", "")), input);
  }
});

test("single-campus Beijing universities resolve as university campuses", async () => {
  const { locationModule: location } = await loadModules();
  const inputs = [
    "北京大学", "北大", "北京大学东门", "清华大学", "清华", "北京工业大学", "北工大", "中国传媒大学", "中传",
    "首都经济贸易大学", "首经贸", "北京联合大学", "北京信息科技大学", "北京建筑大学", "北京物资学院",
    "北京电影学院", "北电", "中央戏剧学院", "中戏", "中央美术学院", "央美"
  ];

  for (const input of inputs) {
    const resolved = await location.resolveStartLocation(input);
    assert.equal(resolved.type, "university_campus", input);
    assert.ok(resolved.district, input);
    assert.ok(resolved.nearestSubwayStations.length > 0, input);
    assert.ok(!resolved.needsClarification, input);
  }
});
