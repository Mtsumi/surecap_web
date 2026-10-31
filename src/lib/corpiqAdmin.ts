/** Admin helpers for CORPIQ screening jobs. */

export type CorpiqReportDocRef = {
  id: number;
  document_type?: string | null;
};

/** Prefer PDF id from the job message; else HTML view id. */
export function parseCorpiqReportDocumentId(message: string | null): number | null {
  if (!message?.trim()) return null;
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    const pdf = payload.report_pdf_document_id;
    if (typeof pdf === "number" && Number.isFinite(pdf)) return pdf;
    const id = payload.report_document_id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve report for View report: job message ids first (PDF preferred),
 * else latest member ``corpiq_report_pdf``, else ``corpiq_report`` HTML.
 */
export function resolveCorpiqReportDocument(
  message: string | null,
  memberDocs: CorpiqReportDocRef[] | null | undefined
): { id: number; contentType: string } | null {
  if (!message?.trim()) {
    return resolveCorpiqReportFromMemberDocs(memberDocs);
  }
  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    const pdf = payload.report_pdf_document_id;
    if (typeof pdf === "number" && Number.isFinite(pdf)) {
      return { id: pdf, contentType: "application/pdf" };
    }
    const htmlOnly = payload.report_html_document_id;
    const viewId = payload.report_document_id;
    if (
      typeof viewId === "number" &&
      Number.isFinite(viewId) &&
      typeof htmlOnly === "number" &&
      htmlOnly !== viewId
    ) {
      return { id: viewId, contentType: "application/pdf" };
    }
    if (typeof viewId === "number" && Number.isFinite(viewId)) {
      return { id: viewId, contentType: "text/html" };
    }
  } catch {
    /* fall through to member docs */
  }
  return resolveCorpiqReportFromMemberDocs(memberDocs);
}

function resolveCorpiqReportFromMemberDocs(
  memberDocs: CorpiqReportDocRef[] | null | undefined
): { id: number; contentType: string } | null {
  if (!memberDocs?.length) return null;
  const pdf = [...memberDocs]
    .reverse()
    .find((d) => d.document_type === "corpiq_report_pdf");
  if (pdf) return { id: pdf.id, contentType: "application/pdf" };
  const html = [...memberDocs]
    .reverse()
    .find((d) => d.document_type === "corpiq_report");
  if (html) return { id: html.id, contentType: "text/html" };
  return null;
}

export function corpiqReportDownloadContentType(message: string | null): string {
  return (
    resolveCorpiqReportDocument(message, null)?.contentType ?? "application/pdf"
  );
}
