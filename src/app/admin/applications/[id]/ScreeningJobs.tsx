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
  parseTalScreeningMessage,
  precisionLabel,
  pluralCount,
  sourceLabel,
  tenantFromDossier,
  jobTypeLabel,
  type TalDossier,
  type TalSearch,
} from "@/lib/jobMessageFormat";
import type { ApplicationJob } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
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

function IdExtractFlags({
  summary,
  locale,
}: {
  summary: NonNullable<ReturnType<typeof parseTalScreeningMessage>>["id_extract"];
  locale: Locale;
}) {
  if (!summary) return null;
  const c = copy(locale);
  const flags = summary.flags || [];
  return (
    <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-card)] p-3 text-sm">
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

function IdExtractJobCard({ job, locale }: { job: ApplicationJob; locale: Locale }) {
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
  return (
    <div className="space-y-3 text-sm">
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

function IncomeExtractJobCard({ job, locale }: { job: ApplicationJob; locale: Locale }) {
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
  const period =
    payload.pay_period_start || payload.pay_period_end
      ? `${payload.pay_period_start || "—"} → ${payload.pay_period_end || "—"}`
      : null;
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-[var(--ml-ink)]">{c.incomeTitle}</p>
      <p className="text-[var(--ml-steel)]">
        {c.incomeReadPath}: {payload.read_path || "—"}
        {payload.payslip_like === false ? ` · ${c.incomeNotPayslip}` : ""}
      </p>
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

function TalJobCard({ job, locale }: { job: ApplicationJob; locale: Locale }) {
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
          <IdExtractFlags summary={tal.id_extract} locale={locale} />
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

function JobRow({ job, locale }: { job: ApplicationJob; locale: Locale }) {
  const isTal = job.job_type === "tal_screening";
  const isIdExtract = job.job_type === "id_document_extract";
  const isIncomeExtract = job.job_type === "income_document_extract";
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
          <TalJobCard job={job} locale={locale} />
        </div>
      ) : isIdExtract ? (
        <div className="mt-3">
          <IdExtractJobCard job={job} locale={locale} />
        </div>
      ) : isIncomeExtract ? (
        <div className="mt-3">
          <IncomeExtractJobCard job={job} locale={locale} />
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
}: {
  jobs: ApplicationJob[];
  jobMemberLabel: (memberId: number) => string;
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
              <JobRow key={job.id} job={job} locale={locale} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
