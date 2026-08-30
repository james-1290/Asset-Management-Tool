import { describe, expect, it } from "vitest";
import { readCsrfToken } from "./csrf";

describe("readCsrfToken", () => {
  it("reads the token from a cookie string", () => {
    expect(readCsrfToken("XSRF-TOKEN=abc123")).toBe("abc123");
  });

  it("finds it among other cookies", () => {
    expect(readCsrfToken("theme=dark; XSRF-TOKEN=abc123; other=1")).toBe("abc123");
  });

  it("URL-decodes the value", () => {
    expect(readCsrfToken("XSRF-TOKEN=a%2Bb%3Dc")).toBe("a+b=c");
  });

  it("keeps base64-style values containing '=' intact", () => {
    expect(readCsrfToken("XSRF-TOKEN=abc==")).toBe("abc==");
  });

  it("returns null when absent, empty, or only similarly-named", () => {
    expect(readCsrfToken("")).toBeNull();
    expect(readCsrfToken("theme=dark")).toBeNull();
    expect(readCsrfToken("XSRF-TOKEN=")).toBeNull();
    expect(readCsrfToken("NOT-XSRF-TOKEN=abc")).toBeNull();
  });
});
