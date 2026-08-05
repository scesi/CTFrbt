export const ALIAS_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;
export const NAME_MAX_LENGTH = 48;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export interface CredentialFields {
  alias?: unknown;
  name?: unknown;
  password?: unknown;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export function validateNewUserCredentials(
  f: CredentialFields,
): ValidationResult {
  if (
    typeof f.alias !== "string" ||
    typeof f.name !== "string" ||
    typeof f.password !== "string"
  ) {
    return { ok: false, error: "alias, name, and password are required", status: 400 };
  }

  const alias = f.alias.trim();
  const name = f.name.trim();

  if (!alias || !name || !f.password) {
    return { ok: false, error: "alias, name, and password are required", status: 400 };
  }

  if (!ALIAS_REGEX.test(alias)) {
    return {
      ok: false,
      error:
        "Alias must be 3-32 characters: letters, numbers, underscore, dot, or dash",
      status: 400,
    };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${NAME_MAX_LENGTH} characters or less`,
      status: 400,
    };
  }

  const password = f.password;
  if (/\s/.test(password)) {
    return {
      ok: false,
      error: "Password must not contain spaces",
      status: 400,
    };
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      ok: false,
      error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      status: 400,
    };
  }

  return { ok: true };
}

export function validatePasswordPair(
  currentPassword: unknown,
  newPassword: unknown,
): { ok: true } | { ok: false; error: string; status: number } {
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string"
  ) {
    return {
      ok: false,
      error: "currentPassword and newPassword are required",
      status: 400,
    };
  }

  if (/\s/.test(newPassword)) {
    return { ok: false, error: "Password must not contain spaces", status: 400 };
  }

  if (
    newPassword.length < PASSWORD_MIN_LENGTH ||
    newPassword.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      ok: false,
      error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      status: 400,
    };
  }

  return { ok: true };
}