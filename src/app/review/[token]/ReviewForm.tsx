"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  JanitorReview,
  JanitorReviewChecklist,
  JanitorReviewMember,
  confirmReviewMemberIdentity,
  fetchJanitorReview,
  fetchReviewCreditConsentBlob,
  fetchReviewDocumentBlob,
  fetchReviewRejectionEmailDraft,
  submitJanitorReview,
} from "@/lib/api";
import { applicationStatusLabel } from "@/lib/adminStatus";
import { adminUi, applicationStatusClass } from "@/lib/adminUi";
import { facebookLink } from "@/lib/facebookSearch";
import RejectionEmailComposer, {
  type RejectionComposeValues,
} from "@/app/admin/components/RejectionEmailComposer";
import SteveCreditDecision from "@/app/admin/components/SteveCreditDecision";
import MemberIdentityPanel, {
  IdentityGateBanner,
  IdentityUnlockStrip,
} from "@/app/admin/components/MemberIdentityPanel";

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
  disabled,
  submitting,
  onIdentityUpdated,
  onIdentityFlash,
}: {
  member: JanitorReviewMember;
  token: string;
  disabled?: boolean;
  submitting?: boolean;
  onIdentityUpdated: (review: JanitorReview) => void;
  onIdentityFlash?: (message: string) => void;
}) {
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [idIsPdf, setIdIsPdf] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [identityBusy, setIdentityBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl);
    };
  }, [idPreviewUrl]);

  async function openDoc(
    docId: number | null | undefined,
    failMessage: string
  ) {
    if (!docId) return;
    setIdError(null);
    try {
      const blob = await fetchReviewDocumentBlob(token, docId, "inline");
      if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl);
      setIdIsPdf(
        blob.type.includes("pdf") || blob.type === "application/octet-stream"
      );
      setIdPreviewUrl(URL.createObjectURL(blob));
      const refreshed = await fetchJanitorReview(token);
      onIdentityUpdated(refreshed);
    } catch (err: unknown) {
      setIdError(err instanceof Error ? err.message : failMessage);
    }
  }

  async function openId() {
    await openDoc(
      member.identity?.id_document_id,
      "Impossible d'ouvrir la pièce d'identité"
    );
  }

  async function openSelfie() {
    await openDoc(
      member.identity?.selfie_document_id,
      "Impossible d'ouvrir le selfie"
    );
  }

  async function confirm(met: boolean) {
    setIdentityBusy(true);
    try {
      const updated = await confirmReviewMemberIdentity(token, member.id, met);
      onIdentityUpdated(updated);
      if (met) {
        onIdentityFlash?.(`Rencontre confirmée pour ${member.name}.`);
      } else {
        onIdentityFlash?.(
          `Selfie demandé pour ${member.name}: un courriel avec le lien de vérification a été envoyé au demandeur.`
        );
      }
    } catch (err: unknown) {
      setIdError(err instanceof Error ? err.message : "Échec de la confirmation");
    } finally {
      setIdentityBusy(false);
    }
  }

  return (
    <section className={adminUi.card}>
      <div className={adminUi.cardHeader}>
        <h2 className="text-sm font-semibold text-[var(--ml-ink)]">
          {member.name}{" "}
          <span className="font-normal text-[var(--ml-steel)]">· {roleLabel(member.role)}</span>
        </h2>
      </div>
      <dl className={`${adminUi.cardPad} grid gap-3 sm:grid-cols-2`}>
        <MemberIdentityPanel
          memberId={member.id}
          memberName={member.name}
          identity={member.identity}
          disabled={disabled}
          submitting={submitting || identityBusy}
          onOpenId={openId}
          onOpenSelfie={openSelfie}
          onConfirmMet={() => confirm(true)}
          onConfirmNotMet={() => confirm(false)}
        />
        {idError ? (
          <div className="sm:col-span-2 text-sm text-[#7f1d1d]">{idError}</div>
        ) : null}
        {idPreviewUrl ? (
          <div className="sm:col-span-2">
            {idIsPdf ? (
              <iframe
                title="Document d'identité"
                src={idPreviewUrl}
                className="mt-1 h-80 w-full rounded border border-[var(--ml-line)] bg-white"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={idPreviewUrl}
                alt="Document d'identité"
                className="mt-1 max-h-96 w-full rounded border border-[var(--ml-line)] object-contain bg-white"
              />
            )}
          </div>
        ) : null}
        <ContactRow label="Locateur" value={member.landlord_name} />
        <ContactRow label="Téléphone locateur" value={member.landlord_phone} />
        {member.no_previous_landlord_contact ? (
          <ContactRow label="Locateur précédent" value="Aucun contact fourni" />
        ) : (
          <>
            <ContactRow label="Locateur précédent" value={member.previous_landlord_name} />
            <ContactRow
              label="Téléphone locateur précédent"
              value={member.previous_landlord_phone}
            />
          </>
        )}
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
  const [showRefuse, setShowRefuse] = useState(false);
  const [checklist, setChecklist] = useState<JanitorReviewChecklist>(EMPTY_CHECKLIST);
  const [stripBusy, setStripBusy] = useState(false);
  const [stripIdPreviewUrl, setStripIdPreviewUrl] = useState<string | null>(null);
  const [stripIdIsPdf, setStripIdIsPdf] = useState(false);
  const [stripIdError, setStripIdError] = useState<string | null>(null);
  const [identityFlash, setIdentityFlash] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (stripIdPreviewUrl) URL.revokeObjectURL(stripIdPreviewUrl);
    };
  }, [stripIdPreviewUrl]);

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

  async function openStripDoc(
    docId: number | null | undefined,
    failMessage: string
  ) {
    if (!docId) return;
    setStripIdError(null);
    setStripBusy(true);
    try {
      const blob = await fetchReviewDocumentBlob(token, docId, "inline");
      if (stripIdPreviewUrl) URL.revokeObjectURL(stripIdPreviewUrl);
      setStripIdIsPdf(
        blob.type.includes("pdf") || blob.type === "application/octet-stream"
      );
      setStripIdPreviewUrl(URL.createObjectURL(blob));
      const refreshed = await fetchJanitorReview(token);
      setReview(refreshed);
    } catch (err: unknown) {
      setStripIdError(err instanceof Error ? err.message : failMessage);
    } finally {
      setStripBusy(false);
    }
  }

  async function openStripId(member: JanitorReviewMember) {
    await openStripDoc(
      member.identity?.id_document_id,
      "Impossible d'ouvrir la pièce d'identité"
    );
  }

  async function openStripSelfie(member: JanitorReviewMember) {
    await openStripDoc(
      member.identity?.selfie_document_id,
      "Impossible d'ouvrir le selfie"
    );
  }

  async function confirmStrip(memberId: number, met: boolean) {
    setStripBusy(true);
    setStripIdError(null);
    setIdentityFlash(null);
    try {
      const updated = await confirmReviewMemberIdentity(token, memberId, met);
      setReview(updated);
      const member = updated.members.find((m) => m.id === memberId);
      const name = member?.name || "le locataire";
      if (met) {
        setIdentityFlash(`Rencontre confirmée pour ${name}.`);
      } else {
        setIdentityFlash(
          `Selfie demandé pour ${name}: un courriel avec le lien de vérification a été envoyé au demandeur.`
        );
      }
    } catch (err: unknown) {
      setStripIdError(
        err instanceof Error ? err.message : "Échec de la confirmation"
      );
    } finally {
      setStripBusy(false);
    }
  }

  async function runAction(
    action: "request_credit_check" | "accept" | "reject" | "offer_guarantor",
    extra?: {
      reason?: string;
      locale?: "fr" | "en";
      email_subject?: string;
      email_body?: string;
    }
  ): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitJanitorReview(token, {
        action,
        checklist: action === "request_credit_check" ? checklist : undefined,
        reason: action === "reject" ? extra?.reason : undefined,
        locale: action === "reject" ? extra?.locale : undefined,
        email_subject: action === "reject" ? extra?.email_subject : undefined,
        email_body: action === "reject" ? extra?.email_body : undefined,
      });
      setReview(updated);
      if (updated.checklist) setChecklist(updated.checklist);
      setShowRefuse(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "La mise à jour a échoué");
    } finally {
      setSubmitting(false);
    }
  }

  function onRejectCompose(values: RejectionComposeValues) {
    if (!values.email_body.trim()) {
      setError("Le message du courriel est obligatoire.");
      return;
    }
    if (review?.stage === "janitor" && !allChecked) {
      setError("Cochez les trois vérifications avant de refuser.");
      setShowRefuse(false);
      return;
    }
    void runAction("reject", values);
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
      {identityFlash ? (
        <p className={`${adminUi.alertSuccess} mt-4`}>{identityFlash}</p>
      ) : null}

      {review.stage !== "done" ? (
        <div className="mt-4">
          <IdentityGateBanner
            ready={review.identity?.ready_for_accept !== false}
            blockers={review.identity?.blockers}
            matchFlags={review.identity?.match_flags}
          />
          {/* Janitor: identity actions live inside Vérifications. Steve: strip if still blocked. */}
          {review.stage !== "janitor" ? (
            <IdentityUnlockStrip
              disabled={false}
              submitting={submitting || stripBusy}
              items={review.members
                .filter(
                  (m) =>
                    m.identity?.applies &&
                    m.identity.ready_for_accept === false
                )
                .map((m) => ({
                  memberId: m.id,
                  name: m.name,
                  identity: m.identity!,
                  onOpenId: () => openStripId(m),
                  onOpenSelfie: () => openStripSelfie(m),
                  onConfirmMet: () => confirmStrip(m.id, true),
                  onConfirmNotMet: () => confirmStrip(m.id, false),
                }))}
            />
          ) : null}
          {stripIdError ? (
            <p className={`${adminUi.alertError} mt-2`}>{stripIdError}</p>
          ) : null}
          {stripIdPreviewUrl ? (
            <div className="mt-3">
              {stripIdIsPdf ? (
                <iframe
                  title="Pièce d'identité"
                  src={stripIdPreviewUrl}
                  className="h-80 w-full rounded border border-[var(--ml-line)] bg-white"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stripIdPreviewUrl}
                  alt="Pièce d'identité"
                  className="max-h-96 w-full rounded border border-[var(--ml-line)] object-contain bg-white"
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {review.stage === "done" ? (
        <section className={`${adminUi.cardPad} ${adminUi.card} mt-6`}>
          <p className="text-sm text-[var(--ml-ink)]">
            {review.token_expired
              ? "Ce lien a expiré. La décision ne peut plus être modifiée ici."
              : review.status === "accepted"
                ? "Demande approuvée pour la signature du bail."
                : review.status === "rejected"
                  ? "Demande refusée."
                  : "Merci. La décision a déjà été enregistrée."}
          </p>
          {review.rejection_reason ? (
            <p className={`${adminUi.pageSubtitle} mt-2`}>
              Raison du refus : {review.rejection_reason}
            </p>
          ) : null}
          {review.rejection_email_body || review.rejection_email_subject ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-[var(--ml-ink)]">
                Voir le courriel envoyé
                {review.rejection_email_locale
                  ? ` (${review.rejection_email_locale.toUpperCase()})`
                  : ""}
              </summary>
              <div className="mt-2 space-y-2">
                {review.rejection_email_subject ? (
                  <p className="text-[var(--ml-steel)]">
                    Objet : {review.rejection_email_subject}
                  </p>
                ) : null}
                {review.rejection_email_body ? (
                  <pre className="whitespace-pre-wrap rounded border border-[var(--ml-line)] bg-white p-3 text-xs text-[var(--ml-ink)]">
                    {review.rejection_email_body}
                  </pre>
                ) : null}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <div className={`${adminUi.sectionGap} mt-6`}>
        {review.members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            token={token}
            disabled={review.stage === "done"}
            submitting={submitting}
            onIdentityUpdated={setReview}
            onIdentityFlash={setIdentityFlash}
          />
        ))}
      </div>

      {review.stage !== "done" ? (
        <section className={`${adminUi.card} mt-8`} id="verifications-section">
          <div className={adminUi.cardHeader}>
            <h2 className={adminUi.sectionTitle}>Vérifications</h2>
            <p className={adminUi.pageSubtitle}>
              {review.stage === "janitor"
                ? "Complétez identité et les trois appels/contrôles avant d’envoyer le dossier à Steve."
                : "Contrôles déjà faits par le concierge. Après le crédit, choisissez ci-dessous."}
            </p>
          </div>
          <div className={`${adminUi.cardPad} space-y-4`}>
            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-[var(--ml-ink)]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={review.identity?.ready_for_accept !== false}
                  disabled
                  readOnly
                />
                <span>
                  Identité confirmée (rencontre après ouverture de la pièce
                  d&apos;identité / selfie)
                  {review.stage === "janitor" &&
                  review.identity?.ready_for_accept === false ? (
                    <span className="mt-0.5 block text-[var(--ml-steel)]">
                      Ouvrez la pièce d&apos;identité, puis confirmez la
                      rencontre ou demandez un selfie ci-dessous.
                    </span>
                  ) : null}
                </span>
              </label>
              {(
                [
                  ["called_landlord", "J’ai appelé le(s) locateur(s)"],
                  ["called_employer", "J’ai appelé l’employeur / les RH"],
                  ["checked_social", "J’ai vérifié Facebook"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-start gap-3 text-sm text-[var(--ml-ink)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checklist[key]}
                    disabled={
                      review.stage !== "janitor" || submitting || showRefuse
                    }
                    onChange={(event) =>
                      setChecklist((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {review.stage === "janitor" &&
            review.identity?.ready_for_accept === false ? (
              <div className="space-y-3 border-t border-[var(--ml-line)] pt-3">
                <p className="text-sm font-medium text-[var(--ml-ink)]">
                  Identité des locataires
                </p>
                {review.members
                  .filter(
                    (m) =>
                      m.identity?.applies &&
                      m.identity.ready_for_accept === false
                  )
                  .map((m) => (
                    <MemberIdentityPanel
                      key={m.id}
                      memberId={m.id}
                      memberName={m.name}
                      identity={m.identity}
                      disabled={false}
                      submitting={submitting || stripBusy}
                      anchor
                      onOpenId={() => openStripId(m)}
                      onOpenSelfie={() => openStripSelfie(m)}
                      onConfirmMet={() => confirmStrip(m.id, true)}
                      onConfirmNotMet={() => confirmStrip(m.id, false)}
                    />
                  ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {review.stage === "janitor" ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
          <button
            type="button"
            disabled={
              !allChecked ||
              submitting ||
              review.identity?.ready_for_accept === false
            }
            className={`${adminUi.btnPrimary} disabled:opacity-50`}
            onClick={() => void runAction("request_credit_check")}
          >
            Prêt pour la vérification de crédit
          </button>
        </div>
      ) : null}

      {review.stage === "steve" ? (
        <SteveCreditDecision
          hasGuarantor={Boolean(review.has_guarantor)}
          offerSentAt={review.guarantor_offer_sent_at}
          submitting={submitting}
          showRefuse={showRefuse}
          acceptDisabled={review.identity?.ready_for_accept === false}
          acceptDisabledReason={
            review.identity?.ready_for_accept === false
              ? "Identité incomplète: la rencontre doit être confirmée pour chaque locataire."
              : null
          }
          loadRejectionDraft={({ locale, reason: draftReason }) =>
            fetchReviewRejectionEmailDraft(token, {
              locale,
              reason: draftReason,
            })
          }
          onApprove={() => void runAction("accept")}
          onOfferGuarantor={() => {
            const resend = Boolean(review.guarantor_offer_sent_at);
            const ok = window.confirm(
              resend
                ? "Renvoyer le courriel au demandeur pour proposer d'ajouter un garant?"
                : "Envoyer un courriel au demandeur pour proposer d'ajouter un garant?"
            );
            if (ok) void runAction("offer_guarantor");
          }}
          onShowRefuse={() => setShowRefuse(true)}
          onCancelRefuse={() => setShowRefuse(false)}
          onConfirmRefuse={onRejectCompose}
        />
      ) : null}

      {review.stage === "janitor" ? (
        <div className={`${adminUi.cardPad} ${adminUi.card} mt-6 space-y-3`}>
          {!showRefuse ? (
            <button
              type="button"
              disabled={submitting || !allChecked}
              className={`${adminUi.btnDanger} disabled:opacity-50`}
              onClick={() => setShowRefuse(true)}
            >
              Refuser
            </button>
          ) : (
            <RejectionEmailComposer
              loadDraft={({ locale, reason: draftReason }) =>
                fetchReviewRejectionEmailDraft(token, {
                  locale,
                  reason: draftReason,
                })
              }
              submitting={submitting}
              onCancel={() => setShowRefuse(false)}
              onConfirm={onRejectCompose}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
