import { describe, expect, it } from "vitest";
import { csrfHeader } from "./csrf";

describe("csrfHeader", () => {
  it("marks requests with the custom header the API requires", () => {
    // A cross-origin page cannot set this without a CORS preflight the API
    // refuses, which is what makes it a CSRF defence.
    expect(csrfHeader()).toEqual({ "X-Requested-With": "XMLHttpRequest" });
  });

  it("is constant, so it cannot go stale between reading and sending", () => {
    expect(csrfHeader()).toEqual(csrfHeader());
  });
});
