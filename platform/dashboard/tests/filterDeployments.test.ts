import assert from "node:assert/strict";
import { test } from "node:test";
import { filterDeployments } from "../src/features/deployments/filterDeployments.ts";

const d = (applicationId: string, status: string) => ({ applicationId, status }) as never;
const items = [d("a", "succeeded"), d("a", "failed"), d("b", "running"), d("b", "queued")];

test("all + mọi ứng dụng trả đủ", () => assert.equal(filterDeployments(items, "all", "").length, 4));
test("lọc theo kết quả", () => {
  assert.equal(filterDeployments(items, "succeeded", "").length, 1);
  assert.equal(filterDeployments(items, "failed", "").length, 1);
  assert.equal(filterDeployments(items, "active", "").length, 2);
});
test("lọc theo ứng dụng và kết hợp", () => {
  assert.equal(filterDeployments(items, "all", "b").length, 2);
  assert.equal(filterDeployments(items, "failed", "b").length, 0);
});
