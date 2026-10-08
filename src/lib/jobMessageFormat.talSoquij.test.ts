import { describe, expect, it } from "vitest";
import {
  formatSoquijFailure,
  formatSoquijScreeningPreview,
  formatTalFailure,
  formatTalScreeningPreview,
} from "./jobMessageFormat";

describe("formatTalFailure", () => {
  it("maps not_in_canada without em dashes", () => {
    const copy = formatTalFailure(
      {
        error_code: "not_in_canada",
        stage_label: "Outside Canada",
        summary: "Skipped: address not in Canada.",
      },
      "en"
    );
    expect(copy?.title).toBe("Outside Canada");
    expect(copy?.detail).toMatch(/Quebec/);
    expect(copy?.title).not.toMatch(/—/);
    expect(copy?.detail).not.toMatch(/—/);
  });

  it("localizes FR search_failed", () => {
    const copy = formatTalFailure({ error_code: "search_failed" }, "fr");
    expect(copy?.title).toMatch(/TAL/);
    expect(copy?.detail).toMatch(/relancez/i);
  });
});

describe("formatSoquijFailure", () => {
  it("maps portal_error", () => {
    const copy = formatSoquijFailure({ error_code: "portal_error" }, "en");
    expect(copy?.title).toBe("SOQUIJ portal error");
    expect(copy?.detail.toLowerCase()).toMatch(/re-run/);
    expect(copy?.detail).not.toMatch(/—/);
  });

  it("maps no_family_name in FR", () => {
    const copy = formatSoquijFailure({ error_code: "no_family_name" }, "fr");
    expect(copy?.title).toMatch(/famille/i);
  });
});

describe("formatTalScreeningPreview", () => {
  it("uses failure copy when there are no searches", () => {
    const preview = formatTalScreeningPreview(
      {
        error_code: "not_configured",
        stage_label: "TAL not configured",
        summary: "Skipped: TAL not configured.",
        searches: [],
      },
      "en"
    );
    expect(preview).toMatch(/not configured/i);
    expect(preview).not.toMatch(/—/);
  });

  it("keeps address counts when searches exist", () => {
    const preview = formatTalScreeningPreview(
      {
        error_code: "search_failed",
        searches: [{ status: "completed", dossier_count: 0, name_match_count: 0 }],
      },
      "en"
    );
    expect(preview).toMatch(/1 address/);
  });
});

describe("formatSoquijScreeningPreview", () => {
  it("uses failure copy for skipped", () => {
    const preview = formatSoquijScreeningPreview(
      {
        status: "skipped",
        error_code: "no_family_name",
        decision_count: 0,
      },
      "en"
    );
    expect(preview).toMatch(/family name/i);
  });
});
