import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "./adminAuth";

function memStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("adminAuth remember me storage", () => {
  beforeEach(() => {
    const g = globalThis as typeof globalThis & {
      window: typeof globalThis;
      sessionStorage: Storage;
      localStorage: Storage;
    };
    g.sessionStorage = memStorage();
    g.localStorage = memStorage();
    g.window = g;
  });

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

  it("ignores an expired session token and uses remembered", () => {
    const expiredPayload = btoa(JSON.stringify({ exp: 1 }));
    const futurePayload = btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
    );
    sessionStorage.setItem("surecap_admin_token", `x.${expiredPayload}.y`);
    localStorage.setItem("surecap_admin_token", `x.${futurePayload}.y`);
    expect(getAdminToken()).toBe(`x.${futurePayload}.y`);
    expect(sessionStorage.getItem("surecap_admin_token")).toBeNull();
  });
});
