import test from "node:test";
import assert from "node:assert/strict";

import { buildPoiKeywordForStep, isDiningPoi, isOpenPoi, isPlayablePoi } from "./utils/routePoiResolver.js";

test("rejects non dining POIs when resolving food steps", () => {
  assert.equal(isDiningPoi({ name: "国美电器", type: "购物服务;家电电子卖场" }), false);
  assert.equal(isDiningPoi({ name: "Apple Store", type: "购物服务;专卖店" }), false);
  assert.equal(isDiningPoi({ name: "麦当劳", type: "餐饮服务;快餐厅" }), true);
  assert.equal(isDiningPoi({ name: "南京大牌档", type: "餐饮服务;中餐厅" }), true);
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
