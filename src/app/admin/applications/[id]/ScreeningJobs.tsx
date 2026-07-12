"use client";

import {
  formatJobMessagePreview,
  parseTalScreeningMessage,
  precisionLabel,
  sourceLabel,
  tenantFromDossier,
  type TalDossier,
  type TalSearch,
} from "@/lib/jobMessageFormat";
import type { ApplicationJob } from "@/lib/adminApi";

function DossierRow({ dossier }: { dossier: TalDossier }) {
  const matched = dossier.name_match === true;
  const tenant = tenantFromDossier(dossier);
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
      <span className={matched ? "font-medium text-[#3d5a45]" : "text-[#78716c]"}>
        {matched ? "✓" : "·"} {dossier.dossier || "—"}
      </span>
      {tenant ? <span className="text-[#57534e]">{tenant}</span> : null}
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
  const matched = dossiers.filter((d) => d.name_match === true);
  const others = dossiers.filter((d) => d.name_match !== true);

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
              ? ` · ${search.name_match_count} correspondance(s) de nom`
              : null}
            {typeof search.elapsed_seconds === "number"
              ? ` · ~${Math.round(search.elapsed_seconds)}s`
              : null}
          </p>
          {matched.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {matched.map((d) => (
                <DossierRow key={d.dossier} dossier={d} />
              ))}
            </ul>
          ) : null}
          {others.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-[#78716c]">
                {others.length} autre(s) dossier(s) sans correspondance de nom
              </summary>
              <ul className="mt-1 space-y-1">
                {others.map((d) => (
                  <DossierRow key={d.dossier} dossier={d} />
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
