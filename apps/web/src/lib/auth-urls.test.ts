import { describe, expect, it, beforeEach, vi } from "vitest";
import { loginUrl, logoutUrl } from "./auth-urls";

function stubLocation(pathname: string, search = "") {
  vi.stubGlobal("window", { location: { pathname, search } });
}

describe("auth-urls", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the user to where they were after signing in", () => {
    stubLocation("/assets", "?page=2");
    expect(loginUrl()).toBe("/.auth/login/aad?post_login_redirect_uri=%2Fassets%3Fpage%3D2");
  });

  it("encodes an explicit return path", () => {
    stubLocation("/");
    expect(loginUrl("/people/123")).toBe("/.auth/login/aad?post_login_redirect_uri=%2Fpeople%2F123");
  });

  it("falls back to the root when there is no path", () => {
    stubLocation("");
    expect(loginUrl()).toBe("/.auth/login/aad?post_login_redirect_uri=%2F");
  });

  it("sends the user to the root after signing out", () => {
    expect(logoutUrl()).toBe("/.auth/logout?post_logout_redirect_uri=%2F");
  });
});
