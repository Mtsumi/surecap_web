"use client";

import {
  formatJobMessagePreview,
  idExtractFlagLabel,
  idScreeningContextLabel,
  landlordFromDossier,
  parseIdDocumentExtractMessage,
  parseTalScreeningMessage,
  precisionLabel,
  sourceLabel,
  tenantFromDossier,
  jobTypeLabel,
  type TalDossier,
  type TalSearch,
} from "@/lib/jobMessageFormat";
import type { ApplicationJob } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";

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

function DossierRow({
  dossier,
  kind,
}: {
  dossier: TalDossier;
  kind: "tenant" | "landlord" | "other";
}) {
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
    kind === "tenant" ? "locataire" : kind === "landlord" ? "locateur" : null;

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
      </div>
      {dossier.detail_url ? (
        <a
          href={dossier.detail_url}
          target="_blank"
          rel="noreferrer"
          className={adminUi.talLink}
        >
          Ouvrir sur le TAL ↗
        </a>
      ) : null}
    </li>
  );
}

function SearchBlock({ search }: { search: TalSearch }) {
  const dossiers = search.dossiers || [];
  const tenants = dossiers.filter((d) => d.name_match === true);
  const landlords = dossiers.filter(
    (d) => d.landlord_match === true && d.name_match !== true
  );
  const others = dossiers.filter(
    (d) => d.name_match !== true && d.landlord_match !== true
  );

  return (
    <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3">
      <div className="text-sm font-semibold text-[var(--ml-ink)]">
        {sourceLabel(search.source)}{" "}
        <span className="font-normal text-[var(--ml-steel)]">
          ({precisionLabel(search.search_precision)})
        </span>
      </div>
      {search.input?.raw_address ? (
        <p className="mt-0.5 text-sm text-[var(--ml-ink)]">{search.input.raw_address}</p>
      ) : null}
      {search.status !== "completed" ? (
        <p className={`${adminUi.alertWarn} mt-2 !border-0 !bg-transparent !p-0`}>
          {search.reason || search.status}
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-[var(--ml-steel)]">
            {search.dossier_count ?? dossiers.length} dossier(s)
            {typeof search.name_match_count === "number"
              ? ` · ${search.name_match_count} locataire`
              : null}
            {typeof search.landlord_mention_count === "number" &&
            search.landlord_mention_count > 0
              ? ` · ${search.landlord_mention_count} locateur`
              : null}
            {typeof search.elapsed_seconds === "number"
              ? ` · ~${Math.round(search.elapsed_seconds)}s`
              : null}
          </p>
          {tenants.length > 0 ? (
            <div className="mt-3">
              <p className="admin-field-label">Correspondances locataire</p>
              <ul className="mt-1.5 space-y-2">
              {tenants.map((d) => (
                <DossierRow key={`t-${d.dossier}`} dossier={d} kind="tenant" />
              ))}
              </ul>
            </div>
          ) : null}
          {landlords.length > 0 ? (
            <div className="mt-3">
              <p className="admin-field-label">Mentions locateur</p>
              <ul className="mt-1.5 space-y-2">
              {landlords.map((d) => (
                <DossierRow key={`l-${d.dossier}`} dossier={d} kind="landlord" />
              ))}
              </ul>
            </div>
          ) : null}
          {others.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-[var(--ml-steel)]">
                {others.length} autre(s) dossier(s) sans mention du demandeur
              </summary>
              <ul className="mt-1 space-y-1">
                {others.map((d) => (
                  <DossierRow key={`o-${d.dossier}`} dossier={d} kind="other" />
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
}: {
  summary: NonNullable<ReturnType<typeof parseTalScreeningMessage>>["id_extract"];
}) {
  if (!summary) return null;
  const flags = summary.flags || [];
  return (
    <div className="rounded-lg border border-[var(--ml-line)] bg-[var(--ml-card)] p-3 text-sm">
      <p className="font-semibold text-[var(--ml-ink)]">Vérification pièce d&apos;identité</p>
      <p className="mt-1 text-[var(--ml-steel)]">
        {idScreeningContextLabel(summary.screening_context)}
        {summary.pdf417_ok ? ` · PDF417 (${summary.pdf417_variant || "ok"})` : ""}
      </p>
      {(summary.ocr_name || summary.barcode_name) && (
        <p className="mt-2 text-[var(--ml-ink)]">
          Nom lu: {summary.barcode_name || summary.ocr_name}
          {summary.name_mismatch ? (
            <span className={`${adminUi.alertWarn} ml-2 !inline !border-0 !bg-transparent !p-0`}>
              ≠ formulaire
            </span>
          ) : null}
        </p>
      )}
      {summary.address_sources && summary.address_sources.length > 0 ? (
        <p className="mt-1 text-xs text-[var(--ml-steel)]">
          Adresses ID utilisées pour TAL:{" "}
          {summary.address_sources.map((s) => sourceLabel(s)).join(" · ")}
        </p>
      ) : null}
      {flags.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-[var(--ml-steel)]">
          {flags.map((flag) => (
            <li key={flag}>• {idExtractFlagLabel(flag)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function IdExtractJobCard({ job }: { job: ApplicationJob }) {
  const payload = parseIdDocumentExtractMessage(job.message);
  if (!payload) {
    return (
      <p className={adminUi.empty}>{formatJobMessagePreview(job.job_type, job.message)}</p>
    );
  }
  const flags = payload.flags || [];
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[var(--ml-steel)]">
        {idScreeningContextLabel(payload.screening_context)}
        {payload.pdf417_ok ? ` · PDF417 (${payload.pdf417_variant || "ok"})` : ""}
      </p>
      {(payload.ocr_name || payload.barcode_name) && (
        <p className="text-[var(--ml-ink)]">
          Nom: {payload.barcode_name || payload.ocr_name}
          {payload.name_mismatch ? (
            <span className={`${adminUi.alertWarn} ml-2 !inline !border-0 !bg-transparent !p-0`}>
              différent du formulaire
            </span>
          ) : null}
        </p>
      )}
      {payload.addresses && payload.addresses.length > 0 ? (
        <div>
          <p className="admin-field-label">Adresses extraites</p>
          <ul className="mt-1 space-y-1 text-[var(--ml-ink)]">
            {payload.addresses.map((addr) => (
              <li key={`${addr.source}-${addr.raw_address}`}>
                {sourceLabel(addr.source)} — {addr.raw_address}
                {addr.tal_ready ? "" : " (non utilisée pour TAL)"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {(payload.blur_front || payload.blur_back) && (
        <p className="text-xs text-[var(--ml-steel)]">
          Flou: recto {payload.blur_front?.quality || "—"} · verso{" "}
          {payload.blur_back?.quality || "—"}
        </p>
      )}
      {flags.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--ml-steel)]">
          {flags.map((flag) => (
            <li key={flag}>• {idExtractFlagLabel(flag)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TalJobCard({ job }: { job: ApplicationJob }) {
  const tal = parseTalScreeningMessage(job.message);
  if (!tal) {
    return (
      <p className={adminUi.empty}>{formatJobMessagePreview(job.job_type, job.message)}</p>
    );
  }
  return (
    <div className="space-y-3">
      {tal.applicant_name ? (
        <p className="text-sm text-[var(--ml-ink)]">Demandeur: {tal.applicant_name}</p>
      ) : null}
      {tal.summary ? <p className="text-sm text-[var(--ml-steel)]">{tal.summary}</p> : null}
      {tal.id_extract ? (
        <div className="mt-2">
          <IdExtractFlags summary={tal.id_extract} />
        </div>
      ) : null}
      <div className="space-y-2">
        {(tal.searches || []).map((search, idx) => (
          <SearchBlock key={`${search.source}-${idx}`} search={search} />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: ApplicationJob }) {
  const isTal = job.job_type === "tal_screening";
  const isIdExtract = job.job_type === "id_document_extract";
  return (
    <div className="border-b border-[var(--ml-line)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--ml-ink)]">
          {jobTypeLabel(job.job_type)}
        </span>
        <span className={jobStatusClass(job.status)}>{job.status}</span>
      </div>
      {isTal ? (
        <div className="mt-3">
          <TalJobCard job={job} />
        </div>
      ) : isIdExtract ? (
        <div className="mt-3">
          <IdExtractJobCard job={job} />
        </div>
      ) : (
        <p className={`${adminUi.empty} mt-2`}>
          {formatJobMessagePreview(job.job_type, job.message)}
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
  if (jobs.length === 0) {
    return <p className={adminUi.empty}>Aucune tâche pour cette demande.</p>;
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
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
