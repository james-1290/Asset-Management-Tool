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

describe("assetSchema", () => {
  it("accepts a minimal valid asset", () => {
    expect(assetSchema.safeParse(validAsset).success).toBe(true);
  });

  it("requires name, serialNumber, assetTypeId, locationId and purchaseDate", () => {
    for (const field of ["name", "serialNumber", "assetTypeId", "locationId", "purchaseDate"] as const) {
      const result = assetSchema.safeParse({ ...validAsset, [field]: "" });
      expect(result.success, `expected ${field} to be required`).toBe(false);
    }
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
