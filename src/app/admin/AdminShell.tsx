"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminUser, adminMe } from "@/lib/adminApi";
import { clearAdminToken, isAdminLoggedIn } from "@/lib/adminAuth";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      router.replace("/admin/login");
      return;
    }
    adminMe()
      .then(setUser)
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    clearAdminToken();
    router.replace("/admin/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#78716c]">
        Chargement…
      </div>
    );
  }

  const nav = [
    { href: "/admin/applications", label: "Demandes" },
    { href: "/admin/buildings", label: "Immeubles" },
    ...(user?.is_super_admin ? [{ href: "/admin/team", label: "Équipe" }] : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#e7e0d5] bg-[#fffef9]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#78716c]">
              SureCap Admin
            </p>
            <p className="text-sm text-[#57534e]">{user?.email}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm ${
                  pathname.startsWith(item.href)
                    ? "font-medium text-[#3d5a45]"
                    : "text-[#57534e] hover:underline"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={logout}
              className="text-sm text-[#78716c] hover:underline"
            >
              Déconnexion
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
