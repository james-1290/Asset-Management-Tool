import { describe, expect, it } from "vitest";
import { ApiError, getApiErrorMessage } from "./api-client";

describe("getApiErrorMessage", () => {
  it("returns the server-provided error message when present", () => {
    const err = new ApiError(400, "Bad Request", { error: "Name is required" });
    expect(getApiErrorMessage(err, "fallback")).toBe("Name is required");
  });

  it("falls back when the ApiError has no error body", () => {
    const err = new ApiError(500, "Server Error");
    expect(getApiErrorMessage(err, "Something went wrong")).toBe("Something went wrong");
  });

  it("falls back for non-ApiError values", () => {
    expect(getApiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    expect(getApiErrorMessage("a string", "fallback")).toBe("fallback");
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });
});
