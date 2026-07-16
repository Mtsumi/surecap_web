"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import {
  AdminUser,
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";

export default function TeamPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    listAdminUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await createAdminUser({ email: email.trim(), password, is_super_admin: isSuper });
      setEmail("");
      setPassword("");
      setIsSuper(false);
      setMessage("Compte créé — courriel de bienvenue envoyé.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const deactivate = async (user: AdminUser) => {
    if (!confirm(`Désactiver ${user.email}?`)) return;
    try {
      await updateAdminUser(user.id, { active: false });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <AdminShell>
      <h1 className={adminUi.pageTitle}>Équipe admin</h1>
      <p className={adminUi.pageSubtitle}>Super admin seulement</p>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {message ? <p className={`${adminUi.alertSuccess} mt-4`}>{message}</p> : null}

      <form onSubmit={onCreate} className={`${adminUi.cardPad} ${adminUi.card} mt-6 space-y-4`}>
        <h2 className={adminUi.sectionTitle}>Ajouter un admin</h2>
        <label className="block text-sm text-[var(--ml-steel)]">
          Courriel
          <input
            type="email"
            required
            placeholder="Courriel"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={adminUi.input}
          />
        </label>
        <label className="block text-sm text-[var(--ml-steel)]">
          Mot de passe temporaire
          <input
            type="password"
            required
            minLength={8}
            placeholder="Mot de passe temporaire"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={adminUi.input}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--ml-ink)]">
          <input
            type="checkbox"
            checked={isSuper}
            onChange={(e) => setIsSuper(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--ml-line)]"
          />
          Super admin
        </label>
        <button type="submit" className={adminUi.btnPrimary}>
          Créer et envoyer le courriel
        </button>
      </form>

      <ul className={`${adminUi.list} mt-8`}>
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 !py-4">
            <div>
              <p className="font-semibold text-[var(--ml-ink)]">{u.email}</p>
              <p className="text-xs text-[var(--ml-steel)]">
                {u.is_super_admin ? "Super admin" : "Admin"}
                {!u.active && " · Inactif"}
              </p>
            </div>
            {u.active && (
              <button
                type="button"
                onClick={() => deactivate(u)}
                className={adminUi.btnDanger + " !px-3 !py-1.5 !text-xs"}
              >
                Désactiver
              </button>
            )}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
