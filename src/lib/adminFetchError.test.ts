import { describe, expect, it } from "vitest";
import {
  AdminNetworkError,
  formatAdminFetchError,
  isAdminNetworkError,
} from "./adminFetchError";

describe("formatAdminFetchError", () => {
  it("maps Failed to fetch in EN and FR", () => {
    const err = new Error("Failed to fetch");
    expect(formatAdminFetchError(err, "en")).toMatch(/Could not reach the admin API/);
    expect(formatAdminFetchError(err, "fr")).toMatch(/Impossible de joindre/);
    expect(formatAdminFetchError(err, "en")).not.toMatch(/Failed to fetch/i);
  });

  it("maps Safari Load failed", () => {
    expect(formatAdminFetchError(new Error("Load failed"), "en")).toMatch(
      /Could not reach/
    );
  });

  it("maps AdminNetworkError", () => {
    expect(isAdminNetworkError(new AdminNetworkError())).toBe(true);
    expect(formatAdminFetchError(new AdminNetworkError(), "en")).toMatch(
      /Could not reach/
    );
  });

  it("maps ClientNetworkError from public api.ts (janitor review)", () => {
    const err = new Error("CLIENT_NETWORK");
    err.name = "ClientNetworkError";
    expect(isAdminNetworkError(err)).toBe(true);
    expect(formatAdminFetchError(err, "en")).toMatch(/Could not reach the admin API/);
  });

  it("maps session expired", () => {
    expect(formatAdminFetchError(new Error("Session expired"), "en")).toMatch(
      /Sign in again/
    );
  });

  it("keeps human API messages", () => {
    expect(
      formatAdminFetchError(new Error("Email already registered"), "en")
    ).toBe("Email already registered");
  });

  it("uses fallback for empty or Internal Server Error", () => {
    expect(formatAdminFetchError(new Error(""), "en", "Oops")).toBe("Oops");
    expect(formatAdminFetchError(new Error("Internal Server Error"), "en")).toMatch(
      /Something went wrong/
    );
  });

  it("strips em dashes from API messages", () => {
    expect(formatAdminFetchError(new Error("Stop — try again"), "en")).toBe(
      "Stop - try again"
    );
  });
});
