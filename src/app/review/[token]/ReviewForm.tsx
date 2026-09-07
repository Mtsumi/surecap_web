"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  JanitorReview,
  JanitorReviewChecklist,
  JanitorReviewMember,
  fetchJanitorReview,
  fetchReviewCreditConsentBlob,
  submitJanitorReview,
} from "@/lib/api";
import { applicationStatusLabel } from "@/lib/adminStatus";
import { adminUi, applicationStatusClass } from "@/lib/adminUi";
import { facebookLink } from "@/lib/facebookSearch";

const EMPTY_CHECKLIST: JanitorReviewChecklist = {
  called_landlord: false,
  called_employer: false,
  checked_social: false,
};

function roleLabel(role: string): string {
  switch (role) {
    case "primary":
      return "Demandeur principal";
    case "roommate":
      return "Colocataire";
    case "guarantor":
      return "Garant";
    default:
      return role;
  }
}

function ContactRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  const isUrl = value.startsWith("http://") || value.startsWith("https://");
  return (
    <div>
      <dt className="admin-field-label">{label}</dt>
      <dd className="admin-field-value">
        {isUrl ? (
          <a href={value} target="_blank" rel="noreferrer" className={adminUi.link}>
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function FacebookRow({ member }: { member: JanitorReviewMember }) {
  const link = facebookLink(member.facebook_url, member.name);
  if (!link) return null;
  return (
    <div>
      <dt className="admin-field-label">Facebook</dt>
      <dd className="admin-field-value">
        <a href={link.href} target="_blank" rel="noreferrer" className={adminUi.link}>
          {link.label}
        </a>
      </dd>
    </div>
  );
}

function CreditConsentPreview({
  token,
  documentId,
}: {
  token: string;
  documentId: number;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchReviewCreditConsentBlob(token, documentId, "inline")
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible d'ouvrir le PDF");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, token]);

  const download = async () => {
    try {
      const blob = await fetchReviewCreditConsentBlob(token, documentId, "attachment");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "credit_consent.pdf";
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de télécharger le PDF");
    }
  };

  return (
    <div className="sm:col-span-2">
      <dt className="admin-field-label">Formulaire de crédit signé</dt>
      <dd className="admin-field-value">
        <button type="button" onClick={() => void download()} className={adminUi.link}>
          Télécharger le PDF
        </button>
        {error ? <p className="mt-1 text-sm text-[#7f1d1d]">{error}</p> : null}
        {blobUrl ? (
          <iframe
            title="Formulaire de crédit signé"
            src={blobUrl}
            className="mt-3 h-80 w-full rounded border border-[var(--ml-line)] bg-white"
          />
        ) : !error ? (
          <p className="mt-2 text-sm text-[var(--ml-steel)]">Chargement du PDF…</p>
        ) : null}
      </dd>
    </div>
  );
}

function MemberCard({
  member,
  token,
}: {
  member: JanitorReviewMember;
  token: string;
}) {
  return (
    <section className={adminUi.card}>
      <div className={adminUi.cardHeader}>
        <h2 className="text-sm font-semibold text-[var(--ml-ink)]">
          {member.name}{" "}
          <span className="font-normal text-[var(--ml-steel)]">· {roleLabel(member.role)}</span>
        </h2>
      </div>
      <dl className={`${adminUi.cardPad} grid gap-3 sm:grid-cols-2`}>
        <ContactRow label="Locateur" value={member.landlord_name} />
        <ContactRow label="Téléphone locateur" value={member.landlord_phone} />
        <ContactRow label="Locateur précédent" value={member.previous_landlord_name} />
        <ContactRow label="Téléphone locateur précédent" value={member.previous_landlord_phone} />
        <ContactRow label="Employeur" value={member.employer_name} />
        <ContactRow label="RH" value={member.hr_name} />
        <ContactRow label="Téléphone RH" value={member.hr_phone} />
        <FacebookRow member={member} />
        <ContactRow label="LinkedIn" value={member.linkedin_url} />
        {member.credit_consent_document_id ? (
          <CreditConsentPreview token={token} documentId={member.credit_consent_document_id} />
        ) : (
          <div className="sm:col-span-2">
            <dt className="admin-field-label">Formulaire de crédit signé</dt>
            <dd className="admin-field-value text-[var(--ml-steel)]">
              PDF introuvable pour ce membre.
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default function ReviewForm({ token }: { token: string }) {
  const [review, setReview] = useState<JanitorReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [checklist, setChecklist] = useState<JanitorReviewChecklist>(EMPTY_CHECKLIST);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJanitorReview(token)
      .then((data) => {
        if (cancelled) return;
        setReview(data);
        if (data.checklist) setChecklist(data.checklist);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Lien invalide ou expiré");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const allChecked = useMemo(
    () =>
      checklist.called_landlord && checklist.called_employer && checklist.checked_social,
    [checklist]
  );

  async function runAction(
    action: "request_credit_check" | "accept" | "reject"
  ): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitJanitorReview(token, {
        action,
        checklist: action === "request_credit_check" ? checklist : undefined,
        reason: action === "reject" ? reason.trim() : undefined,
      });
      setReview(updated);
      if (updated.checklist) setChecklist(updated.checklist);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "La mise à jour a échoué");
    } finally {
      setSubmitting(false);
    }
  }

  function onReject(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Une raison de refus est obligatoire.");
      return;
    }
    void runAction("reject");
  }

  if (loading) {
    return <p className={adminUi.empty}>Chargement…</p>;
  }

  if (!review) {
    return <p className={adminUi.alertError}>{error || "Lien invalide ou expiré"}</p>;
  }

  const unitLine = [review.building_name, review.unit_number, review.building_address]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ml-steel)]">
        Montreal Living
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={adminUi.pageTitle}>Revue des références</h1>
          <p className={adminUi.pageSubtitle}>
            Demande #{review.application_id}
            {unitLine ? ` · ${unitLine}` : ""}
            {" · "}
            <Link
              href={`/admin/applications/${review.application_id}`}
              className={adminUi.link}
            >
              Dossier admin ↗
            </Link>
          </p>
        </div>
        <span className={applicationStatusClass(review.status)}>
          {applicationStatusLabel(review.status)}
        </span>
      </div>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}

      {review.stage === "done" ? (
        <section className={`${adminUi.cardPad} ${adminUi.card} mt-6`}>
          <p className="text-sm text-[var(--ml-ink)]">
            {review.token_expired
              ? "Ce lien a expiré. La décision ne peut plus être modifiée ici."
              : "Merci. La décision a déjà été enregistrée."}
          </p>
          {review.rejection_reason ? (
            <p className={`${adminUi.pageSubtitle} mt-2`}>
              Raison du refus : {review.rejection_reason}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className={`${adminUi.sectionGap} mt-6`}>
        {review.members.map((member) => (
          <MemberCard key={member.id} member={member} token={token} />
        ))}
      </div>

      {review.stage !== "done" ? (
        <section className={`${adminUi.card} mt-8`}>
          <div className={adminUi.cardHeader}>
            <h2 className={adminUi.sectionTitle}>Vérifications</h2>
            <p className={adminUi.pageSubtitle}>
              {review.stage === "janitor"
                ? "Cochez les trois points avant d’envoyer le dossier ou de refuser."
                : "Vérifications déjà confirmées. Acceptez ou refusez après la vérification de crédit."}
            </p>
          </div>
          <div className={`${adminUi.cardPad} space-y-3`}>
            {(
              [
                ["called_landlord", "J’ai appelé le(s) locateur(s)"],
                ["called_employer", "J’ai appelé l’employeur / les RH"],
                ["checked_social", "J’ai vérifié Facebook"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-start gap-3 text-sm text-[var(--ml-ink)]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checklist[key]}
                  disabled={review.stage !== "janitor" || submitting}
                  onChange={(event) =>
                    setChecklist((current) => ({ ...current, [key]: event.target.checked }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {review.stage === "janitor" ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!allChecked || submitting}
            className={`${adminUi.btnPrimary} disabled:opacity-50`}
            onClick={() => void runAction("request_credit_check")}
          >
            Prêt pour la vérification de crédit
          </button>
        </div>
      ) : null}

      {review.stage === "steve" ? (
        <div className="mt-6">
          <button
            type="button"
            disabled={submitting}
            className={adminUi.btnPrimary}
            onClick={() => void runAction("accept")}
          >
            Accepter
          </button>
        </div>
      ) : null}

      {review.stage === "janitor" || review.stage === "steve" ? (
        <form onSubmit={onReject} className={`${adminUi.cardPad} ${adminUi.card} mt-6 space-y-3`}>
          <label className="block text-sm text-[var(--ml-steel)]">
            Raison du refus
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`${adminUi.textarea} mt-1`}
              rows={3}
              required
            />
          </label>
          <button
            type="submit"
            disabled={
              submitting || (review.stage === "janitor" && !allChecked) || !reason.trim()
            }
            className={`${adminUi.btnDanger} disabled:opacity-50`}
          >
            Refuser
          </button>
        </form>
      ) : null}
    </div>
  );
}
