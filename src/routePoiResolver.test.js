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
  isPublicRestPoi,
  isRetailOnlyPoi,
  filterPublicRestPois,
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

test("high-tier food selection excludes convenience stores and supermarkets", () => {
  const pois = [
    { name: "罗森便利店", type: "购物服务;便利店", estimatedCost: 12 },
    { name: "物美超市", type: "购物服务;超级市场", estimatedCost: 18 },
    { name: "瑞幸咖啡", type: "餐饮服务;咖啡厅", estimatedCost: 28 },
    { name: "蓝色港湾正餐", type: "餐饮服务;中餐厅", estimatedCost: 78 }
  ];

  assert.equal(selectFoodPoiByPlanType(pois, "vibe", 200)?.name, "蓝色港湾正餐");
});

test("high budget food steps search for restaurant-grade POIs instead of convenience stores", () => {
  const route = { destination: "合生汇", userBudget: 200 };
  const keyword = buildPoiKeywordForStep(route, { place: "商场美食区", action: "安排一顿正餐", cost: 110 });

  assert.match(keyword, /正餐|中餐|餐厅/);
  assert.doesNotMatch(keyword, /便利店|超市/);
});

test("low budget drink steps may search convenience or real drink shops", () => {
  const route = { destination: "合生汇", userBudget: 50, foodPoiPlanType: "cheap" };
  const keyword = buildPoiKeywordForStep(route, { place: "饮品", action: "买一杯喝的", cost: 20 });

  assert.match(keyword, /便利店|咖啡|奶茶|饮品|甜品/);
});

test("high budget drink upgrade searches real drink shops instead of convenience stores", () => {
  const route = { destination: "蓝色港湾", userBudget: 200, foodPoiPlanType: "vibe" };
  const keyword = buildPoiKeywordForStep(route, { place: "正餐/咖啡甜品升级", action: "选择更舒服的正餐、咖啡、甜品或轻体验", cost: 120 });

  assert.match(keyword, /正餐|咖啡|甜品|餐厅/);
  assert.doesNotMatch(keyword, /便利店|超市/);
});

test("play and exhibition POIs must not look closed", () => {
  assert.equal(isOpenPoi({ name: "某展馆暂停营业", type: "风景名胜" }), false);
  assert.equal(isOpenPoi({ name: "某美术馆已关闭", type: "科教文化服务;美术馆" }), false);
  assert.equal(isOpenPoi({ name: "UCCA尤伦斯当代艺术中心", type: "科教文化服务;美术馆" }), true);
  assert.equal(isPlayablePoi({ name: "国美电器", type: "购物服务;家电电子卖场" }), false);
  assert.equal(isPlayablePoi({ name: "今日美术馆", type: "科教文化服务;美术馆" }), true);
});

test("walking photo and rest steps require public accessible POIs", () => {
  const pois = [
    { name: "实验小学", type: "科教文化服务;学校", address: "北京市海淀区某路", location: "116.1,39.9" },
    { name: "幸福小区", type: "商务住宅;住宅区", address: "北京市朝阳区某小区", location: "116.1,39.9" },
    { name: "东风社区居委会", type: "政府机构及社会团体;政府机关", address: "北京市朝阳区东风社区", location: "116.1,39.9" },
    { name: "某某村", type: "地名地址信息;普通地名;村庄级地名", address: "北京市房山区某村", location: "116.1,39.9" },
    { name: "蓝色港湾中央广场", type: "风景名胜;公园广场", address: "北京市朝阳区蓝色港湾", location: "116.1,39.9" },
    { name: "798艺术区公共空间", type: "科教文化服务;文化宫", address: "北京市朝阳区酒仙桥路2号", location: "116.1,39.9" },
    { name: "三里屯太古里公共休息区", type: "购物服务;商场", address: "北京市朝阳区三里屯路", location: "116.1,39.9" },
    { name: "亮马河滨水步道", type: "风景名胜;风景名胜相关", address: "北京市朝阳区亮马河", location: "116.1,39.9" }
  ];

  assert.equal(isPublicRestPoi(pois[0]), false);
  assert.equal(isPublicRestPoi(pois[1]), false);
  assert.equal(isPublicRestPoi(pois[2]), false);
  assert.equal(isPublicRestPoi(pois[3]), false);
  assert.deepEqual(filterPublicRestPois(pois).map((poi) => poi.name), [
    "蓝色港湾中央广场",
    "798艺术区公共空间",
    "三里屯太古里公共休息区",
    "亮马河滨水步道"
  ]);
});

test("walking photo and rest step keywords prefer public spaces", () => {
  const route = { destination: "蓝色港湾", userBudget: 80 };
  const keyword = buildPoiKeywordForStep(route, { place: "亮马河方向", action: "短距离散步拍照休息", cost: 0 });

  assert.match(keyword, /公园|广场|街区|公共空间|文化|商场/);
  assert.doesNotMatch(keyword, /小学|幼儿园|小区|社区|村|住宅/);
});
