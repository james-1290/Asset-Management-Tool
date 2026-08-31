import { describe, it, expect } from "vitest";
import { isAdmin, canWrite, hasAnyRole } from "./permissions";

describe("permissions", () => {
  describe("canWrite", () => {
    it("allows Admin and Operator", () => {
      expect(canWrite(["Admin"])).toBe(true);
      expect(canWrite(["Operator"])).toBe(true);
      expect(canWrite(["Operator", "User"])).toBe(true);
    });

    it("refuses a read-only User", () => {
      // The defect this guards: a read-only user was shown create, edit and
      // delete controls the API then refused.
      expect(canWrite(["User"])).toBe(false);
    });

    it("refuses an account with no roles, and missing role data", () => {
      expect(canWrite([])).toBe(false);
      expect(canWrite(null)).toBe(false);
      expect(canWrite(undefined)).toBe(false);
    });

    it("does not treat an unknown role as write access", () => {
      expect(canWrite(["Auditor"])).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("is true only for Admin", () => {
      expect(isAdmin(["Admin"])).toBe(true);
      expect(isAdmin(["Operator"])).toBe(false);
      expect(isAdmin(["User"])).toBe(false);
      expect(isAdmin([])).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });

    it("finds Admin among several roles", () => {
      expect(isAdmin(["User", "Admin"])).toBe(true);
    });
  });

  describe("hasAnyRole", () => {
    it("refuses an account with no role assigned", () => {
      expect(hasAnyRole([])).toBe(false);
      expect(hasAnyRole(null)).toBe(false);
      expect(hasAnyRole(undefined)).toBe(false);
    });

    it("accepts any assigned role", () => {
      expect(hasAnyRole(["User"])).toBe(true);
    });
  });

  it("is case-sensitive, matching the roles Entra issues", () => {
    // A lowercase claim is not the Admin role; silently accepting it would
    // grant administration on a typo in the app registration.
    expect(isAdmin(["admin"])).toBe(false);
    expect(canWrite(["operator"])).toBe(false);
  });
});
