import { describe, it, expect } from "vitest";
import { entityWriteInvalidations, type EntityInvalidation } from "./create-entity-hooks";

const assets: EntityInvalidation = { root: "assets", historyOnUpdate: true };
const locations: EntityInvalidation = {
  root: "locations",
  crossEntityOnUpdate: ["assets", "certificates", "applications", "people"],
};
const people: EntityInvalidation = {
  root: "people",
  crossEntityOnUpdate: ["assets", "certificates", "applications"],
};

describe("entityWriteInvalidations", () => {
  it("create invalidates the root list + dashboard", () => {
    expect(entityWriteInvalidations(assets, "create")).toEqual([["assets"], ["dashboard"]]);
  });

  it("archive invalidates the root list + dashboard", () => {
    expect(entityWriteInvalidations(assets, "archive")).toEqual([["assets"], ["dashboard"]]);
  });

  it("update on a history-tracked entity invalidates list, detail, history + dashboard", () => {
    expect(entityWriteInvalidations(assets, "update", "a1")).toEqual([
      ["assets"],
      ["assets", "a1"],
      ["assets", "a1", "history"],
      ["dashboard"],
    ]);
  });

  it("update without history skips the history key", () => {
    expect(entityWriteInvalidations({ root: "widgets" }, "update", "w1")).toEqual([
      ["widgets"],
      ["widgets", "w1"],
      ["dashboard"],
    ]);
  });

  it("location update fans out to every entity embedding its name", () => {
    expect(entityWriteInvalidations(locations, "update", "l1")).toEqual([
      ["locations"],
      ["locations", "l1"],
      ["assets"],
      ["certificates"],
      ["applications"],
      ["people"],
      ["dashboard"],
    ]);
  });

  it("person update fans out to assets/certificates/applications (no history)", () => {
    expect(entityWriteInvalidations(people, "update", "p1")).toEqual([
      ["people"],
      ["people", "p1"],
      ["assets"],
      ["certificates"],
      ["applications"],
      ["dashboard"],
    ]);
  });

  it("update without an id degrades to a list-only invalidation", () => {
    expect(entityWriteInvalidations(assets, "update")).toEqual([["assets"], ["dashboard"]]);
  });

  it("honours a custom related-keys list", () => {
    expect(
      entityWriteInvalidations({ root: "x", related: [["dashboard"], ["reports"]] }, "create"),
    ).toEqual([["x"], ["dashboard"], ["reports"]]);
  });
});
