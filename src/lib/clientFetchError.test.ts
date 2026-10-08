import { describe, expect, it } from "vitest";
import {
  ClientNetworkError,
  formatClientFetchError,
  isClientNetworkError,
} from "./clientFetchError";

describe("formatClientFetchError", () => {
  it("maps Failed to fetch", () => {
    const err = new Error("Failed to fetch");
    expect(formatClientFetchError(err, "en")).toMatch(/Could not reach the server/);
    expect(formatClientFetchError(err, "fr")).toMatch(/Impossible de joindre le serveur/);
    expect(formatClientFetchError(err, "en")).not.toMatch(/Failed to fetch/i);
  });

  it("maps legacy FR api.ts network string", () => {
    expect(
      isClientNetworkError(
        new Error(
          "Impossible de joindre le serveur. Vérifiez la connexion, puis réessayez."
        )
      )
    ).toBe(true);
  });

  it("maps ClientNetworkError", () => {
    expect(formatClientFetchError(new ClientNetworkError(), "en")).toMatch(
      /Could not reach the server/
    );
  });

  it("keeps validation messages", () => {
    expect(
      formatClientFetchError(new Error("Please provide a valid email"), "en")
    ).toBe("Please provide a valid email");
  });
});
