"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
);

type VisitOut = {
  ticket_id: number;
  title: string;
  building_name: string | null;
  unit_number: string | null;
  location_label: string | null;
  status: string;
  visit_window_start: string | null;
  visit_window_end: string | null;
  tenant_reply: string | null;
  token_used: boolean;
  token_expired: boolean;
};

type Envelope<T> = { data: T; message?: string; error?: string | null };

function errorFromBody(json: Envelope<VisitOut> & { detail?: unknown }, status: number): string {
  if (typeof json.detail === "string") return json.detail;
  if (json.message) return json.message;
  if (json.error) return json.error;
  return `HTTP ${status}`;
}

async function fetchVisit(token: string): Promise<VisitOut> {
  const res = await fetch(`${API_URL}/public/maintenance/visit/${encodeURIComponent(token)}`, {
    headers: API_URL.includes("ngrok") ? { "ngrok-skip-browser-warning": "1" } : undefined,
  });
  const json = (await res.json()) as Envelope<VisitOut> & { detail?: unknown };
  if (!res.ok) throw new Error(errorFromBody(json, res.status));
  if (!json.data) throw new Error("Réponse invalide");
  return json.data;
}

async function postReply(token: string, decision: "yes" | "no"): Promise<VisitOut> {
  const res = await fetch(`${API_URL}/public/maintenance/visit/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_URL.includes("ngrok") ? { "ngrok-skip-browser-warning": "1" } : {}),
    },
    body: JSON.stringify({ decision }),
  });
  const json = (await res.json()) as Envelope<VisitOut> & { detail?: unknown };
  if (!res.ok) throw new Error(errorFromBody(json, res.status));
  if (!json.data) throw new Error("Réponse invalide");
  return json.data;
}

function formatWindow(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  return `${new Date(start).toLocaleString()} – ${new Date(end).toLocaleString()}`;
}

function VisitReplyClient() {
  const params = useParams();
  const search = useSearchParams();
  const token = String(params.token || "");
  const preset = (search.get("decision") || "").toLowerCase();
  const [visit, setVisit] = useState<VisitOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const autoTried = useRef(false);

  const load = useCallback(() => {
    if (!token) return;
    setError(null);
    fetchVisit(token)
      .then(setVisit)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!visit || done || busy || autoTried.current) return;
    if (visit.token_used || visit.token_expired || visit.status !== "awaiting_tenant") return;
    if (preset !== "yes" && preset !== "no") return;
    autoTried.current = true;
    setBusy(true);
    postReply(token, preset)
      .then((updated) => {
        setVisit(updated);
        setDone(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setBusy(false));
  }, [visit, preset, token, done, busy]);

  const onDecide = async (decision: "yes" | "no") => {
    setBusy(true);
    setError(null);
    try {
      const updated = await postReply(token, decision);
      setVisit(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const place =
    visit?.unit_number != null
      ? `#${visit.unit_number}`
      : visit?.location_label || "";

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-10 text-[#1c1917]">
      <div className="mx-auto w-full max-w-lg rounded-xl border border-[#e7e0d6] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-[#8b4513]">Montreal Living</p>
        <h1 className="mt-2 text-2xl font-semibold">Visite d&apos;entretien</h1>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {!visit && !error ? <p className="mt-4 text-sm text-[#57534e]">Chargement…</p> : null}
        {visit ? (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              <strong>#{visit.ticket_id}</strong> {visit.title}
            </p>
            <p>
              {visit.building_name || "—"}
              {place ? ` · ${place}` : ""}
            </p>
            <p>
              Créneau : <strong>{formatWindow(visit.visit_window_start, visit.visit_window_end)}</strong>
            </p>
            {visit.token_expired ? (
              <p className="text-amber-800">Ce lien a expiré. Contactez Montreal Living.</p>
            ) : null}
            {visit.token_used || visit.tenant_reply ? (
              <p className="text-[#166534]">
                Réponse enregistrée :{" "}
                <strong>
                  {visit.tenant_reply === "yes"
                    ? "Oui"
                    : visit.tenant_reply === "no"
                      ? "Non"
                      : "—"}
                </strong>
              </p>
            ) : null}
            {!visit.token_used &&
            !visit.token_expired &&
            visit.status === "awaiting_tenant" &&
            !done ? (
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDecide("yes")}
                  className="rounded-lg bg-[#166534] px-4 py-3 font-medium text-white disabled:opacity-60"
                >
                  Oui, je suis disponible
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDecide("no")}
                  className="rounded-lg border border-[#d6d3d1] bg-white px-4 py-3 font-medium text-[#1c1917] disabled:opacity-60"
                >
                  Non, un autre moment
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function MaintenanceVisitPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm">Chargement…</main>}>
      <VisitReplyClient />
    </Suspense>
  );
}
