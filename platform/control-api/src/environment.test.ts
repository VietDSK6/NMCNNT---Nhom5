import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EnvironmentCipher,
  normalizeEnvironmentVariables,
} from "./environment.js";

test("mã hóa gắn giá trị với đúng ứng dụng và tên biến", () => {
  const cipher = new EnvironmentCipher("environment-test-key-at-least-32-characters");
  const encrypted = cipher.encrypt("app-a", "DEMO_SECRET", "plain-value");

  assert.doesNotMatch(encrypted, /plain-value/);
  assert.equal(cipher.decrypt("app-a", "DEMO_SECRET", encrypted), "plain-value");
  assert.throws(() => cipher.decrypt("app-b", "DEMO_SECRET", encrypted));
  assert.throws(() => cipher.decrypt("app-a", "OTHER_SECRET", encrypted));
});

test("giữ secret cũ bằng null nhưng yêu cầu giá trị cho biến mới", () => {
  const current = [{ key: "DEMO_SECRET", value: "stored-value", sensitive: true }] as const;
  assert.deepEqual(
    normalizeEnvironmentVariables([{ key: "DEMO_SECRET", value: null, sensitive: true }], current),
    current,
  );
  assert.throws(
    () => normalizeEnvironmentVariables([{ key: "NEW_SECRET", value: null, sensitive: true }], current),
    { code: "environment_value_required" },
  );
});
