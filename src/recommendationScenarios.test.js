import test from "node:test";
import assert from "node:assert/strict";

import { createServer } from "vite";

let appModule;

async function loadAppModule() {
  if (appModule) return appModule;
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  try {
    appModule = await server.ssrLoadModule("/src/App.jsx");
    return appModule;
  } finally {
    await server.close();
  }
}

function makeForm(overrides) {
  return {
    start: "五道口",
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
    moods: ["想省钱", "想聊天"],
    ...overrides
  };
}

test("budget tiers classify the requested ranges", async () => {
  const { getBudgetTier } = await loadAppModule();
  assert.equal(getBudgetTier(30).label, "极低预算");
  assert.equal(getBudgetTier(50).label, "低预算");
  assert.equal(getBudgetTier(100).label, "普通预算");
  assert.equal(getBudgetTier(150).label, "舒适预算");
  assert.equal(getBudgetTier(220).label, "高预算");
});

test("50 yuan Wudaokou scenario produces low-cost differentiated plans", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({ customBudget: "50" }));
  const destinations = new Set(routes.map((route) => route.destination));

  assert.equal(routes.length, 3);
  assert.ok(destinations.size >= 3);
  assert.ok(routes[0].estimatedCost >= 25 && routes[0].estimatedCost <= 45);
  assert.ok(routes[1].estimatedCost >= 35 && routes[1].estimatedCost <= 58);
  assert.ok(routes[2].estimatedCost >= 45 && routes[2].estimatedCost <= 68);
  assert.ok(routes.some((route) => ["胡同散步", "自然放空", "安静散步", "河边夜游"].includes(route.category)));
});

test("200 yuan photo ritual scenario includes visible upgraded spending", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "200",
    moods: ["想有一点仪式感", "想拍照"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(routes[0].estimatedCost >= 80);
  assert.ok(routes[1].estimatedCost >= 130);
  assert.ok(routes[2].estimatedCost >= 160);
  assert.ok(routes.some((route) => route.upgradeCost >= 30));
  assert.ok(routes.some((route) => /咖啡|甜品|展|电影|正餐|文创|体验/.test(route.budgetExplanation)));
});

test("Liangxiang rainy short group scenario avoids long-distance east-side defaults", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    start: "良乡大学城",
    customBudget: "50",
    time: "只想出去 2-3 小时",
    activities: ["逛街", "吃东西"],
    weather: "雨天",
    companion: "多人",
    moods: ["想找室内地方", "想和朋友热闹一点"]
  }));

  assert.equal(routes.length, 3);
  assert.notEqual(routes[0].destination, "三里屯");
  assert.notEqual(routes[0].destination, "798");
  assert.ok(routes[0].trafficPressure !== "高");
  assert.ok(routes.some((route) => route.weatherFit.includes("雨天")));
});

test("300 yuan full-day group scenario creates a clear upgrade plan", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    start: "学校东门",
    customBudget: "300",
    time: "一天",
    activities: ["看展", "拍照打卡", "吃东西"],
    companion: "多人",
    moods: ["想有一点仪式感"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(routes[0].estimatedCost >= 120);
  assert.ok(routes[1].estimatedCost >= 190);
  assert.ok(routes[2].estimatedCost >= 240);
  assert.ok(routes[2].upgradeCost >= 45);
  assert.ok(routes[2].steps.length >= routes[0].steps.length);
});
