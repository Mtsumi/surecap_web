import { describe, expect, it } from "vitest";
import {
  corpiqReportDownloadContentType,
  parseCorpiqReportDocumentId,
  resolveCorpiqReportDocument,
} from "./corpiqAdmin";

describe("corpiqAdmin", () => {
  it("prefers report_pdf_document_id for View report", () => {
    expect(parseCorpiqReportDocumentId(null)).toBeNull();
    expect(
      parseCorpiqReportDocumentId(
        JSON.stringify({ report_document_id: 1, report_pdf_document_id: 2 })
      )
    ).toBe(2);
    expect(
      parseCorpiqReportDocumentId(JSON.stringify({ report_document_id: 359 }))
    ).toBe(359);
  });

  it("chooses PDF content type when PDF id present", () => {
    expect(
      corpiqReportDownloadContentType(
        JSON.stringify({ report_pdf_document_id: 2 })
      )
    ).toBe("application/pdf");
    expect(
      corpiqReportDownloadContentType(JSON.stringify({ report_document_id: 1 }))
    ).toBe("text/html");
    expect(
      corpiqReportDownloadContentType(
        JSON.stringify({
          report_document_id: 360,
          report_html_document_id: 359,
        })
      )
    ).toBe("application/pdf");
  });

  it("falls back to member corpiq_report_pdf when job lacks ids", () => {
    expect(
      resolveCorpiqReportDocument(JSON.stringify({ score: 463 }), [
        { id: 10, document_type: "corpiq_report" },
        { id: 11, document_type: "corpiq_report_pdf" },
      ])
    ).toEqual({ id: 11, contentType: "application/pdf" });
  });

  it("falls back to HTML member doc when PDF missing", () => {
    expect(
      resolveCorpiqReportDocument(null, [
        { id: 10, document_type: "corpiq_report" },
      ])
    ).toEqual({ id: 10, contentType: "text/html" });
  });
});
