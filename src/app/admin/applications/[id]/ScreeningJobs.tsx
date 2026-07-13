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
      ? "font-medium text-[#3d5a45]"
      : kind === "landlord"
        ? "font-medium text-[#57534e]"
        : "text-[#78716c]";
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
      {roleHint ? <span className="text-xs uppercase text-[#a8a29e]">{roleHint}</span> : null}
      {label ? <span className="text-[#57534e]">{label}</span> : null}
      {dossier.case_status ? (
        <span className="text-xs text-[#a8a29e]">{dossier.case_status}</span>
      ) : null}
      {dossier.detail_url ? (
        <a
          href={dossier.detail_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[#3d5a45] underline-offset-2 hover:underline"
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
    <div className="rounded-md border border-[#e7e0d5] bg-[#faf8f5] p-3">
      <div className="text-sm font-medium text-[#292524]">
        {sourceLabel(search.source)}{" "}
        <span className="font-normal text-[#78716c]">
          ({precisionLabel(search.search_precision)})
        </span>
      </div>
      {search.input?.raw_address ? (
        <p className="mt-0.5 text-sm text-[#57534e]">{search.input.raw_address}</p>
      ) : null}
      {search.status !== "completed" ? (
        <p className="mt-2 text-sm text-[#a16207]">{search.reason || search.status}</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-[#78716c]">
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
              <summary className="cursor-pointer text-xs text-[#78716c]">
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
      <p className="text-sm text-[#78716c]">{formatJobMessagePreview(job.job_type, job.message)}</p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-[#e7e0d5] px-2 py-0.5 text-xs uppercase tracking-wide text-[#57534e]">
          {job.status}
        </span>
        {tal.applicant_name ? (
          <span className="text-[#292524]">Demandeur: {tal.applicant_name}</span>
        ) : null}
      </div>
      {tal.summary ? <p className="text-sm text-[#57534e]">{tal.summary}</p> : null}
      <div className="space-y-2">
        {(tal.searches || []).map((search, idx) => (
          <SearchBlock key={`${search.source}-${idx}`} search={search} />
        ))}
      </div>
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
    return <p className="mt-2 text-sm text-[#78716c]">Aucune tâche pour cette demande.</p>;
  }

  return (
    <div className="mt-3 space-y-4">
      {jobs.map((job) => {
        const isTal = job.job_type === "tal_screening";
        return (
          <div key={job.id} className="border-b border-[#f0ebe3] pb-4 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[#292524]">{job.job_type}</p>
                <p className="text-xs text-[#a8a29e]">
                  {jobMemberLabel(job.application_member_id)} · {job.status}
                </p>
              </div>
              {!isTal ? (
                <p className="max-w-xl text-right text-sm text-[#78716c]">
                  {formatJobMessagePreview(job.job_type, job.message)}
                </p>
              ) : null}
            </div>
            {isTal ? (
              <div className="mt-3">
                <TalJobCard job={job} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
