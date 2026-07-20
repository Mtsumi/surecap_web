import { describe, expect, it } from "vitest";
import {
  formatJobMessagePreview,
  formatSearchAddress,
  formatTalScreeningPreview,
  parseIdDocumentExtractMessage,
  parseTalScreeningMessage,
  pluralCount,
  sourceLabel,
} from "./jobMessageFormat";

describe("jobMessageFormat", () => {
  it("parses TAL JSON and shows locale-aware preview (not raw English summary)", () => {
    const message = JSON.stringify({
      summary: "2 address(es): 2 completed; 3 dossier(s) matched",
      applicant_name: "Stéphane Larose",
      searches: [
        {
          source: "current_address",
          status: "completed",
          dossier_count: 0,
          name_match_count: 0,
          dossiers: [],
        },
        {
          source: "id_sticker_address",
          status: "completed",
          dossier_count: 3,
          name_match_count: 2,
          dossiers: [],
        },
      ],
    });
    expect(parseTalScreeningMessage(message)?.applicant_name).toBe("Stéphane Larose");
    const fr = formatJobMessagePreview("tal_screening", message, "fr");
    expect(fr).toContain("2 adresses");
    expect(fr).toContain("3 dossiers");
    expect(fr).not.toContain("address(es)");
    const en = formatJobMessagePreview("tal_screening", message, "en");
    expect(en).toContain("2 addresses");
    expect(en).toContain("2 tenant matches");
  });

  it("formatSearchAddress prefers raw then civic/apt/postal", () => {
    expect(
      formatSearchAddress({
        raw_address: "350 Rue Prince-Arthur O",
        postal: "H2X3R4",
        civic: "350",
      })
    ).toBe("350 Rue Prince-Arthur O");
    expect(
      formatSearchAddress(
        { postal: "H2X3R4", civic: "350", apartment: "412" },
        "fr"
      )
    ).toBe("350 · app. 412 · H2X3R4");
    expect(
      formatSearchAddress(
        { postal: "H2X3R4", civic: "350", apartment: "412" },
        "en"
      )
    ).toBe("350 · apt 412 · H2X3R4");
  });

  it("pluralCount and empty-search preview", () => {
    expect(pluralCount(0, "dossier", "dossiers")).toBe("0 dossiers");
    expect(pluralCount(1, "dossier", "dossiers")).toBe("1 dossier");
    expect(formatTalScreeningPreview({ searches: [] }, "fr")).toBe("Aucun résultat TAL");
  });

  it("parses id_document_extract JSON", () => {
    const message = JSON.stringify({
      screening_context: "canadian",
      flags: ["blur_front"],
      name_mismatch: true,
      ocr_name: "STEVE KMNOT",
      pdf417_ok: false,
      addresses: [],
    });
    expect(parseIdDocumentExtractMessage(message)?.name_mismatch).toBe(true);
    expect(formatJobMessagePreview("id_document_extract", message, "fr")).toContain(
      "Nom différent"
    );
    expect(formatJobMessagePreview("id_document_extract", message, "en")).toContain(
      "Name differs"
    );
  });

  it("labels address sources in French and English", () => {
    expect(sourceLabel("current_address", "fr")).toBe("Adresse actuelle");
    expect(sourceLabel("id_pdf417_address", "fr")).toBe("Adresse permis (PDF417)");
    expect(sourceLabel("id_sticker_address", "en")).toBe("SAAQ sticker address");
  });
});
