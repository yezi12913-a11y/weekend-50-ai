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

function routeText(route) {
  return [
    route.routeName,
    route.destination,
    route.category,
    route.description,
    route.weatherFit?.join(" "),
    route.suitableFor?.join(" "),
    route.preferenceTags?.join(" "),
    route.aiNote,
    route.budgetExplanation,
    route.badWeatherAlternative,
    ...(route.steps || []).flatMap((step) => [step.place, step.action, step.tip])
  ].filter(Boolean).join(" ");
}

function isPureOutdoorRoute(route) {
  const text = routeText(route);
  return /奥森公园|玉渊潭|紫竹院|什刹海纯散步|亮马河纯散步|长时间户外|公园长时间/.test(text)
    && !/室内|商场|书店|图书馆|咖啡|展馆|美术馆|电影院|公共区|雨天不建议长时间户外/.test(text);
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
  assert.ok(routes[0].estimatedCost >= 35 && routes[0].estimatedCost <= 45);
  assert.ok(routes[1].estimatedCost >= 45 && routes[1].estimatedCost <= 55);
  assert.ok(routes[2].estimatedCost >= 55 && routes[2].estimatedCost <= 70);
  assert.ok(routes.some((route) => ["胡同散步", "自然放空", "安静散步", "河边夜游"].includes(route.category)));
});

test("100 yuan budget uses the normal-budget range instead of returning three low-cost plans", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "100",
    moods: ["想拍照", "想有一点仪式感"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(!routes.every((route) => route.estimatedCost < 70));
  assert.ok(routes[1].estimatedCost >= 90 || routes[2].estimatedCost >= 90);
});

test("200 yuan photo ritual scenario includes visible upgraded spending", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "200",
    moods: ["想有一点仪式感", "想拍照"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(!routes.every((route) => route.estimatedCost < 100));
  assert.ok(routes[0].estimatedCost >= 140);
  assert.ok(routes[1].estimatedCost >= 170);
  assert.ok(routes[2].estimatedCost >= 200);
  assert.ok(routes.some((route) => route.upgradeCost >= 30));
  assert.ok(routes.some((route) => /咖啡|甜品|展|电影|正餐|文创|体验/.test(route.budgetExplanation)));
});

test("rainy group shopping and food scenario prefers indoor mall or food routes and excludes pure outdoor parks", async () => {
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
  routes.forEach((route) => {
    assert.equal(isPureOutdoorRoute(route), false, route.routeName);
    assert.ok(/合生汇|大悦城|荟聚|商场|美食|牛街|护国寺|室内|咖啡|展馆/.test(routeText(route)), route.routeName);
  });
});

test("rainy indoor need excludes long pure outdoor park routes", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "80",
    activities: ["雨天室内"],
    weather: "雨天",
    moods: ["想找室内地方"]
  }));

  assert.equal(routes.length, 3);
  routes.forEach((route) => {
    assert.equal(isPureOutdoorRoute(route), false, route.routeName);
    assert.ok(!/奥森公园|紫竹院|玉渊潭/.test(route.destination), route.routeName);
  });
});

test("group lively need excludes library, quiet study, and solo routes", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "80",
    activities: ["朋友社交", "吃东西"],
    companion: "多人",
    moods: ["想和朋友热闹一点"]
  }));

  assert.equal(routes.length, 3);
  routes.forEach((route) => {
    assert.ok(!/图书馆|安静学习|一个人独处/.test(routeText(route)), route.routeName);
    assert.ok(/合生汇|三里屯|大悦城|牛街|护国寺|蓝色港湾|商场|美食|亮马河/.test(routeText(route)), route.routeName);
  });
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

test("specific destinations keep all three plans within the selected destination group", async () => {
  const { generateRecommendations, isRouteRelatedToDestination } = await loadAppModule();
  const destinations = ["合生汇", "三里屯", "798"];

  destinations.forEach((destination) => {
    const routes = generateRecommendations(makeForm({ destination }));

    assert.equal(routes.length, 3, destination);
    routes.forEach((route) => {
      assert.ok(
        isRouteRelatedToDestination(route, destination),
        `${destination} should not recommend unrelated route ${route.destination}`
      );
    });
  });
});

test("unspecified destination can still recommend different destinations", async () => {
  const { generateRecommendations, isSpecificDestination } = await loadAppModule();
  const routes = generateRecommendations(makeForm({ destination: "不指定，让 AI 推荐" }));
  const destinations = new Set(routes.map((route) => route.destination));

  assert.equal(isSpecificDestination("不指定，让 AI 推荐"), false);
  assert.equal(routes.length, 3);
  assert.ok(destinations.size >= 3);
});

test("unspecified AI recommendation still obeys rainy group lively constraints", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "100",
    activities: ["逛街", "吃东西"],
    destination: "不指定，让 AI 推荐",
    weather: "雨天",
    companion: "多人",
    moods: ["想和朋友热闹一点", "想吃点好的"]
  }));

  assert.equal(routes.length, 3);
  routes.forEach((route) => {
    assert.equal(isPureOutdoorRoute(route), false, route.routeName);
    assert.ok(route.estimatedCost >= 70 || route.planType.includes("方案 A"), route.routeName);
    assert.ok(!/图书馆|安静学习|一个人独处/.test(routeText(route)), route.routeName);
  });
});

test("strict mixed constraints still return three recommendation plans", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    start: "北京工商大学良乡校区",
    customBudget: "200",
    time: "只想出去 2-3 小时",
    activities: ["雨天室内", "逛街", "吃东西", "安静学习"],
    destination: "不指定，让 AI 推荐",
    weather: "雨天",
    companion: "多人",
    moods: ["想找室内地方", "想和朋友热闹一点", "想吃点好的"]
  }));

  assert.equal(routes.length, 3);
});

test("higher food budget rises with a 200 yuan eating request", async () => {
  const { generateRecommendations } = await loadAppModule();
  const routes = generateRecommendations(makeForm({
    customBudget: "200",
    activities: ["吃东西", "逛街"],
    companion: "多人",
    moods: ["想吃点好的"]
  }));

  assert.equal(routes.length, 3);
  assert.ok(routes[0].foodCost >= 65);
  assert.ok(routes[1].foodCost >= 85);
  assert.ok(routes[2].foodCost >= 100);
  routes.forEach((route) => {
    const eatingSteps = route.steps.filter((step) => /餐|吃|小吃|正餐|简餐/.test(`${step.place}${step.action}`));
    eatingSteps.forEach((step) => {
      assert.doesNotMatch(`${step.place}${step.action}${step.tip}`, /便利店|超市|自带水/, route.routeName);
    });
  });
});
