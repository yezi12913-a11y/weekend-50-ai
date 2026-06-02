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

function sumStepCosts(route) {
  return route.steps.reduce((sum, step) => sum + Number(step.cost || 0), 0);
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
  const routes = await generateRecommendations(makeForm({ customBudget: "50" }));
  const destinations = new Set(routes.map((route) => route.destination));

  assert.equal(routes.length, 3);
  assert.ok(destinations.size >= 3);
  assert.ok(routes.every((route) => route.estimatedCost === sumStepCosts(route)));
  assert.ok(routes.every((route) => route.estimatedCost <= 45));
  assert.ok(routes.every((route) => route.transportCost >= 4 && route.transportCost <= 12));
  assert.ok(routes.some((route) => ["圆明园", "颐和园", "紫竹院", "奥森公园"].includes(route.destination)));
  assert.ok(routes[0].personalizedReason.includes("五道口"));
});

test("200 yuan photo ritual scenario keeps budget accurate while allowing optional upgrades", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = await generateRecommendations(makeForm({
    customBudget: "200",
    moods: ["想有一点仪式感", "想拍照"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(routes.every((route) => route.estimatedCost === sumStepCosts(route)));
  assert.ok(routes.every((route) => route.estimatedCost <= 200));
  assert.ok(routes.some((route) => route.otherCost >= 30 || route.upgradeCost >= 30));
  assert.ok(routes.some((route) => /咖啡|甜品|展|电影|正餐|文创|体验/.test(route.budgetExplanation)));
});

test("Liangxiang rainy short group scenario avoids long-distance east-side defaults", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = await generateRecommendations(makeForm({
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

test("different start locations prioritize different nearby destinations", async () => {
  const { generateRecommendations } = await loadAppModule();
  const wudaokou = await generateRecommendations(makeForm({ start: "五道口", customBudget: "50" }));
  const qianmen = await generateRecommendations(makeForm({ start: "前门", customBudget: "50" }));
  const chaoyang = await generateRecommendations(makeForm({ start: "三里屯", customBudget: "50" }));
  const tongzhou = await generateRecommendations(makeForm({ start: "通州北苑", customBudget: "50" }));

  assert.ok(wudaokou.some((route) => ["圆明园", "颐和园", "紫竹院"].includes(route.destination)));
  assert.ok(qianmen.some((route) => ["前门", "鼓楼/什刹海", "护国寺"].includes(route.destination)));
  assert.ok(chaoyang.some((route) => ["朝阳公园", "亮马河", "蓝色港湾", "三里屯"].includes(route.destination)));
  assert.ok(tongzhou.some((route) => route.destination === "通州运河"));
  assert.notDeepEqual(wudaokou.map((route) => route.destination), tongzhou.map((route) => route.destination));
});

test("300 yuan full-day group scenario keeps upgrades explicit and budget-derived", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = await generateRecommendations(makeForm({
    start: "学校东门",
    customBudget: "300",
    time: "一天",
    activities: ["看展", "拍照打卡", "吃东西"],
    companion: "多人",
    moods: ["想有一点仪式感"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(routes.every((route) => route.estimatedCost === sumStepCosts(route)));
  assert.ok(routes.every((route) => route.estimatedCost <= 300));
  assert.ok(routes.some((route) => route.otherCost >= 45 || route.upgradeCost >= 45));
  assert.ok(routes[2].steps.length >= routes[0].steps.length);
});
