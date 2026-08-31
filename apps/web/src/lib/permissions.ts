/**
 * What a set of Entra app roles allows.
 *
 * Kept as pure functions rather than inline in the auth context so the rules
 * can be tested directly: this is the logic that decides whether someone is
 * shown a control at all, and a mistake here is a permission bug.
 *
 * The API enforces the same rules independently — these only decide what to
 * *offer*, never what to allow.
 */

export const ADMIN = "Admin";
export const OPERATOR = "Operator";
export const USER = "User";

/** Administration: user management, settings, the audit log, imports. */
export function isAdmin(roles: readonly string[] | null | undefined): boolean {
  return roles?.includes(ADMIN) ?? false;
}

/** Creating, editing, archiving and restoring records. */
export function canWrite(roles: readonly string[] | null | undefined): boolean {
  return roles?.some((r) => r === ADMIN || r === OPERATOR) ?? false;
}

/**
 * Whether the account may use the app at all. A user with no role is refused:
 * a role is how access is granted, so no role means no access.
 */
export function hasAnyRole(roles: readonly string[] | null | undefined): boolean {
  return (roles?.length ?? 0) > 0;
}
