import { RunnerInputError } from "./catalog.mjs";

export const ENVIRONMENT_LIMITS = Object.freeze({
  maximumVariables: 20,
  maximumKeyLength: 64,
  maximumValueBytes: 2_048,
  maximumTotalValueBytes: 8_192,
});

const RESERVED_KEYS = new Set([
  "APP_ID",
  "APP_NAME",
  "APP_VERSION",
  "HOME",
  "HOSTNAME",
  "NODE_ENV",
  "NODE_OPTIONS",
  "PATH",
  "PORT",
]);

const RESERVED_PREFIXES = ["DOCKER_", "LD_"];

export function validateEnvironmentVariables(input) {
  if (!Array.isArray(input)) {
    throw new RunnerInputError("invalid_environment", "Danh sách biến môi trường không hợp lệ.");
  }
  if (input.length > ENVIRONMENT_LIMITS.maximumVariables) {
    throw new RunnerInputError(
      "too_many_environment_variables",
      `Mỗi ứng dụng chỉ được cấu hình tối đa ${ENVIRONMENT_LIMITS.maximumVariables} biến.`,
    );
  }

  const seen = new Set();
  let totalBytes = 0;
  const variables = input.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new RunnerInputError("invalid_environment", "Mỗi biến môi trường phải là một object.");
    }
    const key = typeof item.key === "string" ? item.key.trim() : "";
    if (!new RegExp(`^[A-Z][A-Z0-9_]{0,${ENVIRONMENT_LIMITS.maximumKeyLength - 1}}$`).test(key)) {
      throw new RunnerInputError("invalid_environment_key", "Tên biến môi trường không hợp lệ.");
    }
    if (RESERVED_KEYS.has(key) || RESERVED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      throw new RunnerInputError("reserved_environment_key", `Biến ${key} được nền tảng quản lý.`);
    }
    if (seen.has(key)) {
      throw new RunnerInputError("duplicate_environment_key", `Biến ${key} bị khai báo lặp lại.`);
    }
    seen.add(key);
    if (typeof item.value !== "string" || item.value.includes("\0")) {
      throw new RunnerInputError("invalid_environment_value", `Giá trị của ${key} không hợp lệ.`);
    }
    const bytes = Buffer.byteLength(item.value, "utf8");
    if (bytes > ENVIRONMENT_LIMITS.maximumValueBytes) {
      throw new RunnerInputError("environment_value_too_large", `Giá trị của ${key} vượt giới hạn.`);
    }
    totalBytes += bytes;
    return { key, value: item.value };
  });

  if (totalBytes > ENVIRONMENT_LIMITS.maximumTotalValueBytes) {
    throw new RunnerInputError("environment_payload_too_large", "Tổng giá trị biến môi trường vượt giới hạn.");
  }
  return variables.sort((left, right) => left.key.localeCompare(right.key));
}
