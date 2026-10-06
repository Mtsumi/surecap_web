import { describe, expect, it } from "vitest";
import { persistLocale, readStoredLocale, LOCALE_STORAGE_KEY } from "./localePreference";

describe("localePreference", () => {
  it("round-trips a stored locale", () => {
    persistLocale("en");
    expect(readStoredLocale()).toBe("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    persistLocale("fr");
    expect(readStoredLocale()).toBe("fr");
  });

  it("migrates a legacy admin session locale into localStorage", () => {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    sessionStorage.setItem("surecap_admin_locale", "en");
    expect(readStoredLocale()).toBe("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });
});
