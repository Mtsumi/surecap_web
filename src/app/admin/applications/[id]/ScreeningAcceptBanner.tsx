"use client";

import { adminUi } from "@/lib/adminUi";

/** E-U3: show TAL/SOQUIJ dirty flags near Accept (optional note). */
export default function ScreeningAcceptBanner({
  concerns,
  reviews,
  acceptNote,
  onAcceptNoteChange,
  showNoteField,
}: {
  concerns: string[];
  reviews: string[];
  acceptNote: string;
  onAcceptNoteChange: (value: string) => void;
  showNoteField: boolean;
}) {
  if (!concerns.length && !reviews.length) return null;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">
        Signaux TAL / SOQUIJ — l&apos;acceptation reste possible
      </p>
      {concerns.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
            Préoccupations
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {concerns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {reviews.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            À vérifier
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {reviews.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {showNoteField ? (
        <label className="block text-sm text-[var(--ml-steel)]">
          Note d&apos;acceptation (optionnel)
          <textarea
            value={acceptNote}
            onChange={(e) => onAcceptNoteChange(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ex. vérifié avec le concierge — dossier TAL ancien / non pertinent"
            className={`${adminUi.input} mt-1 w-full`}
          />
        </label>
      ) : null}
    </div>
  );
}
