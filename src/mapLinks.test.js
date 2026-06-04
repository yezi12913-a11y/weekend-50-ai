import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildAmapNavigationUrl, buildCopyableRouteText } from "./utils/mapLinks.js";
import { copyTextToClipboard } from "./utils/clipboard.js";

const sampleRoute = {
  routeName: "合生汇稳妥版",
  planType: "方案 B：最稳妥",
  suitableFor: ["逛街", "吃东西"],
  userBudget: 80,
  estimatedCost: 68,
  budgetStatus: "预算内",
  destination: "合生汇",
  transportCost: 10,
  foodCost: 38,
  activityCost: 0,
  flexibleCost: 20,
  transitEstimate: {
    recommendedMode: "地铁优先",
    estimatedTime: "约 35 分钟",
    roundTripFare: 10,
    trafficPressure: "中",
    explanation: "从出发地到合生汇，优先地铁。"
  },
  steps: [
    {
      place: "南城香",
      action: "安排一顿简餐",
      cost: 38,
      tip: "餐饮和活动平衡。",
      lat: 39.8936,
      lng: 116.4898
    }
  ],
  savingTip: "先定餐饮上限。",
  riskTip: "周末饭点人多。"
};

test("Amap navigation URL includes text start when user entered a start place", () => {
  const url = buildAmapNavigationUrl(sampleRoute.steps[0], { start: "北京邮电大学西土城校区" });
  const decoded = decodeURIComponent(url);

  assert.match(decoded, /from=/);
  assert.match(decoded, /北京邮电大学西土城校区/);
  assert.match(decoded, /to=116\.4898,39\.8936,南城香/);
  assert.match(decoded, /mode=bus/);
});

test("Amap navigation URL includes Wudaokou as start and does not fall back to current location", () => {
  const url = buildAmapNavigationUrl(sampleRoute.steps[0], { start: "五道口" });
  const decoded = decodeURIComponent(url);

  assert.match(decoded, /from=/);
  assert.match(decoded, /五道口/);
  assert.doesNotMatch(decoded, /mylocation|当前位置|我的位置/);
});

test("copyable route text includes route essentials and navigation links with start", () => {
  const text = buildCopyableRouteText(sampleRoute, { start: "五道口" });

  assert.match(text, /合生汇稳妥版/);
  assert.match(text, /适合人群：逛街 \/ 吃东西/);
  assert.match(text, /用户预算：80元/);
  assert.match(text, /出发地：五道口/);
  assert.match(text, /目的地：合生汇/);
  assert.match(text, /1\. 南城香/);
  assert.match(text, /交通方式\/估算：地铁优先/);
  assert.match(text, /预算明细：交通 10元，餐饮\/饮品 38元，活动 0元，机动 20元/);
  assert.match(text, /from=.*五道口/);
});

test("route card source exposes a copy route button", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");
  const clipboardSource = await readFile(new URL("./utils/clipboard.js", import.meta.url), "utf8");

  assert.match(source, /复制方案|复制路线/);
  assert.match(source, /copyTextToClipboard/);
  assert.match(clipboardSource, /navigator.*clipboard.*writeText/s);
  assert.match(source, /已复制，可发送给朋友|路线已复制/);
});

test("copy helper falls back when Clipboard API rejects", async () => {
  const calls = [];
  const textarea = {
    value: "",
    style: {},
    setAttribute(name, value) {
      this[name] = value;
    },
    select() {
      calls.push(["select", this.value]);
    }
  };
  const env = {
    navigator: {
      clipboard: {
        writeText: async () => {
          throw new Error("permission denied");
        }
      }
    },
    document: {
      body: {
        appendChild(node) {
          calls.push(["append", node.value]);
        },
        removeChild(node) {
          calls.push(["remove", node.value]);
        }
      },
      createElement(tag) {
        assert.equal(tag, "textarea");
        return textarea;
      },
      execCommand(command) {
        calls.push(["exec", command]);
        return true;
      }
    }
  };

  assert.equal(await copyTextToClipboard("完整方案文本", env), true);
  assert.deepEqual(calls.map((call) => call[0]), ["append", "select", "exec", "remove"]);
});
