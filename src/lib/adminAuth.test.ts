import { afterEach, describe, expect, it } from "vitest";
import {
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "./adminAuth";

describe("adminAuth remember me storage", () => {
  afterEach(() => {
    clearAdminToken();
  });

  it("stores session-only by default", () => {
    setAdminToken("session-token");
    expect(sessionStorage.getItem("surecap_admin_token")).toBe("session-token");
    expect(localStorage.getItem("surecap_admin_token")).toBeNull();
    expect(getAdminToken()).toBe("session-token");
  });

  it("stores remembered tokens in localStorage only", () => {
    setAdminToken("remember-token", true);
    expect(localStorage.getItem("surecap_admin_token")).toBe("remember-token");
    expect(sessionStorage.getItem("surecap_admin_token")).toBeNull();
    expect(getAdminToken()).toBe("remember-token");
  });

  it("clear removes both storages", () => {
    setAdminToken("a", true);
    setAdminToken("b", false);
    clearAdminToken();
    expect(getAdminToken()).toBeNull();
  });
});
