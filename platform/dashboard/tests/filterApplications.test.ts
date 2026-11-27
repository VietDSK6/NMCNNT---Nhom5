import assert from "node:assert/strict";
import { test } from "node:test";
import { filterApplications } from "../src/features/applications/filterApplications.ts";

const app = (slug: string, status: string, extra: object = {}) =>
  ({ name: slug.toUpperCase(), slug, route: `/${slug}`, description: "demo", repositoryUrl: null, runtime: { status }, ...extra }) as never;
const items = [
  app("landing", "running"),
  app("shop", "stopped"),
  app("api", "unhealthy", { repositoryUrl: "https://github.com/acme/billing" }),
];

test("tab Tất cả trả đủ danh sách", () => assert.equal(filterApplications(items, "all", "").length, 3));
test("tab Đang chạy / Tạm dừng / Lỗi lọc đúng trạng thái", () => {
  assert.deepEqual(filterApplications(items, "running", "").map((i) => i.slug), ["landing"]);
  assert.deepEqual(filterApplications(items, "stopped", "").map((i) => i.slug), ["shop"]);
  assert.deepEqual(filterApplications(items, "attention", "").map((i) => i.slug), ["api"]);
});
test("tìm kiếm không phân biệt hoa/thường, bỏ khoảng trắng đầu cuối", () => assert.deepEqual(filterApplications(items, "all", "  LAND ").map((i) => i.slug), ["landing"]));
test("tìm theo URL repository", () => assert.deepEqual(filterApplications(items, "all", "billing").map((i) => i.slug), ["api"]));
test("không khớp thì trả rỗng (trang hiển thị trạng thái rỗng)", () => assert.equal(filterApplications(items, "all", "zzz").length, 0));
test("kết hợp tab và từ khóa", () => assert.equal(filterApplications(items, "stopped", "landing").length, 0));
