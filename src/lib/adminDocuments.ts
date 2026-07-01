import { clearAdminToken, getAdminToken } from "./adminAuth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type MemberDocument = {
  id: number;
  application_member_id: number;
  document_type: string;
  original_filename: string;
  content_type: string;
  byte_size: number;
  uploaded_at: string;
};

export type DocumentDisposition = "inline" | "attachment";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  id_driver_licence_front: "Permis (recto)",
  id_driver_licence_back: "Permis (verso)",
  id_medicare: "Carte RAMQ",
  id_passport: "Passeport",
  pay_slip_1: "Talons de paie",
  pay_slip_2: "Talons de paie (2)",
  notice_of_assessment_year_1: "Avis de cotisation (1)",
  notice_of_assessment_year_2: "Avis de cotisation (2)",
  proof_of_income: "Preuve de revenu",
  signature: "Signature",
  selfie: "Selfie",
};

export function documentTypeLabel(documentType: string): string {
  return DOCUMENT_TYPE_LABELS[documentType] ?? documentType.replaceAll("_", " ");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function isImageContentType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function isPdfContentType(contentType: string): boolean {
  return contentType === "application/pdf" || contentType.endsWith("/pdf");
}

export function isPdfDocument(doc: {
  content_type: string;
  original_filename: string;
}): boolean {
  return (
    isPdfContentType(doc.content_type) ||
    doc.original_filename.toLowerCase().endsWith(".pdf")
  );
}

export function isImageDocument(doc: {
  content_type: string;
  original_filename: string;
}): boolean {
  if (isImageContentType(doc.content_type)) return true;
  const lower = doc.original_filename.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  );
}

function adminFileHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (API_URL.includes("ngrok")) headers["ngrok-skip-browser-warning"] = "1";
  return headers;
}

async function adminFileFetch(
  path: string,
  disposition: DocumentDisposition
): Promise<Blob> {
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set("disposition", disposition);

  const res = await fetch(url.toString(), { headers: adminFileHeaders() });

  if (res.status === 401) {
    clearAdminToken();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/admin/login";
    }
    throw new Error("Session expirée");
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string; detail?: string };
      message = body.detail || body.message || message;
    } catch {
      // binary or empty body
    }
    if (res.status === 503 && message.toLowerCase().includes("dropbox")) {
      throw new Error(message);
    }
    throw new Error(message || "Échec du téléchargement");
  }

  return res.blob();
}

export function memberDocumentFilePath(
  applicationId: number,
  documentId: number
): string {
  return `/admin/applications/${applicationId}/documents/${documentId}/file`;
}

export function summaryPdfPath(applicationId: number): string {
  return `/admin/applications/${applicationId}/summary.pdf`;
}

export function fetchMemberDocumentBlob(
  applicationId: number,
  documentId: number,
  disposition: DocumentDisposition = "inline"
): Promise<Blob> {
  return adminFileFetch(memberDocumentFilePath(applicationId, documentId), disposition);
}

export function fetchSummaryPdfBlob(
  applicationId: number,
  disposition: DocumentDisposition = "inline"
): Promise<Blob> {
  return adminFileFetch(summaryPdfPath(applicationId), disposition);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
