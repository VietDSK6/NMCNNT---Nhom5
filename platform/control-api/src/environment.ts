import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

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

export interface EnvironmentVariableInput {
  readonly key: string;
  readonly value?: string | null;
  readonly sensitive: boolean;
}

export interface PlainEnvironmentVariable {
  readonly key: string;
  readonly value: string;
  readonly sensitive: boolean;
}

export class EnvironmentValidationError extends Error {
  readonly statusCode = 400;

  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "EnvironmentValidationError";
  }
}

function validateKey(key: string): void {
  if (!new RegExp(`^[A-Z][A-Z0-9_]{0,${ENVIRONMENT_LIMITS.maximumKeyLength - 1}}$`).test(key)) {
    throw new EnvironmentValidationError(
      "invalid_environment_key",
      "Tên biến phải viết hoa, bắt đầu bằng chữ cái và chỉ chứa chữ cái, số hoặc dấu gạch dưới.",
    );
  }
  if (RESERVED_KEYS.has(key) || RESERVED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new EnvironmentValidationError(
      "reserved_environment_key",
      `Biến ${key} được nền tảng quản lý và không thể thay đổi.`,
    );
  }
}

function validateValue(key: string, value: string): number {
  if (value.includes("\0")) {
    throw new EnvironmentValidationError("invalid_environment_value", `Giá trị của ${key} không được chứa ký tự null.`);
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > ENVIRONMENT_LIMITS.maximumValueBytes) {
    throw new EnvironmentValidationError(
      "environment_value_too_large",
      `Giá trị của ${key} vượt quá ${ENVIRONMENT_LIMITS.maximumValueBytes} byte.`,
    );
  }
  return bytes;
}

export function normalizeEnvironmentVariables(
  input: readonly EnvironmentVariableInput[],
  current: readonly PlainEnvironmentVariable[],
): readonly PlainEnvironmentVariable[] {
  if (input.length > ENVIRONMENT_LIMITS.maximumVariables) {
    throw new EnvironmentValidationError(
      "too_many_environment_variables",
      `Mỗi ứng dụng chỉ được cấu hình tối đa ${ENVIRONMENT_LIMITS.maximumVariables} biến.`,
    );
  }

  const currentByKey = new Map(current.map((variable) => [variable.key, variable]));
  const seen = new Set<string>();
  const normalized: PlainEnvironmentVariable[] = [];
  let totalBytes = 0;

  for (const item of input) {
    const key = item.key.trim();
    validateKey(key);
    if (seen.has(key)) {
      throw new EnvironmentValidationError("duplicate_environment_key", `Biến ${key} bị khai báo lặp lại.`);
    }
    seen.add(key);

    let value = item.value;
    if (value === null || value === undefined) {
      const existing = currentByKey.get(key);
      if (!item.sensitive || !existing?.sensitive) {
        throw new EnvironmentValidationError(
          "environment_value_required",
          `Biến ${key} cần có giá trị.`,
        );
      }
      value = existing.value;
    }
    totalBytes += validateValue(key, value);
    normalized.push({ key, value, sensitive: item.sensitive });
  }

  if (totalBytes > ENVIRONMENT_LIMITS.maximumTotalValueBytes) {
    throw new EnvironmentValidationError(
      "environment_payload_too_large",
      `Tổng giá trị biến môi trường vượt quá ${ENVIRONMENT_LIMITS.maximumTotalValueBytes} byte.`,
    );
  }

  return normalized.sort((left, right) => left.key.localeCompare(right.key));
}

export class EnvironmentCipher {
  readonly #key: Buffer;

  constructor(keyMaterial: string) {
    this.#key = createHash("sha256")
      .update("mini-paas-environment-v1\0", "utf8")
      .update(keyMaterial, "utf8")
      .digest();
  }

  encrypt(applicationId: string, key: string, value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.#key, iv);
    cipher.setAAD(Buffer.from(`${applicationId}\0${key}`, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":");
  }

  decrypt(applicationId: string, key: string, payload: string): string {
    const parts = payload.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Định dạng dữ liệu biến môi trường không hợp lệ.");
    const [, iv, tag, ciphertext] = parts;
    if (!iv || !tag || ciphertext === undefined) throw new Error("Dữ liệu biến môi trường không đầy đủ.");
    const decipher = createDecipheriv("aes-256-gcm", this.#key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(`${applicationId}\0${key}`, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
