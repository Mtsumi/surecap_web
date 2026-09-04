import { describe, expect, it } from "vitest";
import {
  formatJobMessagePreview,
  formatSearchAddress,
  formatTalScreeningPreview,
  formatIdPhotoQuality,
  uniqueIncomeFlags,
  incomeExtractFlagLabel,
  parseIdDocumentExtractMessage,
  parseIncomeDocumentExtractMessage,
  parseTalScreeningMessage,
  pluralCount,
  sourceLabel,
  talReasonLabel,
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

  it("labels stale vs future pay dates in plain language", () => {
    expect(incomeExtractFlagLabel("payslip_stale", "en")).toBe(
      "Pay date is older than 6 months"
    );
    expect(incomeExtractFlagLabel("payslip_date_in_future", "en")).toBe(
      "Pay date is in the future"
    );
    expect(incomeExtractFlagLabel("name_mismatch_payslip_form", "en")).toMatch(
      /doesn't match the application/i
    );
    expect(incomeExtractFlagLabel("payslip_stale", "fr")).toContain("6 mois");
  });

  it("parses income_document_extract JSON and formats preview", () => {
    const message = JSON.stringify({
      document_type: "pay_slip_1",
      read_path: "pdf_text",
      employee_name: "Cherief, Anis",
      employer_name: "Etalex inc.",
      net_pay: 736.65,
      payslip_like: true,
      flags: ["name_mismatch_payslip_form"],
    });
    expect(parseIncomeDocumentExtractMessage(message)?.employer_name).toBe("Etalex inc.");
    expect(formatJobMessagePreview("income_document_extract", message, "fr")).toContain(
      "Etalex"
    );
    expect(incomeExtractFlagLabel("payslip_not_recognized", "en")).toContain("payslip");
  });

  it("labels address sources in French and English", () => {
    expect(sourceLabel("current_address", "fr")).toBe("Formulaire — adresse actuelle");
    expect(sourceLabel("id_pdf417_address", "fr")).toBe("Pièce d'identité (code-barres)");
    expect(sourceLabel("id_sticker_address", "en")).toBe("ID (sticker)");
    expect(sourceLabel("income_doc_address", "en")).toBe("Proof of income");
    expect(sourceLabel("income_doc_address", "fr")).toBe("Preuve de revenu");
  });

  it("labels payslip TAL unusable-address reason", () => {
    expect(talReasonLabel("missing_postal_code", "income_doc_address", "en")).toBe(
      "No usable address found on the payslip"
    );
    expect(talReasonLabel("payslip_address_unusable", "income_doc_address", "fr")).toBe(
      "Aucune adresse utilisable trouvée sur le talon de paie"
    );
    expect(talReasonLabel("not_quebec", "income_doc_address", "en")).toBe(
      "Outside Quebec — not searched"
    );
  });

  it("omits blur jargon when the ID photo is clear and there is no back", () => {
    expect(
      formatIdPhotoQuality({ blur_front: { quality: "sharp" }, blur_back: null }, "en")
    ).toBeNull();
    expect(
      formatIdPhotoQuality({ blur_front: { quality: "blurry" }, blur_back: null }, "en")
    ).toMatch(/blurry/i);
  });

  it("hides duplicate payslip-not-recognized flags already shown on a slip", () => {
    expect(
      uniqueIncomeFlags({
        payslip_like: false,
        flags: ["payslip_not_recognized", "payslip_stale"],
        slips: [{ flags: ["payslip_not_recognized"] }],
      })
    ).toEqual(["payslip_stale"]);
  });
});
