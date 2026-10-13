import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEnvironmentVariables } from "./environment.mjs";

test("chuẩn hóa danh sách biến môi trường theo tên", () => {
  assert.deepEqual(validateEnvironmentVariables([
    { key: "FEATURE_FLAG", value: "enabled" },
    { key: "APP_MESSAGE", value: "Xin chào" },
  ]), [
    { key: "APP_MESSAGE", value: "Xin chào" },
    { key: "FEATURE_FLAG", value: "enabled" },
  ]);
});

test("chặn tên lặp, tên dành riêng và payload vượt giới hạn", () => {
  assert.throws(
    () => validateEnvironmentVariables([{ key: "APP_VERSION", value: "v3" }]),
    { code: "reserved_environment_key" },
  );
  assert.throws(
    () => validateEnvironmentVariables([
      { key: "APP_MESSAGE", value: "a" },
      { key: "APP_MESSAGE", value: "b" },
    ]),
    { code: "duplicate_environment_key" },
  );
  assert.throws(
    () => validateEnvironmentVariables([{ key: "TOO_LARGE", value: "x".repeat(2_049) }]),
    { code: "environment_value_too_large" },
  );
});
