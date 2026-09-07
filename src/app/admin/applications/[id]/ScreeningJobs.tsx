"use client";

import {
  formatJobMessagePreview,
  formatSearchAddress,
  formatTalScreeningPreview,
  landlordFromDossier,
  parseIdDocumentExtractMessage,
  parseIncomeDocumentExtractMessage,
  parseSoquijScreeningMessage,
  parseTalScreeningMessage,
  precisionLabel,
  pluralCount,
  sourceLabel,
  talReasonLabel,
  tenantFromDossier,
  HIDDEN_SCREENING_JOB_TYPES,
  jobTypeLabel,
  type SoquijDecision,
  type TalDossier,
  type TalSearch,
} from "@/lib/jobMessageFormat";
import {
  idScreeningGlance,
  incomeScreeningGlance,
  householdAffordabilityGlance,
  type GlanceTone,
  type HouseholdAffordability,
  type ScreeningGlanceRow,
} from "@/lib/screeningGlance";
import type { ApplicationJob, ApplicationMember } from "@/lib/adminApi";
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
      nameRead: "Name read",
      name: "Name",
      formMismatch: "≠ form",
      formDiffers: "differs from form",
      incomeTitle: "Payslip check",
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
      soquijRelated: "Related — verify in decision (name may be inside text)",
      soquijSecondary: "Secondary results",
      soquijOther: "Other SOQUIJ results",
      soquijStrong: "High confidence",
      soquijSurname: "Surname match",
      review: "Review",
      glanceCheck: "Check",
      glanceResult: "Result",
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
    nameRead: "Nom lu",
    name: "Nom",
    formMismatch: "≠ formulaire",
    formDiffers: "différent du formulaire",
    incomeTitle: "Vérification talon de paie",
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
    soquijRelated: "Connexe — vérifier dans la décision (nom possiblement dans le texte)",
    soquijSecondary: "Résultats secondaires",
    soquijOther: "Autres résultats SOQUIJ",
      soquijStrong: "Haute confiance",
      soquijSurname: "Nom de famille",
      review: "Voir",
      glanceCheck: "Contrôle",
      glanceResult: "Résultat",
    };
}

function glanceMark(tone: GlanceTone): { symbol: string; className: string; label: string } {
  switch (tone) {
    case "ok":
      return { symbol: "✓", className: "text-emerald-700", label: "ok" };
    case "warn":
      return { symbol: "!", className: "font-bold text-amber-700", label: "warn" };
    case "bad":
      return { symbol: "✗", className: "text-red-700", label: "bad" };
    case "pending":
      return { symbol: "…", className: "text-[var(--ml-steel)]", label: "pending" };
    default:
      return { symbol: "–", className: "text-[var(--ml-steel)]", label: "neutral" };
  }
}

function GlanceTable({
  rows,
  locale,
}: {
  rows: Array<ScreeningGlanceRow & { onReview?: () => void }>;
  locale: Locale;
}) {
  const c = copy(locale);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--ml-line)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ml-steel)]">
            <th className="w-8 py-2 pr-2" />
            <th className="py-2 pr-3">{c.glanceCheck}</th>
            <th className="py-2 pr-3">{c.glanceResult}</th>
            <th className="w-16 py-2 text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const mark = glanceMark(row.tone);
            return (
              <tr key={row.key} className="border-b border-[var(--ml-line)] last:border-b-0 align-top">
                <td className={`py-2.5 pr-2 text-base leading-none ${mark.className}`} aria-label={mark.label}>
                  {mark.symbol}
                </td>
                <td className="py-2.5 pr-3 font-medium text-[var(--ml-ink)]">{row.checkLabel}</td>
                <td className="py-2.5 pr-3 text-[var(--ml-ink)]">
                  <p>{row.summary}</p>
                  {row.issues.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--ml-steel)]">
                      {row.issues.map((issue) => (
                        <li key={issue}>• {issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="py-2.5 text-right">
                  {row.onReview ? (
                    <button
                      type="button"
                      onClick={row.onReview}
                      className="text-xs font-medium text-[var(--ml-accent)] underline-offset-2 hover:underline"
                    >
                      {c.review}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function memberFormName(member?: ApplicationMember): string {
  if (!member) return "";
  const legal = [member.given_name, member.family_name].filter(Boolean).join(" ");
  return legal || member.invited_name || "";
}

function DocumentsGlanceTable({
  idJob,
  incomeJob,
  locale,
  formName,
  onReviewDocuments,
}: {
  idJob?: ApplicationJob;
  incomeJob?: ApplicationJob;
  locale: Locale;
  formName?: string | null;
  onReviewDocuments?: (kind: "id" | "income") => void;
}) {
  const rows: Array<ScreeningGlanceRow & { onReview?: () => void }> = [];
  if (idJob) {
    rows.push({
      ...idScreeningGlance(
        parseIdDocumentExtractMessage(idJob.message),
        idJob.status,
        locale,
        formName
      ),
      onReview: onReviewDocuments ? () => onReviewDocuments("id") : undefined,
    });
  }
  if (incomeJob) {
    rows.push({
      ...incomeScreeningGlance(
        parseIncomeDocumentExtractMessage(incomeJob.message),
        incomeJob.status,
        locale
      ),
      onReview: onReviewDocuments ? () => onReviewDocuments("income") : undefined,
    });
  }
  return <GlanceTable rows={rows} locale={locale} />;
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
  const addressLine =
    formatSearchAddress(search.input, locale) ||
    (typeof search.raw_address === "string" && search.raw_address.trim()
      ? search.raw_address.trim()
      : null);

  return (
    <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3">
      <div className="text-sm font-semibold text-[var(--ml-ink)]">
        {sourceLabel(search.source, locale)}
        {search.search_precision === "unit" || search.search_precision === "building" ? (
          <span className="font-normal text-[var(--ml-steel)]">
            {" "}
            ({precisionLabel(search.search_precision, locale)})
          </span>
        ) : null}
      </div>
      {addressLine ? (
        <p className="mt-0.5 text-sm text-[var(--ml-ink)]">{addressLine}</p>
      ) : null}
      {search.status !== "completed" ? (
        <p className={`${adminUi.alertWarn} mt-2 !border-0 !bg-transparent !p-0`}>
          {talReasonLabel(search.reason || search.status, search.source, locale)}
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
  const isRelated = decision.match_level === "related";
  const isStrong = decision.match_level === "strong";
  const isSurname = decision.match_level === "surname";

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
        isRespondent
          ? "border-red-200 bg-red-50"
          : isRelated
            ? "border-amber-200 bg-amber-50"
            : "border-[var(--ml-line)] bg-[var(--ml-card)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-[var(--ml-ink)]">
            {decision.parties || decision.title || "—"}
          </p>
          {isStrong ? (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              {c.soquijStrong}
            </span>
          ) : isSurname ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
              {c.soquijSurname}
            </span>
          ) : isRelated ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
              {locale === "fr" ? "connexe" : "related"}
            </span>
          ) : null}
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
  const hasMatchData =
    allDecisions.length > 0 &&
    allDecisions.every(
      (d) => d.match_level !== undefined || d.name_match !== undefined
    );
  const strongMatches = hasMatchData
    ? allDecisions.filter((d) => d.match_level === "strong")
    : [];
  const secondaryResults = hasMatchData
    ? allDecisions.filter(
        (d) => d.match_level === "surname" || d.match_level === "related"
      )
    : [];
  const otherResults = hasMatchData
    ? allDecisions.filter(
        (d) =>
          d.match_level !== "strong" &&
          d.match_level !== "surname" &&
          d.match_level !== "related"
      )
    : [];
  const directCount = hasMatchData ? strongMatches.length : null;

  const talRespondents = strongMatches.filter(
    (d) => d.applicant_role === "respondent" && isTalTribunal(d.tribunal)
  );
  const otherRespondents = strongMatches.filter(
    (d) => d.applicant_role === "respondent" && !isTalTribunal(d.tribunal)
  );
  const plaintiffs = strongMatches.filter((d) => d.applicant_role === "plaintiff");
  const otherDirect = strongMatches.filter(
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
                  ? `0 correspondance forte (${totalCount} autre(s) résultat(s) SOQUIJ)`
                  : `0 strong matches (${totalCount} other SOQUIJ result(s))`}
              </p>
            ) : (
              <>
                {talRespondents.length === 0 && (payload.respondent_count ?? 0) === 0 ? (
                  <p className="font-medium text-amber-700">
                    {directCount
                      ? c.soquijFound(directCount)
                      : locale === "fr"
                        ? `${secondaryResults.length} résultat(s) secondaire(s)`
                        : `${secondaryResults.length} secondary result(s)`}
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

          {hasMatchData && secondaryResults.length > 0 ? (
            <SoquijCollapsedGroup
              title={c.soquijSecondary}
              decisions={secondaryResults}
              locale={locale}
              limit={40}
            />
          ) : null}

          {/* Broader SOQUIJ results — collapsed, labelled as unverified */}
          {hasMatchData && otherResults.length > 0 ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-[var(--ml-steel)]">
                {c.soquijOther} ({otherResults.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {otherResults.slice(0, 30).map((d, i) => (
                  <SoquijDecisionRow key={d.url ?? i} decision={d} locale={locale} />
                ))}
                {otherResults.length > 30 ? (
                  <li className="text-xs text-[var(--ml-steel)]">
                    {c.soquijMore(otherResults.length - 30)}
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
}: {
  job: ApplicationJob;
  locale: Locale;
}) {
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
      <p className="text-sm text-[var(--ml-steel)]">
        {formatTalScreeningPreview(tal, locale)}
      </p>
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
}: {
  job: ApplicationJob;
  locale: Locale;
}) {
  const isTal = job.job_type === "tal_screening";
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
          <TalJobCard job={job} locale={locale} />
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
  members,
  householdAffordability,
  docsAnchor: _docsAnchor,
  onReviewDocuments,
}: {
  jobs: ApplicationJob[];
  jobMemberLabel: (memberId: number) => string;
  members?: ApplicationMember[];
  householdAffordability?: HouseholdAffordability | null;
  /** href to scroll to the documents section for "review document" links */
  docsAnchor?: string;
  onReviewDocuments?: (memberId: number, kind: "id" | "income") => void;
}) {
  const { locale } = useAdminLocaleContext();
  const c = copy(locale);
  const visibleJobs = jobs.filter((job) => !HIDDEN_SCREENING_JOB_TYPES.has(job.job_type));
  const memberById = new Map((members ?? []).map((member) => [member.id, member]));

  if (visibleJobs.length === 0 && !householdAffordability) {
    return <p className={adminUi.empty}>{c.noJobs}</p>;
  }

  const byMember = new Map<number, ApplicationJob[]>();
  for (const job of visibleJobs) {
    const list = byMember.get(job.application_member_id) ?? [];
    list.push(job);
    byMember.set(job.application_member_id, list);
  }

  const groups = Array.from(byMember.entries());

  return (
    <div className="space-y-4">
      {householdAffordability ? (
        <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)]">
          <div className="px-4 py-3 sm:px-5">
            <GlanceTable
              rows={[householdAffordabilityGlance(householdAffordability, locale)]}
              locale={locale}
            />
          </div>
        </div>
      ) : null}
      {groups.map(([memberId, memberJobs]) => (
        <div key={memberId} className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)]">
          <div className="admin-card-header">
            <p className="text-sm font-semibold text-[var(--ml-ink)]">
              {jobMemberLabel(memberId)}
            </p>
          </div>
          <div className="px-4 sm:px-5">
            <div className="border-b border-[var(--ml-line)] py-3">
              <DocumentsGlanceTable
                idJob={memberJobs.find((job) => job.job_type === "id_document_extract")}
                incomeJob={memberJobs.find((job) => job.job_type === "income_document_extract")}
                locale={locale}
                formName={memberFormName(memberById.get(memberId))}
                onReviewDocuments={
                  onReviewDocuments
                    ? (kind) => onReviewDocuments(memberId, kind)
                    : undefined
                }
              />
            </div>
            {memberJobs
              .filter(
                (job) =>
                  job.job_type !== "id_document_extract" &&
                  job.job_type !== "income_document_extract"
              )
              .map((job) => (
                <JobRow key={job.id} job={job} locale={locale} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
