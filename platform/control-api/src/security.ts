import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;

export interface PasswordDigest {
  readonly salt: string;
  readonly hash: string;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): PasswordDigest {
  return {
    salt,
    hash: scryptSync(password, salt, KEY_LENGTH).toString("hex"),
  };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseCookies(header: string | undefined): ReadonlyMap<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies.set(key, decodeURIComponent(rawValue));
    } catch {
      // Bỏ qua cookie sai định dạng thay vì làm hỏng toàn bộ request.
    }
  }
  return cookies;
}

export function sessionCookie(
  name: string,
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
): string {
  const securePart = secure ? "; Secure" : "";
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${securePart}`;
}

export function clearSessionCookie(name: string, secure: boolean): string {
  const securePart = secure ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${securePart}`;
}
