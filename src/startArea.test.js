import test from "node:test";
import assert from "node:assert/strict";

import { beijingSubwayStations } from "./data/beijingSubwayStations.js";
import { detectStartArea, detectStartLocation } from "./startArea.js";

test("subway station library covers common Beijing lines beyond campus stations", () => {
  const stationNames = new Set(beijingSubwayStations.map((station) => station.name));

  ["苹果园", "西单", "北京南站", "宋家庄", "牛街", "森林公园南门", "国贸", "望京南", "良乡大学城北", "大兴机场", "香山"].forEach((station) => {
    assert.equal(stationNames.has(station), true, `${station} should be in subway station library`);
  });
});

test("detects exact station names, aliases, line-prefixed input, and nearby input", () => {
  const cases = [
    ["五道口", "五道口", "13号线"],
    ["五道口站", "五道口", "13号线"],
    ["五道口附近", "五道口", "13号线"],
    ["13号线五道口", "五道口", "13号线"],
    ["北京大学东门", "北京大学东门", "4号线/大兴线"],
    ["北京大学东门站", "北京大学东门", "4号线/大兴线"],
    ["4号线魏公村", "魏公村", "4号线/大兴线"],
    ["良乡大学城北", "良乡大学城北", "房山线"],
    ["中国传媒大学", "传媒大学", "1号线/八通线"],
    ["10号线国贸", "国贸", "1号线/八通线"],
    ["九龙山地铁站附近", "九龙山", "7号线"],
    ["森林公园南门", "森林公园南门", "8号线"]
  ];

  cases.forEach(([input, stationName, line]) => {
    const result = detectStartLocation(input);
    assert.equal(result.matchedStation, stationName, input);
    assert.ok(result.lines.includes(line), input);
    assert.equal(result.confidence, "station");
  });
});

test("keeps long station names preferred over shorter partial matches", () => {
  assert.equal(detectStartLocation("良乡大学城北").matchedStation, "良乡大学城北");
  assert.equal(detectStartLocation("北京大学东门站").matchedStation, "北京大学东门");
});

test("falls back to area keywords without blocking ordinary place text", () => {
  assert.equal(detectStartArea("学校东门"), "通用区域");
  assert.equal(detectStartLocation("学校东门").confidence, "unknown");
  assert.equal(detectStartLocation("宿舍楼").isSpecificPlace, true);
  assert.equal(detectStartLocation("某某校区").confidence, "unknown");
  assert.equal(detectStartLocation("三里屯").area, "朝阳/东部区域");
  assert.equal(detectStartLocation("首钢园").area, "石景山区域");
});

test("debug label explains station, area fallback, and full fallback states", () => {
  assert.equal(detectStartLocation("五道口").debugText, "已识别：五道口｜13号线｜海淀高校区｜交通便利度：高");
  assert.equal(detectStartLocation("三里屯").debugText, "未识别到具体地铁站，已按关键词估算为：朝阳/东部区域");
  assert.equal(detectStartLocation("学校东门").debugText, "未识别到具体地铁站，将按通用位置粗略估算");
});

test("covers requested manual verification inputs with station or reasonable fallback", () => {
  const stationInputs = [
    "五道口", "五道口站", "五道口附近", "13号线五道口", "北京大学东门", "魏公村", "良乡大学城", "良乡大学城北", "沙河高教园", "传媒大学", "中国传媒大学", "国贸", "团结湖", "亮马桥", "青年路", "九龙山", "将台", "望京南", "金安桥", "牛街", "广安门内", "平安里", "北京站", "北京南站", "北京西站", "西单", "什刹海", "南锣鼓巷", "奥林匹克公园", "森林公园南门"
  ];

  stationInputs.forEach((input) => {
    const result = detectStartLocation(input);
    assert.equal(result.confidence, "station", input);
    assert.ok(result.matchedStation, input);
    assert.ok(result.lines.length > 0, input);
  });

  [
    ["三里屯", "朝阳/东部区域"],
    ["朝阳大悦城", "朝阳/东部区域"],
    ["合生汇", "朝阳/东部区域"],
    ["798", "朝阳/东部区域"],
    ["首钢园", "石景山区域"],
    ["护国寺", "城区交通便利区域"]
  ].forEach(([input, area]) => {
    const result = detectStartLocation(input);
    assert.equal(result.matchedStation, null, input);
    assert.equal(result.area, area, input);
    assert.equal(result.confidence, "area", input);
  });

  ["学校东门", "宿舍楼", "某某校区"].forEach((input) => {
    const result = detectStartLocation(input);
    assert.equal(result.confidence, "unknown", input);
    assert.equal(result.isSpecificPlace, true, input);
  });
});
