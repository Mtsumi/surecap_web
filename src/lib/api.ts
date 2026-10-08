import { ClientNetworkError, isClientNetworkError } from "./clientFetchError";
import {
  isRetryableUploadError,
  sleep,
  uploadNetworkErrorMessage,
  uploadTimeoutErrorMessage,
} from "./uploadErrors";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Building = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type UnitAmenityValue = boolean | number | string;

export type Unit = {
  id: number;
  building_id: number;
  unit_number: string;
  civic_number: string | null;
  rent: number | null;
  available_date: string | null;
  earliest_move_in_date: string;
    amenities?: Record<string, UnitAmenityValue> | null;
};

export type Listing = {
  id: number;
  unit_number: string;
  civic_number: string | null;
  rent: number | null;
  available_date: string | null;
  earliest_move_in_date: string;
  amenities?: Record<string, UnitAmenityValue> | null;
  /** Real unit photos when present; otherwise the UI uses placeholders. */
  photos?: string[] | null;
  building: Building;
};

export type LocaleCode = "fr" | "en";

export type Application = {
  id: number;
  unit_id: number;
  status: string;
  given_name: string | null;
  family_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  current_address: string | null;
  current_apartment: string | null;
  current_place_id: string | null;
  address_not_in_canada: boolean | null;
  previous_address: string | null;
  previous_apartment: string | null;
  previous_place_id: string | null;
  current_address_lived_from: string | null;
  current_address_lived_to: string | null;
  previous_address_lived_from: string | null;
  previous_address_lived_to: string | null;
  lease_in_name: boolean | null;
  housing_status?: "renting" | "own_home" | null;
  move_in_date: string | null;
  renting_with_others: boolean | null;
  landlord_phone: string | null;
  hr_phone: string | null;
  landlord_name: string | null;
  hr_name: string | null;
  employer_name: string | null;
  previous_landlord_phone: string | null;
  previous_landlord_name: string | null;
  no_previous_landlord_contact?: boolean;
  landlord_email: string | null;
  hr_email: string | null;
  referral_source: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  employment_type: string | null;
  monthly_net_income: number | null;
  additional_income_kind?: string | null;
  additional_monthly_net_income?: number | null;
  created_at: string;
  updated_at: string;
  primary_member_id?: number | null;
  upload_token?: string | null;
};

export type MemberDocument = {
  id: number;
  application_member_id: number;
  document_type: string;
  dropbox_path: string;
  original_filename: string;
  content_type: string;
  byte_size: number;
  uploaded_at: string;
  upload_generation?: number;
  quality_level?: "ok" | "warn" | "fail" | null;
  quality_flags?: string[];
  /** Client-only: last upload API message (not returned by list endpoints). */
  quality_message?: string | null;
  quality_checked_at?: string | null;
};

export type UploadQuality = {
  level: "ok" | "warn" | "fail";
  flags: string[];
  message?: string | null;
  upload_generation: number;
};

export type MemberDocumentUploadResult = {
  document: MemberDocument;
  quality: UploadQuality;
};

export type RoommateContact = {
  name: string;
  email: string;
};

export type GuarantorContact = {
  name: string;
  email: string;
  phone: string;
};

export type ApplicationUpdate = Partial<{
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_apartment?: string;
  current_place_id: string;
  address_not_in_canada: boolean;
  previous_address: string;
  previous_apartment?: string;
  previous_place_id: string;
  current_address_lived_from: string;
  current_address_lived_to: string;
  previous_address_lived_from: string;
  previous_address_lived_to: string;
  lease_in_name: boolean;
  housing_status?: "renting" | "own_home" | null;
  move_in_date: string;
  renting_with_others: boolean;
  landlord_phone: string | null;
  hr_phone: string;
  landlord_name: string | null;
  hr_name: string;
  employer_name?: string;
  previous_landlord_phone?: string | null;
  previous_landlord_name?: string | null;
  no_previous_landlord_contact?: boolean;
  landlord_email?: string | null;
  hr_email?: string;
  referral_source: string;
  facebook_url: string;
  linkedin_url: string;
  employment_type: "employed" | "self_employed" | "other" | "no_income" | "guarantor_pays";
  monthly_net_income: number;
  additional_income_kind?: "government_benefits" | "other" | null;
  additional_monthly_net_income?: number | null;
  preferred_locale?: "en" | "fr";
  roommates: RoommateContact[];
  guarantor: GuarantorContact | null;
}>;

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T | null;
};

export type ApiValidationErrorItem = {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: unknown;
};

export class ApiError extends Error {
  readonly validationErrors: ApiValidationErrorItem[];
  /** HTTP status code, 0 when unknown. */
  readonly status: number;

  constructor(
    message: string,
    validationErrors: ApiValidationErrorItem[] = [],
    status = 0
  ) {
    super(message);
    this.name = "ApiError";
    this.validationErrors = validationErrors;
    this.status = status;
  }
}

function extractValidationErrors(data: unknown): ApiValidationErrorItem[] {
  if (!data || typeof data !== "object") return [];
  const errors = (data as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];
  return errors.filter(
    (item): item is ApiValidationErrorItem =>
      typeof item === "object" &&
      item !== null &&
      Array.isArray((item as ApiValidationErrorItem).loc)
  );
}

function apiHeaders(init?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (API_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "1";
  }
  return headers;
}

/** Safari/WebKit often surfaces network/body-limit failures as "Load failed". */
function isNetworkFetchError(error: unknown): boolean {
  return isClientNetworkError(error);
}

function jsonNetworkError(): Error {
  return new ClientNetworkError();
}

function networkFetchError(detail?: string): Error {
  // Keep upload-specific copy so isRetryableUploadError still matches and UI shows guidance.
  return new Error(uploadNetworkErrorMessage(detail));
}

/** Map stale-backend upload errors to a clearer message on mobile. */
export function formatUploadErrorMessage(message: string): string {
  if (message.includes("Unknown document type: pay_slip_3")) {
    return "The server is not updated for the third payslip slot yet. Ask ops to redeploy the API, then try again.";
  }
  return message;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: apiHeaders(init),
    });
  } catch (error) {
    if (isNetworkFetchError(error)) throw jsonNetworkError();
    throw error;
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new ApiError(
      body?.message || res.statusText,
      extractValidationErrors(body?.data),
      res.status
    );
  }

  if (!body || body.data === null || body.data === undefined) {
    throw new Error(body?.message || "Empty API response");
  }

  return body.data;
}

async function apiFetchVoid(path: string, init?: RequestInit): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: apiHeaders(init),
    });
  } catch (error) {
    if (isNetworkFetchError(error)) throw jsonNetworkError();
    throw error;
  }

  if (res.status === 204) {
    return;
  }

  let body: ApiEnvelope<unknown> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<unknown>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    throw new ApiError(
      body?.message || res.statusText,
      extractValidationErrors(body?.data)
    );
  }
}

function formDataFileLabel(form: FormData): string | undefined {
  const value = form.get("file");
  if (!(value instanceof File)) return undefined;
  const kb = Math.max(1, Math.round(value.size / 1024));
  return `${value.name || "file"} · ${kb} KB · ${value.type || "unknown"}`;
}

async function postUploadForm<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (API_URL.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "1";
  }

  const fileLabel = formDataFileLabel(form);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 90_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(uploadTimeoutErrorMessage(fileLabel));
    }
    if (isNetworkFetchError(error)) throw networkFetchError(fileLabel);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok || body?.status === "error") {
    const fallback =
      res.status === 413
        ? "File too large for the server (limit about 10 MB). Try a smaller PDF or photo."
        : res.statusText || `Upload failed (${res.status})`;
    throw new ApiError(
      body?.message || fallback,
      extractValidationErrors(body?.data)
    );
  }
  if (!body || body.data === null || body.data === undefined) {
    throw new Error(body?.message || "Empty API response");
  }
  return body.data;
}

async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  try {
    return await postUploadForm<T>(path, form);
  } catch (error) {
    if (!isRetryableUploadError(error)) throw error;
    await sleep(1500);
    return postUploadForm<T>(path, form);
  }
}

export type AddressPrediction = {
  place_id: string;
  description: string;
};

export type AddressDetails = {
  place_id: string;
  formatted_address: string;
};

export function suggestAddresses(
  query: string,
  opts: { sessionToken: string; language: LocaleCode }
): Promise<{ predictions: AddressPrediction[] }> {
  const params = new URLSearchParams({
    q: query,
    sessiontoken: opts.sessionToken,
    language: opts.language,
  });
  return apiFetch<{ predictions: AddressPrediction[] }>(
    `/public/address-suggest?${params.toString()}`
  );
}

export function fetchAddressDetails(
  placeId: string,
  opts: { sessionToken: string; language: LocaleCode }
): Promise<AddressDetails> {
  const params = new URLSearchParams({
    place_id: placeId,
    sessiontoken: opts.sessionToken,
    language: opts.language,
  });
  return apiFetch<AddressDetails>(`/public/address-details?${params.toString()}`);
}

export function fetchBuildings(): Promise<Building[]> {
  return apiFetch<Building[]>("/buildings");
}

export function fetchUnits(buildingId: number): Promise<Unit[]> {
  return apiFetch<Unit[]>(`/buildings/${buildingId}/units`);
}

export function fetchListings(): Promise<Listing[]> {
  return apiFetch<Listing[]>("/listings");
}

export type ApplicationSubmit = ApplicationUpdate & {
  unit_id: number;
  roommates: RoommateContact[];
  guarantor: GuarantorContact | null;
};

/** @deprecated Use submitApplicationById after creating a draft. */
export function submitApplication(payload: ApplicationSubmit): Promise<Application> {
  return apiFetch<Application>("/applications/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createApplicationDraft(unitId: number): Promise<Application> {
  return apiFetch<Application>("/applications", {
    method: "POST",
    body: JSON.stringify({ unit_id: unitId }),
  });
}

export function updateApplication(
  id: number,
  uploadToken: string,
  payload: ApplicationUpdate
): Promise<Application> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<Application>(`/applications/${id}?${params}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function submitApplicationById(
  id: number,
  uploadToken: string,
  body?: { preferred_locale?: "en" | "fr" }
): Promise<Application> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<Application>(`/applications/${id}/submit?${params}`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export type InviteContext = {
  application_id: number;
  member_id: number;
  role: "roommate" | "guarantor";
  member_status: string;
  upload_token: string | null;
  invited_name: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  primary_name: string;
  building_name: string;
  unit_number: string;
  building_address: string;
  move_in_date: string | null;
  has_guarantor: boolean;
};

export type InviteeSubmitPayload = {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_apartment?: string;
  current_place_id?: string;
  address_not_in_canada?: boolean;
  previous_address?: string;
  previous_apartment?: string;
  previous_place_id?: string;
  current_address_lived_from: string;
  current_address_lived_to?: string;
  previous_address_lived_from?: string;
  previous_address_lived_to?: string;
  lease_in_name?: boolean;
  housing_status?: "renting" | "own_home" | null;
  move_in_date?: string;
  landlord_phone?: string;
  hr_phone?: string;
  landlord_name?: string;
  hr_name?: string;
  employer_name?: string;
  previous_landlord_phone?: string;
  previous_landlord_name?: string;
  no_previous_landlord_contact?: boolean;
  referral_source?: string;
  facebook_url?: string;
  linkedin_url?: string;
  employment_type: "employed" | "self_employed" | "other" | "no_income" | "guarantor_pays";
  monthly_net_income: number;
  additional_income_kind?: "government_benefits" | "other";
  additional_monthly_net_income?: number;
  preferred_locale?: "en" | "fr";
  identity_visited_or_met?: boolean;
};

export type InviteeSubmitResult = {
  application_id: number;
  member_id: number;
  role: string;
  member_status: string;
  application_status: string;
  upload_token?: string | null;
};

export function fetchInvite(token: string): Promise<InviteContext> {
  return apiFetch<InviteContext>(`/applications/invites/${encodeURIComponent(token)}`);
}

export type AddGuarantorContext = {
  application_id: number;
  status: string;
  building_name: string;
  building_address: string;
  unit_number: string;
  primary_name: string;
  has_guarantor: boolean;
  janitor_email?: string | null;
  janitor_phone?: string | null;
};

export function fetchAddGuarantor(token: string): Promise<AddGuarantorContext> {
  return apiFetch<AddGuarantorContext>(
    `/applications/add-guarantor/${encodeURIComponent(token)}`
  );
}

export function submitAddGuarantor(
  token: string,
  payload: GuarantorContact
): Promise<{ application_id: number; has_guarantor: boolean }> {
  return apiFetch<{ application_id: number; has_guarantor: boolean }>(
    `/applications/add-guarantor/${encodeURIComponent(token)}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function reissueInviteUploadToken(
  token: string
): Promise<{ upload_token: string }> {
  return apiFetch<{ upload_token: string }>(
    `/applications/invites/${encodeURIComponent(token)}/upload-token`,
    { method: "POST" }
  );
}

export function submitInvite(
  token: string,
  payload: InviteeSubmitPayload
): Promise<InviteeSubmitResult> {
  return apiFetch<InviteeSubmitResult>(
    `/applications/invites/${encodeURIComponent(token)}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export type CreditConsent = {
  signed: boolean;
};

export function fetchCreditConsent(
  applicationId: number,
  uploadToken: string
): Promise<CreditConsent> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<CreditConsent>(
    `/applications/${applicationId}/credit-consent?${params}`
  );
}

export function signCreditConsent(
  applicationId: number,
  uploadToken: string,
  signaturePngBase64: string
): Promise<CreditConsent> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<CreditConsent>(
    `/applications/${applicationId}/credit-consent?${params}`,
    {
      method: "POST",
      body: JSON.stringify({ signature_png_base64: signaturePngBase64 }),
    }
  );
}

export function fetchInviteCreditConsent(token: string): Promise<CreditConsent> {
  return apiFetch<CreditConsent>(
    `/applications/invites/${encodeURIComponent(token)}/credit-consent`
  );
}

export function signInviteCreditConsent(
  token: string,
  payload: InviteeSubmitPayload,
  signaturePngBase64: string
): Promise<CreditConsent> {
  return apiFetch<CreditConsent>(
    `/applications/invites/${encodeURIComponent(token)}/credit-consent`,
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        signature_png_base64: signaturePngBase64,
      }),
    }
  );
}

export function uploadMemberDocument(
  applicationId: number,
  memberId: number,
  uploadToken: string,
  documentType: string,
  file: File
): Promise<MemberDocumentUploadResult> {
  const form = new FormData();
  form.append("upload_token", uploadToken);
  form.append("document_type", documentType);
  form.append("file", file, file.name || "upload");
  return apiFetchForm<MemberDocumentUploadResult>(
    `/applications/${applicationId}/members/${memberId}/uploads`,
    form
  );
}

export function uploadInviteDocument(
  inviteToken: string,
  documentType: string,
  file: File
): Promise<MemberDocumentUploadResult> {
  const form = new FormData();
  form.append("document_type", documentType);
  form.append("file", file, file.name || "upload");
  return apiFetchForm<MemberDocumentUploadResult>(
    `/applications/invites/${encodeURIComponent(inviteToken)}/uploads`,
    form
  );
}

export function listMemberDocuments(
  applicationId: number,
  memberId: number,
  uploadToken: string
): Promise<MemberDocument[]> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetch<MemberDocument[]>(
    `/applications/${applicationId}/members/${memberId}/uploads?${params}`
  );
}

export function listInviteDocuments(inviteToken: string): Promise<MemberDocument[]> {
  return apiFetch<MemberDocument[]>(
    `/applications/invites/${encodeURIComponent(inviteToken)}/uploads`
  );
}

export function deleteMemberDocument(
  applicationId: number,
  memberId: number,
  uploadToken: string,
  documentType: string
): Promise<void> {
  const params = new URLSearchParams({ upload_token: uploadToken });
  return apiFetchVoid(
    `/applications/${applicationId}/members/${memberId}/uploads/${encodeURIComponent(documentType)}?${params}`,
    { method: "DELETE" }
  );
}

export function deleteInviteDocument(
  inviteToken: string,
  documentType: string
): Promise<void> {
  return apiFetchVoid(
    `/applications/invites/${encodeURIComponent(inviteToken)}/uploads/${encodeURIComponent(documentType)}`,
    { method: "DELETE" }
  );
}

export type JanitorReviewStage = "janitor" | "steve" | "done";

export type MemberIdentityStatus = {
  applies: boolean;
  ready_for_accept: boolean;
  id_document_id?: number | null;
  selfie_document_id?: number | null;
  id_viewed: boolean;
  met_in_person?: boolean | null;
  visited_or_met?: boolean | null;
  selfie_requested: boolean;
  selfie_uploaded: boolean;
  selfie_accepted?: boolean;
  match_status?: string | null;
  match_notes?: string | null;
  blocking_reason?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
};

export type ApplicationIdentityGate = {
  ready_for_accept: boolean;
  blockers: Array<{ member_id: number; name: string; reason: string }>;
  match_flags: Array<{
    member_id: number;
    name: string;
    match_status: string;
    notes?: string | null;
  }>;
};

export type JanitorReviewMember = {
  id: number;
  role: string;
  name: string;
  landlord_name?: string | null;
  landlord_phone?: string | null;
  previous_landlord_name?: string | null;
  previous_landlord_phone?: string | null;
  no_previous_landlord_contact?: boolean;
  hr_name?: string | null;
  hr_phone?: string | null;
  employer_name?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  credit_consent_document_id?: number | null;
  identity?: MemberIdentityStatus | null;
};

export type JanitorReviewChecklist = {
  called_employer: boolean;
  checked_social: boolean;
};

export type JanitorReview = {
  stage: JanitorReviewStage;
  status: string;
  application_id: number;
  building_name: string;
  building_address: string;
  unit_number: string;
  members: JanitorReviewMember[];
  checklist: JanitorReviewChecklist | null;
  rejection_reason?: string | null;
  rejection_email_subject?: string | null;
  rejection_email_body?: string | null;
  rejection_email_locale?: string | null;
  rejection_email_sent_at?: string | null;
  has_guarantor?: boolean;
  guarantor_offer_sent_at?: string | null;
  token_expired: boolean;
  identity?: ApplicationIdentityGate | null;
};

export type RejectionEmailDraft = {
  locale: "fr" | "en";
  subject: string;
  body: string;
  applicant_name: string;
  applicant_email: string | null;
  janitor_email: string | null;
  janitor_phone: string | null;
  cc_janitor: boolean;
  default_locale: "fr" | "en";
};

export type JanitorReviewAction =
  | "request_credit_check"
  | "accept"
  | "reject"
  | "offer_guarantor";

export function fetchJanitorReview(token: string): Promise<JanitorReview> {
  return apiFetch<JanitorReview>(
    `/admin/janitor-review/${encodeURIComponent(token)}`
  );
}

export function fetchReviewRejectionEmailDraft(
  token: string,
  opts?: { locale?: "fr" | "en"; reason?: string }
): Promise<RejectionEmailDraft> {
  const params = new URLSearchParams();
  if (opts?.locale) params.set("locale", opts.locale);
  if (opts?.reason) params.set("reason", opts.reason);
  const q = params.toString();
  return apiFetch<RejectionEmailDraft>(
    `/admin/janitor-review/${encodeURIComponent(token)}/rejection-email-draft${
      q ? `?${q}` : ""
    }`
  );
}

export function fetchReviewGuarantorOfferEmailDraft(
  token: string,
  opts?: { locale?: "fr" | "en" }
): Promise<RejectionEmailDraft> {
  const params = new URLSearchParams();
  if (opts?.locale) params.set("locale", opts.locale);
  const q = params.toString();
  return apiFetch<RejectionEmailDraft>(
    `/admin/janitor-review/${encodeURIComponent(token)}/guarantor-offer-email-draft${
      q ? `?${q}` : ""
    }`
  );
}

export function reviewCreditConsentPath(token: string, documentId: number): string {
  return `/admin/janitor-review/${encodeURIComponent(token)}/documents/${documentId}/file`;
}

export async function fetchReviewDocumentBlob(
  token: string,
  documentId: number,
  disposition: "inline" | "attachment" = "inline"
): Promise<Blob> {
  const url = new URL(`${API_URL}${reviewCreditConsentPath(token, documentId)}`);
  url.searchParams.set("disposition", disposition);
  const headers: Record<string, string> = {};
  if (API_URL.includes("ngrok")) headers["ngrok-skip-browser-warning"] = "1";
  let res: Response;
  try {
    res = await fetch(url.toString(), { headers });
  } catch (error) {
    if (isClientNetworkError(error)) throw new ClientNetworkError();
    throw error;
  }
  if (!res.ok) {
    throw new Error("Impossible d'ouvrir le document.");
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error("Fichier vide ou introuvable");
  }
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return new Blob([buffer], { type: contentType });
}

/** @deprecated Prefer fetchReviewDocumentBlob — kept for credit consent callers. */
export async function fetchReviewCreditConsentBlob(
  token: string,
  documentId: number,
  disposition: "inline" | "attachment" = "inline"
): Promise<Blob> {
  return fetchReviewDocumentBlob(token, documentId, disposition);
}

export function submitJanitorReview(
  token: string,
  payload: {
    action: JanitorReviewAction;
    checklist?: JanitorReviewChecklist;
    reason?: string;
    locale?: "fr" | "en";
    email_subject?: string;
    email_body?: string;
  }
): Promise<JanitorReview> {
  return apiFetch<JanitorReview>(
    `/admin/janitor-review/${encodeURIComponent(token)}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function confirmReviewMemberIdentity(
  token: string,
  memberId: number,
  metInPerson: boolean,
  options?: { idPhotoMatches?: boolean; selfieMatches?: boolean }
): Promise<JanitorReview> {
  return apiFetch<JanitorReview>(
    `/admin/janitor-review/${encodeURIComponent(token)}/members/${memberId}/identity`,
    {
      method: "POST",
      body: JSON.stringify({
        met_in_person: options?.selfieMatches ? false : metInPerson,
        ...(metInPerson && !options?.selfieMatches
          ? { id_photo_matches: options?.idPhotoMatches === true }
          : {}),
        ...(options?.selfieMatches ? { selfie_matches: true } : {}),
      }),
    }
  );
}

export type IdentitySelfieContext = {
  member_name: string;
  locale: "en" | "fr";
  selfie_uploaded: boolean;
  application_closed: boolean;
};

export function fetchIdentitySelfieContext(
  token: string
): Promise<IdentitySelfieContext> {
  return apiFetch<IdentitySelfieContext>(
    `/applications/identity-selfie/${encodeURIComponent(token)}`
  );
}

export async function uploadIdentitySelfie(
  token: string,
  file: File
): Promise<IdentitySelfieContext> {
  const form = new FormData();
  form.append("file", file);
  return apiFetchForm<IdentitySelfieContext>(
    `/applications/identity-selfie/${encodeURIComponent(token)}`,
    form
  );
}
