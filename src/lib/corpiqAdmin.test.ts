import { describe, expect, it } from "vitest";
import {
  corpiqReportDownloadContentType,
  parseCorpiqReportDocumentId,
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
});
