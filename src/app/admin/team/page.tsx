"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import {
  AdminUser,
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/adminApi";

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
      <h1 className="text-lg font-semibold text-[#292524]">Équipe admin</h1>
      <p className="mt-1 text-sm text-[#78716c]">Super admin seulement</p>

      {error && <p className="mt-4 text-sm text-[#7f1d1d]">{error}</p>}
      {message && <p className="mt-4 text-sm text-[#1a3d22]">{message}</p>}

      <form
        onSubmit={onCreate}
        className="mt-6 space-y-3 rounded border border-[#e7e0d5] bg-[#fffef9] p-4"
      >
        <h2 className="text-sm font-medium text-[#292524]">Ajouter un admin</h2>
        <input
          type="email"
          required
          placeholder="Courriel"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-[#e7e0d5] px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Mot de passe temporaire"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-[#e7e0d5] px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-[#57534e]">
          <input
            type="checkbox"
            checked={isSuper}
            onChange={(e) => setIsSuper(e.target.checked)}
          />
          Super admin
        </label>
        <button
          type="submit"
          className="rounded bg-[#3d5a45] px-4 py-2 text-sm font-medium text-white"
        >
          Créer et envoyer le courriel
        </button>
      </form>

      <ul className="mt-8 divide-y divide-[#ebe5db] rounded border border-[#e7e0d5] bg-[#fffef9]">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="font-medium text-[#292524]">{u.email}</p>
              <p className="text-xs text-[#78716c]">
                {u.is_super_admin ? "Super admin" : "Admin"}
                {!u.active && " · Inactif"}
              </p>
            </div>
            {u.active && (
              <button
                type="button"
                onClick={() => deactivate(u)}
                className="text-sm text-[#7f1d1d] hover:underline"
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
