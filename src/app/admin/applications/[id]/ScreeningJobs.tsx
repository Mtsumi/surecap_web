"use client";

import {
  formatJobMessagePreview,
  formatSearchAddress,
  formatTalScreeningPreview,
  idExtractFlagLabel,
  idScreeningContextLabel,
  incomeExtractFlagLabel,
  landlordFromDossier,
  parseIdDocumentExtractMessage,
  parseIncomeDocumentExtractMessage,
  parseSoquijScreeningMessage,
  parseTalScreeningMessage,
  precisionLabel,
  pluralCount,
  sourceLabel,
  tenantFromDossier,
  jobTypeLabel,
  type SoquijDecision,
  type TalDossier,
  type TalSearch,
} from "@/lib/jobMessageFormat";
import type { ApplicationJob } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
import {
  inconclusiveReviewBody,
  inconclusiveReviewTitle,
  incomeSlipSlotLabel,
  isIdExtractInconclusive,
  isIncomeExtractInconclusive,
  slipRecognizedLabel,
} from "@/lib/documentExtractReview";
import type { Locale } from "@/lib/i18n";
import { useAdminLocaleContext } from "../../AdminLocaleContext";

function jobStatusClass(status: string): string {
  switch (status) {
    case "completed":
      return "admin-status admin-status-accepted";
    case "failed":
      return "admin-status admin-status-rejected";
    case "skipped":
      return "admin-status admin-status-draft";
    case "running":
      return "admin-status admin-status-collecting";
    default:
      return "admin-status admin-status-submitted";
  }
}

function copy(locale: Locale) {
  if (locale === "en") {
    return {
      noJobs: "No jobs for this application.",
      applicant: "Applicant",
      openTal: "Open on TAL ↗",
      tenantMatches: "Tenant matches",
      landlordMentions: "Landlord mentions",
      otherDossiers: (n: number) =>
        `${pluralCount(n, "other dossier", "other dossiers")} with no applicant mention`,
      noDossiers: "No dossiers found",
      dossiers: (n: number) => pluralCount(n, "dossier", "dossiers"),
      tenants: (n: number) => pluralCount(n, "tenant", "tenants"),
      landlords: (n: number) => pluralCount(n, "landlord", "landlords"),
      roleTenant: "tenant",
      roleLandlord: "landlord",
      detailSkipped: "Detail page not loaded",
      detailError: "Detail page error",
      detailTruncated: "Building search truncated — some dossier details were skipped",
      idCheck: "ID verification",
      idAddressesUsed: "ID addresses used for TAL",
      extractedAddresses: "Extracted addresses",
      notUsedForTal: "not used for TAL",
      blur: "Blur",
      front: "front",
      back: "back",
      nameRead: "Name read",
      name: "Name",
      formMismatch: "≠ form",
      formDiffers: "differs from form",
      incomeTitle: "Payslip check",
      incomeReadPath: "Read path",
      incomeEmployee: "Employee (slip)",
      incomeEmployer: "Employer (slip)",
      incomeNet: "Net pay",
      incomeGross: "Gross",
      incomeRateHours: "Rate / hours",
      incomePeriod: "Pay period",
      incomePayDate: "Pay date",
      incomeNotPayslip: "Not recognized as a payslip",
      soquijOpen: "Open ↗",
      soquijSearchFailed: "Search failed",
      soquijNoDecisions: "No published written decisions found",
      soquijFound: (n: number) => `${n} published decision(s) found — review recommended`,
      soquijMore: (n: number) => `+${n} more not shown`,
      soquijMock: "Simulation mode",
      soquijQuery: "Query",
    };
  }
  return {
    noJobs: "Aucune tâche pour cette demande.",
    applicant: "Demandeur",
    openTal: "Ouvrir sur le TAL ↗",
    tenantMatches: "Correspondances locataire",
    landlordMentions: "Mentions locateur",
    otherDossiers: (n: number) =>
      `${pluralCount(n, "autre dossier", "autres dossiers")} sans mention du demandeur`,
    noDossiers: "Aucun dossier trouvé",
    dossiers: (n: number) => pluralCount(n, "dossier", "dossiers"),
    tenants: (n: number) => pluralCount(n, "locataire", "locataires"),
    landlords: (n: number) => pluralCount(n, "locateur", "locateurs"),
    roleTenant: "locataire",
    roleLandlord: "locateur",
    detailSkipped: "Page détail non chargée",
    detailError: "Erreur page détail",
    detailTruncated:
      "Recherche immeuble tronquée — certains détails de dossiers ont été omis",
    idCheck: "Vérification pièce d'identité",
    idAddressesUsed: "Adresses ID utilisées pour TAL",
    extractedAddresses: "Adresses extraites",
    notUsedForTal: "non utilisée pour TAL",
    blur: "Flou",
    front: "recto",
    back: "verso",
    nameRead: "Nom lu",
    name: "Nom",
    formMismatch: "≠ formulaire",
    formDiffers: "différent du formulaire",
    incomeTitle: "Vérification talon de paie",
    incomeReadPath: "Lecture",
    incomeEmployee: "Employé (talon)",
    incomeEmployer: "Employeur (talon)",
    incomeNet: "Paie nette",
    incomeGross: "Brut",
    incomeRateHours: "Taux / heures",
    incomePeriod: "Période",
    incomePayDate: "Date de paie",
    incomeNotPayslip: "Non reconnu comme talon de paie",
    soquijOpen: "Ouvrir ↗",
    soquijSearchFailed: "Échec de la recherche",
    soquijNoDecisions: "Aucune décision écrite publiée trouvée",
    soquijFound: (n: number) => `${n} décision(s) publiée(s) trouvée(s) — révision recommandée`,
    soquijMore: (n: number) => `+${n} autre(s) non affichée(s)`,
    soquijMock: "Mode simulation",
    soquijQuery: "Recherche",
  };
}

function DossierRow({
  dossier,
  kind,
  locale,
}: {
  dossier: TalDossier;
  kind: "tenant" | "landlord" | "other";
  locale: Locale;
}) {
  const c = copy(locale);
  const mark = kind === "tenant" ? "✓" : kind === "landlord" ? "◈" : "·";
  const emphasis =
    kind === "tenant"
      ? "font-medium text-[var(--ml-pine)]"
      : kind === "landlord"
        ? "font-medium text-[var(--ml-ink)]"
        : "text-[var(--ml-steel)]";
  const label =
    kind === "tenant"
      ? tenantFromDossier(dossier)
      : kind === "landlord"
        ? landlordFromDossier(dossier)
        : tenantFromDossier(dossier);
  const roleHint =
    kind === "tenant" ? c.roleTenant : kind === "landlord" ? c.roleLandlord : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ml-line)] bg-[var(--ml-card)] px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={emphasis}>
          {mark} {dossier.dossier || "—"}
        </span>
        {roleHint ? (
          <span className="admin-field-label !normal-case !tracking-normal">{roleHint}</span>
        ) : null}
        {label ? <span className="truncate text-[var(--ml-ink)]">{label}</span> : null}
        {dossier.case_status ? (
          <span className="text-xs text-[var(--ml-steel)]">{dossier.case_status}</span>
        ) : null}
        {dossier.detail_skipped ? (
          <span className="text-xs text-[var(--ml-steel)]">{c.detailSkipped}</span>
        ) : null}
        {dossier.detail_error ? (
          <span className={`${adminUi.alertWarn} !inline !border-0 !bg-transparent !p-0 text-xs`}>
            {c.detailError}: {dossier.detail_error}
          </span>
        ) : null}
      </div>
      {dossier.detail_url ? (
        <a
          href={dossier.detail_url}
          target="_blank"
          rel="noreferrer"
          className={adminUi.talLink}
        >
          {c.openTal}
        </a>
      ) : null}
    </li>
  );
}

function SearchBlock({ search, locale }: { search: TalSearch; locale: Locale }) {
  const c = copy(locale);
  const dossiers = search.dossiers || [];
  const tenants = dossiers.filter((d) => d.name_match === true);
  const landlords = dossiers.filter(
    (d) => d.landlord_match === true && d.name_match !== true
  );
  const others = dossiers.filter(
    (d) => d.name_match !== true && d.landlord_match !== true
  );
  const dossierCount = search.dossier_count ?? dossiers.length;
  const addressLine = formatSearchAddress(search.input, locale);

  return (
    <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3">
      <div className="text-sm font-semibold text-[var(--ml-ink)]">
        {sourceLabel(search.source, locale)}{" "}
        <span className="font-normal text-[var(--ml-steel)]">
          ({precisionLabel(search.search_precision, locale)})
        </span>
      </div>
      {addressLine ? (
        <p className="mt-0.5 text-sm text-[var(--ml-ink)]">{addressLine}</p>
      ) : null}
      {search.status !== "completed" ? (
        <p className={`${adminUi.alertWarn} mt-2 !border-0 !bg-transparent !p-0`}>
          {search.reason || search.status}
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-[var(--ml-steel)]">
            {c.dossiers(dossierCount)}
            {typeof search.name_match_count === "number"
              ? ` · ${c.tenants(search.name_match_count)}`
              : null}
            {typeof search.landlord_mention_count === "number" &&
            search.landlord_mention_count > 0
              ? ` · ${c.landlords(search.landlord_mention_count)}`
              : null}
            {typeof search.elapsed_seconds === "number"
              ? ` · ~${Math.round(search.elapsed_seconds)}s`
              : null}
          </p>
          {search.building_detail_truncated ? (
            <p className={`${adminUi.alertWarn} mt-2 !border-0 !bg-transparent !p-0 text-xs`}>
              {c.detailTruncated}
            </p>
          ) : null}
          {dossierCount === 0 && tenants.length === 0 && landlords.length === 0 ? (
            <p className={`${adminUi.empty} mt-2`}>{c.noDossiers}</p>
          ) : null}
          {tenants.length > 0 ? (
            <div className="mt-3">
              <p className="admin-field-label">{c.tenantMatches}</p>
              <ul className="mt-1.5 space-y-2">
                {tenants.map((d) => (
                  <DossierRow
                    key={`t-${d.dossier}`}
                    dossier={d}
                    kind="tenant"
                    locale={locale}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {landlords.length > 0 ? (
            <div className="mt-3">
              <p className="admin-field-label">{c.landlordMentions}</p>
              <ul className="mt-1.5 space-y-2">
                {landlords.map((d) => (
                  <DossierRow
                    key={`l-${d.dossier}`}
                    dossier={d}
                    kind="landlord"
                    locale={locale}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {others.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-[var(--ml-steel)]">
                {c.otherDossiers(others.length)}
              </summary>
              <ul className="mt-1 space-y-1">
                {others.map((d) => (
                  <DossierRow
                    key={`o-${d.dossier}`}
                    dossier={d}
                    kind="other"
                    locale={locale}
                  />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

function ManualReviewBanner({
  kind,
  locale,
  docsAnchor,
}: {
  kind: "income" | "id";
  locale: Locale;
  docsAnchor?: string;
}) {
  return (
    <div className={`${adminUi.alertWarn} text-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--ml-ink)]">
            {inconclusiveReviewTitle(locale)}
          </p>
          <p className="mt-1 text-[var(--ml-steel)]">{inconclusiveReviewBody(kind, locale)}</p>
        </div>
        {docsAnchor ? (
          <a
            href={docsAnchor}
            className="shrink-0 text-xs font-medium text-[var(--ml-accent)] underline-offset-2 hover:underline"
          >
            {locale === "fr" ? "Voir le document ↓" : "Review document ↓"}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function IdExtractFlags({
  summary,
  locale,
  docsAnchor,
}: {
  summary: NonNullable<ReturnType<typeof parseTalScreeningMessage>>["id_extract"];
  locale: Locale;
  docsAnchor?: string;
}) {
  if (!summary) return null;
  const c = copy(locale);
  const flags = summary.flags || [];
  const inconclusive = isIdExtractInconclusive(summary);
  return (
    <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-card)] p-3 text-sm">
      {inconclusive ? (
        <div className="mb-3">
          <ManualReviewBanner kind="id" locale={locale} docsAnchor={docsAnchor} />
        </div>
      ) : null}
      <p className="font-semibold text-[var(--ml-ink)]">{c.idCheck}</p>
      <p className="mt-1 text-[var(--ml-steel)]">
        {idScreeningContextLabel(summary.screening_context, locale)}
        {summary.pdf417_ok ? ` · PDF417 (${summary.pdf417_variant || "ok"})` : ""}
      </p>
      {(summary.ocr_name || summary.barcode_name) && (
        <p className="mt-2 text-[var(--ml-ink)]">
          {c.nameRead}: {summary.barcode_name || summary.ocr_name}
          {summary.name_mismatch ? (
            <span className={`${adminUi.alertWarn} ml-2 !inline !border-0 !bg-transparent !p-0`}>
              {c.formMismatch}
            </span>
          ) : null}
        </p>
      )}
      {summary.address_sources && summary.address_sources.length > 0 ? (
        <p className="mt-1 text-xs text-[var(--ml-steel)]">
          {c.idAddressesUsed}:{" "}
          {summary.address_sources.map((s) => sourceLabel(s, locale)).join(" · ")}
        </p>
      ) : null}
      {flags.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-[var(--ml-steel)]">
          {flags.map((flag) => (
            <li key={flag}>• {idExtractFlagLabel(flag, locale)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function IdExtractJobCard({
  job,
  locale,
  docsAnchor,
}: {
  job: ApplicationJob;
  locale: Locale;
  docsAnchor?: string;
}) {
  const c = copy(locale);
  const payload = parseIdDocumentExtractMessage(job.message);
  if (!payload) {
    return (
      <p className={adminUi.empty}>
        {formatJobMessagePreview(job.job_type, job.message, locale)}
      </p>
    );
  }
  const flags = payload.flags || [];
  const inconclusive = isIdExtractInconclusive(payload);
  return (
    <div className="space-y-3 text-sm">
      {inconclusive ? <ManualReviewBanner kind="id" locale={locale} docsAnchor={docsAnchor} /> : null}
      <p className="text-[var(--ml-steel)]">
        {idScreeningContextLabel(payload.screening_context, locale)}
        {payload.pdf417_ok ? ` · PDF417 (${payload.pdf417_variant || "ok"})` : ""}
      </p>
      {(payload.ocr_name || payload.barcode_name) && (
        <p className="text-[var(--ml-ink)]">
          {c.name}: {payload.barcode_name || payload.ocr_name}
          {payload.name_mismatch ? (
            <span className={`${adminUi.alertWarn} ml-2 !inline !border-0 !bg-transparent !p-0`}>
              {c.formDiffers}
            </span>
          ) : null}
        </p>
      )}
      {payload.addresses && payload.addresses.length > 0 ? (
        <div>
          <p className="admin-field-label">{c.extractedAddresses}</p>
          <ul className="mt-1 space-y-1 text-[var(--ml-ink)]">
            {payload.addresses.map((addr) => (
              <li key={`${addr.source}-${addr.raw_address}`}>
                {sourceLabel(addr.source, locale)} — {addr.raw_address}
                {addr.tal_ready ? "" : ` (${c.notUsedForTal})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {(payload.blur_front || payload.blur_back) && (
        <p className="text-xs text-[var(--ml-steel)]">
          {c.blur}: {c.front} {payload.blur_front?.quality || "—"} · {c.back}{" "}
          {payload.blur_back?.quality || "—"}
        </p>
      )}
      {flags.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--ml-steel)]">
          {flags.map((flag) => (
            <li key={flag}>• {idExtractFlagLabel(flag, locale)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function IncomeExtractJobCard({
  job,
  locale,
  docsAnchor,
}: {
  job: ApplicationJob;
  locale: Locale;
  docsAnchor?: string;
}) {
  const c = copy(locale);
  const payload = parseIncomeDocumentExtractMessage(job.message);
  if (!payload) {
    return (
      <p className={adminUi.empty}>
        {formatJobMessagePreview(job.job_type, job.message, locale)}
      </p>
    );
  }
  const flags = payload.flags || [];
  const inconclusive = isIncomeExtractInconclusive(payload);
  const period =
    payload.pay_period_start || payload.pay_period_end
      ? `${payload.pay_period_start || "—"} → ${payload.pay_period_end || "—"}`
      : null;
  return (
    <div className="space-y-3 text-sm">
      {inconclusive ? <ManualReviewBanner kind="income" locale={locale} docsAnchor={docsAnchor} /> : null}
      <p className="font-semibold text-[var(--ml-ink)]">{c.incomeTitle}</p>
      <p className="text-[var(--ml-steel)]">
        {c.incomeReadPath}: {payload.read_path || "—"}
        {payload.slip_count ? ` · ${payload.slip_count} ${locale === "fr" ? "talon(s)" : "slip(s)"}` : ""}
        {payload.payslip_like === false ? ` · ${c.incomeNotPayslip}` : ""}
      </p>
      {payload.slips && payload.slips.length > 0 ? (
        <ul className="space-y-2">
          {payload.slips.map((slip) => {
            const slipFlags = (slip.flags as string[] | undefined) ?? [];
            const slipInconclusive =
              slip.payslip_like === false ||
              slipFlags.some((flag) =>
                [
                  "income_doc_unreadable",
                  "payslip_not_recognized",
                  "income_doc_missing",
                ].includes(flag)
              );
            return (
              <li
                key={String(slip.document_type)}
                className={`rounded-md border p-2 text-xs ${
                  slipInconclusive
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-[var(--ml-line)] bg-[var(--ml-paper)] text-[var(--ml-steel)]"
                }`}
              >
                <p className="font-medium text-[var(--ml-ink)]">
                  {incomeSlipSlotLabel(String(slip.document_type), locale)} —{" "}
                  {slipRecognizedLabel(Boolean(slip.payslip_like), locale)}
                </p>
                {slip.employer_name ? (
                  <p className="mt-1">{slip.employer_name as string}</p>
                ) : null}
                {slip.net_pay != null ? (
                  <p className="mt-1">
                    {c.incomeNet}: {String(slip.net_pay)}
                  </p>
                ) : null}
                {slipFlags.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {slipFlags.map((flag) => (
                      <li key={flag}>• {incomeExtractFlagLabel(flag, locale)}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {payload.employee_name ? (
        <p className="text-[var(--ml-ink)]">
          {c.incomeEmployee}: {payload.employee_name}
        </p>
      ) : null}
      {payload.employer_name ? (
        <p className="text-[var(--ml-ink)]">
          {c.incomeEmployer}: {payload.employer_name}
        </p>
      ) : null}
      {payload.net_pay != null ? (
        <p className="text-[var(--ml-ink)]">
          {c.incomeNet}: {payload.net_pay}
          {payload.gross_pay != null ? ` · ${c.incomeGross}: ${payload.gross_pay}` : ""}
        </p>
      ) : null}
      {payload.hourly_rate != null || payload.hours != null ? (
        <p className="text-xs text-[var(--ml-steel)]">
          {c.incomeRateHours}: {payload.hourly_rate ?? "—"} / {payload.hours ?? "—"}
        </p>
      ) : null}
      {period ? (
        <p className="text-xs text-[var(--ml-steel)]">
          {c.incomePeriod}: {period}
        </p>
      ) : null}
      {payload.pay_date ? (
        <p className="text-xs text-[var(--ml-steel)]">
          {c.incomePayDate}: {payload.pay_date}
        </p>
      ) : null}
      {flags.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--ml-steel)]">
          {flags.map((flag) => (
            <li key={flag}>• {incomeExtractFlagLabel(flag, locale)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const SOQUIJ_HOST = "citoyens.soquij.qc.ca";

function isSoquijUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === SOQUIJ_HOST;
  } catch {
    return false;
  }
}

function isTalTribunal(tribunal: string | undefined): boolean {
  if (!tribunal) return false;
  const t = tribunal.toUpperCase();
  return t.includes("T.A.L") || t.includes("TAL") || t.includes("R.D.L") || t.includes("RDL");
}

function SoquijDecisionList({
  decisions,
  locale,
}: {
  decisions: SoquijDecision[];
  locale: Locale;
}) {
  if (decisions.length === 0) return null;
  return (
    <ul className="space-y-2">
      {decisions.map((d, i) => (
        <SoquijDecisionRow key={d.url ?? i} decision={d} locale={locale} />
      ))}
    </ul>
  );
}

function SoquijCollapsedGroup({
  title,
  decisions,
  locale,
  limit = 30,
}: {
  title: string;
  decisions: SoquijDecision[];
  locale: Locale;
  limit?: number;
}) {
  const c = copy(locale);
  if (decisions.length === 0) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-[var(--ml-steel)]">
        {title} ({decisions.length})
      </summary>
      <div className="mt-2">
        <SoquijDecisionList decisions={decisions.slice(0, limit)} locale={locale} />
        {decisions.length > limit ? (
          <p className="mt-1 text-xs text-[var(--ml-steel)]">{c.soquijMore(decisions.length - limit)}</p>
        ) : null}
      </div>
    </details>
  );
}

function SoquijDecisionRow({
  decision,
  locale,
}: {
  decision: SoquijDecision;
  locale: Locale;
}) {
  const c = copy(locale);
  const safeUrl = isSoquijUrl(decision.url) ? decision.url : undefined;
  const isRespondent = decision.applicant_role === "respondent";
  const isPlaintiff = decision.applicant_role === "plaintiff";

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
        isRespondent
          ? "border-red-200 bg-red-50"
          : "border-[var(--ml-line)] bg-[var(--ml-card)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-[var(--ml-ink)]">
            {decision.parties || decision.title || "—"}
          </p>
          {isRespondent ? (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
              {locale === "fr" ? "défendeur" : "respondent"}
            </span>
          ) : isPlaintiff ? (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">
              {locale === "fr" ? "demandeur" : "plaintiff"}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-[var(--ml-steel)]">
          {[decision.date, decision.tribunal].filter(Boolean).join(" · ")}
        </p>
      </div>
      {safeUrl ? (
        <a href={safeUrl} target="_blank" rel="noreferrer" className={adminUi.talLink}>
          {c.soquijOpen}
        </a>
      ) : null}
    </li>
  );
}

function SoquijJobCard({ job, locale }: { job: ApplicationJob; locale: Locale }) {
  const c = copy(locale);
  const payload = parseSoquijScreeningMessage(job.message);
  if (!payload) {
    return (
      <p className={adminUi.empty}>
        {formatJobMessagePreview(job.job_type, job.message, locale)}
      </p>
    );
  }

  const allDecisions = payload.decisions ?? [];
  const totalCount = payload.decision_count ?? allDecisions.length;
  // hasMatchData requires EVERY decision to carry a name_match tag.
  // A partial tag (some decisions tagged, some not) means we can't safely
  // split direct vs broader — fall back to showing the full list.
  const hasMatchData =
    allDecisions.length > 0 && allDecisions.every((d) => d.name_match !== undefined);
  const directMatches = hasMatchData ? allDecisions.filter((d) => d.name_match === true) : [];
  const broaderResults = hasMatchData ? allDecisions.filter((d) => d.name_match !== true) : [];
  const directCount = hasMatchData
    ? (payload.name_match_count ?? directMatches.length)
    : null;

  // Rental DD priority: TAL respondents expanded; everything else collapsed.
  const talRespondents = directMatches.filter(
    (d) => d.applicant_role === "respondent" && isTalTribunal(d.tribunal)
  );
  const otherRespondents = directMatches.filter(
    (d) => d.applicant_role === "respondent" && !isTalTribunal(d.tribunal)
  );
  const plaintiffs = directMatches.filter((d) => d.applicant_role === "plaintiff");
  const otherDirect = directMatches.filter(
    (d) => d.applicant_role !== "respondent" && d.applicant_role !== "plaintiff"
  );
  const shownLegacy = allDecisions.slice(0, 25);

  return (
    <div className="space-y-3 text-sm">
      {payload.query ? (
        <p className="text-[var(--ml-ink)]">
          {c.soquijQuery}: <span className="font-medium">{payload.query}</span>
        </p>
      ) : null}

      {talRespondents.length > 0 ? (
        <p className="font-semibold text-red-700">
          {locale === "fr"
            ? `⚠ ${talRespondents.length} décision(s) TAL comme défendeur — révision requise`
            : `⚠ ${talRespondents.length} TAL decision(s) as respondent — review required`}
        </p>
      ) : (payload.respondent_count ?? 0) > 0 ? (
        <p className="font-semibold text-red-700">
          {locale === "fr"
            ? `⚠ ${payload.respondent_count} décision(s) comme défendeur — révision requise`
            : `⚠ ${payload.respondent_count} decision(s) as respondent — review required`}
        </p>
      ) : null}

      {payload.status === "failed" ? (
        <p className={`${adminUi.alertWarn} !border-0 !bg-transparent !p-0`}>
          {payload.reason || c.soquijSearchFailed}
        </p>
      ) : totalCount === 0 ? (
        <p className="text-[var(--ml-steel)]">{c.soquijNoDecisions}</p>
      ) : (
        <>
          {/* Direct name matches — shown prominently */}
          {hasMatchData ? (
            directCount === 0 ? (
              <p className="text-[var(--ml-steel)]">
                {locale === "fr"
                  ? `0 correspondance directe (${totalCount} résultat(s) général/généraux SOQUIJ)`
                  : `0 direct name matches (${totalCount} broader SOQUIJ result(s))`}
              </p>
            ) : (
              <>
                {talRespondents.length === 0 && (payload.respondent_count ?? 0) === 0 ? (
                  <p className="font-medium text-amber-700">
                    {c.soquijFound(directCount ?? 0)}
                  </p>
                ) : null}
                <SoquijDecisionList decisions={talRespondents} locale={locale} />
                <SoquijCollapsedGroup
                  title={
                    locale === "fr"
                      ? "Autres décisions comme défendeur (hors TAL)"
                      : "Other respondent decisions (non-TAL)"
                  }
                  decisions={otherRespondents}
                  locale={locale}
                />
                <SoquijCollapsedGroup
                  title={locale === "fr" ? "Décisions comme demandeur" : "Plaintiff decisions"}
                  decisions={plaintiffs}
                  locale={locale}
                />
                <SoquijCollapsedGroup
                  title={
                    locale === "fr"
                      ? "Autres correspondances directes (rôle inconnu)"
                      : "Other direct matches (role unknown)"
                  }
                  decisions={otherDirect}
                  locale={locale}
                />
              </>
            )
          ) : (
            /* Legacy record — no name_match data, show all */
            <>
              <p className="font-medium text-amber-700">{c.soquijFound(totalCount)}</p>
              <SoquijDecisionList decisions={shownLegacy} locale={locale} />
              {allDecisions.length > 25 ? (
                <p className="text-xs text-[var(--ml-steel)]">
                  {c.soquijMore(allDecisions.length - 25)}
                </p>
              ) : null}
            </>
          )}

          {/* Broader SOQUIJ results — collapsed, labelled as unverified */}
          {hasMatchData && broaderResults.length > 0 ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-[var(--ml-steel)]">
                {locale === "fr"
                  ? `${broaderResults.length} résultat(s) général/généraux SOQUIJ (non liés au nom)`
                  : `${broaderResults.length} broader SOQUIJ result(s) — name not matched`}
              </summary>
              <ul className="mt-2 space-y-2">
                {broaderResults.slice(0, 30).map((d, i) => (
                  <SoquijDecisionRow key={d.url ?? i} decision={d} locale={locale} />
                ))}
                {broaderResults.length > 30 ? (
                  <li className="text-xs text-[var(--ml-steel)]">
                    {c.soquijMore(broaderResults.length - 30)}
                  </li>
                ) : null}
              </ul>
            </details>
          ) : null}
        </>
      )}

      {payload.note ? (
        <p className="text-xs italic text-[var(--ml-steel)]">{payload.note}</p>
      ) : null}
      {payload.mock ? (
        <p className="text-xs text-amber-600">{c.soquijMock}</p>
      ) : null}
    </div>
  );
}

function TalJobCard({
  job,
  locale,
  docsAnchor,
}: {
  job: ApplicationJob;
  locale: Locale;
  docsAnchor?: string;
}) {
  const c = copy(locale);
  const tal = parseTalScreeningMessage(job.message);
  if (!tal) {
    return (
      <p className={adminUi.empty}>
        {formatJobMessagePreview(job.job_type, job.message, locale)}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {tal.applicant_name ? (
        <p className="text-sm text-[var(--ml-ink)]">
          {c.applicant}: {tal.applicant_name}
        </p>
      ) : null}
      <p className="text-sm text-[var(--ml-steel)]">
        {formatTalScreeningPreview(tal, locale)}
      </p>
      {tal.id_extract ? (
        <div className="mt-2">
          <IdExtractFlags summary={tal.id_extract} locale={locale} docsAnchor={docsAnchor} />
        </div>
      ) : null}
      <div className="space-y-2">
        {(tal.searches || []).map((search, idx) => (
          <SearchBlock key={`${search.source}-${idx}`} search={search} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function JobRow({
  job,
  locale,
  docsAnchor,
}: {
  job: ApplicationJob;
  locale: Locale;
  docsAnchor?: string;
}) {
  const isTal = job.job_type === "tal_screening";
  const isIdExtract = job.job_type === "id_document_extract";
  const isIncomeExtract = job.job_type === "income_document_extract";
  const isSoquij = job.job_type === "soquij_screening";
  return (
    <div className="border-b border-[var(--ml-line)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--ml-ink)]">
          {jobTypeLabel(job.job_type, locale)}
        </span>
        <span className={jobStatusClass(job.status)}>{job.status}</span>
      </div>
      {isTal ? (
        <div className="mt-3">
          <TalJobCard job={job} locale={locale} docsAnchor={docsAnchor} />
        </div>
      ) : isIdExtract ? (
        <div className="mt-3">
          <IdExtractJobCard job={job} locale={locale} docsAnchor={docsAnchor} />
        </div>
      ) : isIncomeExtract ? (
        <div className="mt-3">
          <IncomeExtractJobCard job={job} locale={locale} docsAnchor={docsAnchor} />
        </div>
      ) : isSoquij ? (
        <div className="mt-3">
          <SoquijJobCard job={job} locale={locale} />
        </div>
      ) : (
        <p className={`${adminUi.empty} mt-2`}>
          {formatJobMessagePreview(job.job_type, job.message, locale)}
        </p>
      )}
    </div>
  );
}

export default function ScreeningJobs({
  jobs,
  jobMemberLabel,
  docsAnchor,
}: {
  jobs: ApplicationJob[];
  jobMemberLabel: (memberId: number) => string;
  /** href to scroll to the documents section for "review document" links */
  docsAnchor?: string;
}) {
  const { locale } = useAdminLocaleContext();
  const c = copy(locale);

  if (jobs.length === 0) {
    return <p className={adminUi.empty}>{c.noJobs}</p>;
  }

  const byMember = new Map<number, ApplicationJob[]>();
  for (const job of jobs) {
    const list = byMember.get(job.application_member_id) ?? [];
    list.push(job);
    byMember.set(job.application_member_id, list);
  }

  const groups = Array.from(byMember.entries());

  return (
    <div className="space-y-4">
      {groups.map(([memberId, memberJobs]) => (
        <div key={memberId} className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)]">
          <div className="admin-card-header">
            <p className="text-sm font-semibold text-[var(--ml-ink)]">
              {jobMemberLabel(memberId)}
            </p>
          </div>
          <div className="px-4 sm:px-5">
            {memberJobs.map((job) => (
              <JobRow key={job.id} job={job} locale={locale} docsAnchor={docsAnchor} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
