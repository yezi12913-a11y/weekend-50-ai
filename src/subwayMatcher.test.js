import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

import { findSubwayStationByAlias, normalizeStationInput } from "./utils/subwayMatcher.js";

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

function makeForm(start) {
  return {
    start,
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

test("station normalization accepts common subway input forms", () => {
  assert.equal(normalizeStationInput(" 北京青年路地铁站 "), "青年路");
  assert.equal(normalizeStationInput("十里堡站"), "十里堡");
  assert.equal(findSubwayStationByAlias("青年路地铁站").name, "青年路站");
});

test("broad Beijing subway station inputs resolve and stay as primary subway starts", async () => {
  const { appModule: app, locationModule: location } = await loadModules();
  const inputs = [
    "十里堡站", "五道口站", "西土城站", "蓟门桥站", "海淀黄庄站", "北京大学东门站", "圆明园站",
    "南锣鼓巷站", "前门站", "王府井站", "天坛东门站", "亮马桥站", "望京南站", "通州北关站",
    "青年路站", "金台路站", "呼家楼站", "国贸站", "双井站", "大望路站", "朝阳门站", "东直门站",
    "雍和宫站", "西直门站", "知春路站", "苏州街站", "牡丹园站", "安贞门站", "北土城站",
    "奥林匹克公园站", "平安里站", "菜市口站", "宋家庄站", "亦庄桥站", "良乡大学城站",
    "沙河站", "回龙观站", "天通苑站", "青年路", "青年路地铁站", "北京青年路地铁站"
  ];

  for (const input of inputs) {
    const resolved = await location.resolveStartLocation(input);
    assert.equal(resolved.type, "subway_station", input);
    assert.ok(resolved.subwayLines.length > 0, input);

    const routes = await app.generateRecommendations(makeForm(input));
    assert.equal(routes.length, 3, input);
    const primary = routes[0].transport.primaryStartStation;
    assert.equal(primary.name, resolved.name, input);
    assert.equal(primary.type, "subway", input);
    assert.ok(!primary.name.includes("公交"), input);
  }
});
