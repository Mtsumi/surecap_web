"use client";

import {
  formatJobMessagePreview,
  landlordFromDossier,
  parseTalScreeningMessage,
  precisionLabel,
  sourceLabel,
  tenantFromDossier,
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
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
      <span className={emphasis}>
        {mark} {dossier.dossier || "—"}
      </span>
      {roleHint ? (
        <span className="admin-field-label !normal-case !tracking-normal">{roleHint}</span>
      ) : null}
      {label ? <span className="text-[var(--ml-ink)]">{label}</span> : null}
      {dossier.case_status ? (
        <span className="text-xs text-[var(--ml-steel)]">{dossier.case_status}</span>
      ) : null}
      {dossier.detail_url ? (
        <a
          href={dossier.detail_url}
          target="_blank"
          rel="noreferrer"
          className={adminUi.link + " text-xs"}
        >
          TAL
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
            <ul className="mt-2 space-y-1">
              {tenants.map((d) => (
                <DossierRow key={`t-${d.dossier}`} dossier={d} kind="tenant" />
              ))}
            </ul>
          ) : null}
          {landlords.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {landlords.map((d) => (
                <DossierRow key={`l-${d.dossier}`} dossier={d} kind="landlord" />
              ))}
            </ul>
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
  return (
    <div className="border-b border-[var(--ml-line)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--ml-ink)]">
          {job.job_type === "tal_screening" ? "TAL" : job.job_type}
        </span>
        <span className={jobStatusClass(job.status)}>{job.status}</span>
      </div>
      {isTal ? (
        <div className="mt-3">
          <TalJobCard job={job} />
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
