import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPoiKeywordForStep,
  filterDrinkPois,
  filterFoodPois,
  getFoodTierByBudget,
  isDiningPoi,
  isDrinkPoi,
  isFoodPoi,
  isOpenPoi,
  isPlayablePoi,
  isRetailOnlyPoi,
  selectFoodPoiByPlanType
} from "./utils/routePoiResolver.js";

test("rejects non dining POIs when resolving food steps", () => {
  assert.equal(isDiningPoi({ name: "国美电器", type: "购物服务;家电电子卖场" }), false);
  assert.equal(isDiningPoi({ name: "Apple Store", type: "购物服务;专卖店" }), false);
  assert.equal(isFoodPoi({ name: "Giant", type: "购物服务;体育用品店" }), false);
  assert.equal(isFoodPoi({ name: "优衣库", type: "购物服务;服装鞋帽皮具店" }), false);
  assert.equal(isFoodPoi({ name: "Nike", type: "购物服务;体育用品店" }), false);
  assert.equal(isFoodPoi({ name: "书店", type: "购物服务;专卖店" }), false);
  assert.equal(isDiningPoi({ name: "麦当劳", type: "餐饮服务;快餐厅" }), true);
  assert.equal(isDiningPoi({ name: "南京大牌档", type: "餐饮服务;中餐厅" }), true);
  assert.equal(isFoodPoi({ name: "南城香", type: "餐饮服务;中餐厅" }), true);
  assert.equal(isFoodPoi({ name: "便利蜂熟食区", type: "购物服务;便利店" }), true);
});

test("food POI filters keep only dining or convenience hot-food places", () => {
  const pois = [
    { name: "Giant", type: "购物服务;体育用品店", location: "116.1,39.9" },
    { name: "Apple Store", type: "购物服务;专卖店", location: "116.1,39.9" },
    { name: "和府捞面", type: "餐饮服务;中餐厅", location: "116.1,39.9" },
    { name: "7-11熟食区", type: "购物服务;便利店", location: "116.1,39.9" }
  ];

  assert.deepEqual(filterFoodPois(pois).map((poi) => poi.name), ["和府捞面", "7-11熟食区"]);
});

test("drink POI filters keep only supply and drink places", () => {
  const pois = [
    { name: "ZARA", type: "购物服务;服装鞋帽皮具店", location: "116.1,39.9" },
    { name: "奥森公园", type: "风景名胜;公园广场", location: "116.1,39.9" },
    { name: "瑞幸咖啡", type: "餐饮服务;咖啡厅", location: "116.1,39.9" },
    { name: "罗森便利店", type: "购物服务;便利店", location: "116.1,39.9" }
  ];

  assert.deepEqual(filterDrinkPois(pois).map((poi) => poi.name), ["瑞幸咖啡", "罗森便利店"]);
  assert.equal(isDrinkPoi({ name: "霸王茶姬", type: "餐饮服务;饮品店" }), true);
  assert.equal(isRetailOnlyPoi({ name: "Nike", type: "购物服务;体育用品店" }), true);
});

test("food POI selection respects plan tier and avoids duplicates", () => {
  const pois = [
    { name: "便利蜂熟食区", type: "购物服务;便利店", estimatedCost: 12 },
    { name: "麦当劳", type: "餐饮服务;快餐厅", estimatedCost: 24 },
    { name: "南城香", type: "餐饮服务;中餐厅", estimatedCost: 38 },
    { name: "舒适正餐", type: "餐饮服务;中餐厅", estimatedCost: 68 }
  ];
  const selected = new Set(["便利蜂熟食区"]);

  assert.equal(getFoodTierByBudget(50, "cheap"), "low");
  assert.equal(getFoodTierByBudget(80, "steady"), "mid");
  assert.equal(getFoodTierByBudget(200, "vibe"), "high");
  assert.equal(selectFoodPoiByPlanType(pois, "cheap", 50)?.name, "便利蜂熟食区");
  assert.notEqual(selectFoodPoiByPlanType(pois, "steady", 80, selected)?.name, "便利蜂熟食区");
  assert.equal(selectFoodPoiByPlanType(pois, "vibe", 200, new Set(["便利蜂熟食区", "麦当劳", "南城香"]))?.name, "舒适正餐");
});

test("high budget food steps search for restaurant-grade POIs instead of convenience stores", () => {
  const route = { destination: "合生汇", userBudget: 200 };
  const keyword = buildPoiKeywordForStep(route, { place: "商场美食区", action: "安排一顿正餐", cost: 110 });

  assert.match(keyword, /正餐|中餐|餐厅/);
  assert.doesNotMatch(keyword, /便利店|超市/);
});

test("drink steps may search convenience or real drink shops", () => {
  const route = { destination: "合生汇", userBudget: 200 };
  const keyword = buildPoiKeywordForStep(route, { place: "饮品", action: "买一杯喝的", cost: 20 });

  assert.match(keyword, /便利店|咖啡|奶茶|饮品|甜品/);
});

test("play and exhibition POIs must not look closed", () => {
  assert.equal(isOpenPoi({ name: "某展馆暂停营业", type: "风景名胜" }), false);
  assert.equal(isOpenPoi({ name: "某美术馆已关闭", type: "科教文化服务;美术馆" }), false);
  assert.equal(isOpenPoi({ name: "UCCA尤伦斯当代艺术中心", type: "科教文化服务;美术馆" }), true);
  assert.equal(isPlayablePoi({ name: "国美电器", type: "购物服务;家电电子卖场" }), false);
  assert.equal(isPlayablePoi({ name: "今日美术馆", type: "科教文化服务;美术馆" }), true);
});
