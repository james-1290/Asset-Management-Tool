import { describe, it, expect } from "vitest";
import { assetSchema } from "./asset";
import { locationSchema } from "./location";

const validAsset = {
  name: "Laptop 1",
  serialNumber: "SN-001",
  assetTypeId: "type-1",
  locationId: "loc-1",
  purchaseDate: "2026-01-01",
};

/** What the API and the CSV importer actually require: a name and a type. */
const minimalAsset = { name: "Laptop 1", assetTypeId: "type-1" };

describe("assetSchema", () => {
  it("accepts a minimal valid asset", () => {
    expect(assetSchema.safeParse(validAsset).success).toBe(true);
  });

  it("requires only the fields the API requires", () => {
    for (const field of ["name", "assetTypeId"] as const) {
      const result = assetSchema.safeParse({ ...validAsset, [field]: "" });
      expect(result.success, `expected ${field} to be required`).toBe(false);
    }
  });

  it("accepts an asset with only a name and a type, as the importer creates", () => {
    // The form used to demand a serial number, location and purchase date that
    // neither the API nor the importer required, which left every imported
    // asset uneditable.
    expect(assetSchema.safeParse(minimalAsset).success).toBe(true);
  });

  it("still accepts those fields when they are supplied", () => {
    expect(assetSchema.safeParse(validAsset).success).toBe(true);
  });

  it("rejects a name longer than 200 characters", () => {
    const result = assetSchema.safeParse({ ...validAsset, name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted or empty strings", () => {
    const result = assetSchema.safeParse({
      ...validAsset,
      assetModelId: "",
      assignedPersonId: "",
      purchaseCost: "",
      warrantyExpiryDate: "",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts custom field values as a string map", () => {
    const result = assetSchema.safeParse({
      ...validAsset,
      customFieldValues: { "def-1": "Blue", "def-2": "42" },
    });
    expect(result.success).toBe(true);
  });
});

describe("locationSchema", () => {
  it("accepts a location with just a name", () => {
    expect(locationSchema.safeParse({ name: "HQ" }).success).toBe(true);
  });

  it("requires a name", () => {
    expect(locationSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects an over-long city", () => {
    expect(locationSchema.safeParse({ name: "HQ", city: "x".repeat(201) }).success).toBe(false);
  });
});
