import test from "node:test";
import assert from "node:assert/strict";

import { keepUnspecifiedDestinationLast } from "./destinationOptions.js";

test("keeps unspecified AI recommendation option at the end after merging multi-select destinations", () => {
  assert.deepEqual(
    keepUnspecifiedDestinationLast(["不指定，让 AI 推荐", "合生汇", "西单", "合生汇", "不指定，让 AI 推荐", "798"]),
    ["合生汇", "西单", "798", "不指定，让 AI 推荐"]
  );
});
