import { describe, it, expect } from "vitest";
import { certificateSchema } from "./certificate";
import { applicationSchema } from "./application";
import { personSchema } from "./person";
import { locationSchema } from "./location";

/**
 * The form schemas decide what a user is allowed to save. They must agree with
 * what the API accepts — a stricter form silently blocks records the API and
 * the CSV importer create quite happily, which is how imported assets became
 * uneditable.
 */

describe("certificateSchema", () => {
  // autoRenewal has no default in the schema and the form always supplies
  // it, so it is part of the minimum a caller must provide.
  const valid = { name: "TLS cert", certificateTypeId: "type-1", autoRenewal: false };

  it("accepts the minimum the form requires", () => {
    expect(certificateSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name and a type", () => {
    expect(certificateSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(certificateSchema.safeParse({ ...valid, certificateTypeId: "" }).success).toBe(false);
  });

  it("rejects an expiry that falls before the issue date", () => {
    const result = certificateSchema.safeParse({
      ...valid, issuedDate: "2026-06-01", expiryDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["expiryDate"]);
    }
  });

  it("accepts an expiry on the same day as issue", () => {
    expect(certificateSchema.safeParse({
      ...valid, issuedDate: "2026-01-01", expiryDate: "2026-01-01",
    }).success).toBe(true);
  });

  it("does not compare dates when only one is supplied", () => {
    expect(certificateSchema.safeParse({ ...valid, expiryDate: "2026-01-01" }).success).toBe(true);
    expect(certificateSchema.safeParse({ ...valid, issuedDate: "2026-01-01" }).success).toBe(true);
  });
});

describe("applicationSchema", () => {
  const valid = { name: "Design tool", applicationTypeId: "type-1", autoRenewal: false };

  it("accepts the minimum the form requires", () => {
    expect(applicationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name and a type", () => {
    expect(applicationSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...valid, applicationTypeId: "" }).success).toBe(false);
  });
});

describe("personSchema", () => {
  const valid = { fullName: "Alex Doe" };

  it("needs only a name, as the API and importer do", () => {
    expect(personSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(personSchema.safeParse({ fullName: "" }).success).toBe(false);
  });

  it("rejects a malformed email but allows none at all", () => {
    expect(personSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(personSchema.safeParse({ ...valid, email: "alex@example.com" }).success).toBe(true);
    expect(personSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });
});

describe("locationSchema", () => {
  it("needs only a name", () => {
    expect(locationSchema.safeParse({ name: "London office" }).success).toBe(true);
    expect(locationSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("treats address, city and country as optional", () => {
    expect(locationSchema.safeParse({
      name: "London office", address: "", city: "", country: "",
    }).success).toBe(true);
  });
});
