import { authStrings } from "./strings";

export function validateUsername(value: string): string | null {
  return value.trim() ? null : authStrings.usernameRequired;
}

export function validatePassword(value: string): string | null {
  return value ? null : authStrings.passwordRequired;
}
