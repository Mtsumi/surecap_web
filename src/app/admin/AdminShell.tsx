"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminUser, adminMe } from "@/lib/adminApi";
import { clearAdminToken, isAdminLoggedIn } from "@/lib/adminAuth";
import { useAdminLocaleContext } from "./AdminLocaleContext";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

function roleLabel(user: AdminUser, locale: "fr" | "en"): string {
  if (user.is_super_admin) {
    return locale === "fr" ? "Superadministrateur" : "Super admin";
  }
  return locale === "fr" ? "Administrateur" : "Administrator";
}

function navShortLabel(label: string): string {
  return label.charAt(0).toUpperCase();
}

let cachedAdminUser: AdminUser | null = null;

export function clearCachedAdminUser(): void {
  cachedAdminUser = null;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, toggleLocale, locale } = useAdminLocaleContext();
  const [user, setUser] = useState<AdminUser | null>(cachedAdminUser);
  const [loading, setLoading] = useState(!cachedAdminUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      router.replace("/admin/login");
      return;
    }

    let cancelled = false;

    if (cachedAdminUser) {
      setUser(cachedAdminUser);
      setLoading(false);
      adminMe()
        .then((me) => {
          if (cancelled) return;
          cachedAdminUser = me;
          setUser(me);
        })
        .catch(() => {
          if (!cancelled) {
            clearCachedAdminUser();
            router.replace("/admin/login");
          }
        });
      return () => {
        cancelled = true;
      };
    }

    adminMe()
      .then((me) => {
        if (cancelled) return;
        cachedAdminUser = me;
        setUser(me);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.replace("/admin/login");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (
      user?.must_change_password &&
      !pathname.startsWith("/admin/account")
    ) {
      router.replace("/admin/account?required=1");
    }
  }, [user, pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const logout = () => {
    clearCachedAdminUser();
    clearAdminToken();
    router.replace("/admin/login");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((value) => {
      const next = !value;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  if (loading) {
    return (
      <div className="admin-app flex min-h-screen items-center justify-center bg-[var(--ml-paper)] text-sm text-[var(--ml-steel)]">
        {t("loading")}
      </div>
    );
  }

  const passwordChangeRequired = user?.must_change_password ?? false;

  const fullNav = [
    { href: "/admin/applications", label: t("navApplications") },
    { href: "/admin/buildings", label: t("navBuildings") },
    ...(user?.is_super_admin ? [{ href: "/admin/team", label: t("navTeam") }] : []),
    { href: "/admin/account", label: t("navAccount") },
  ];

  const nav = passwordChangeRequired
    ? [{ href: "/admin/account", label: t("navAccount") }]
    : fullNav;

  const showCollapsed = sidebarCollapsed && !mobileOpen;

  const navLinkClass = (href: string) => {
    const active = pathname.startsWith(href);
    return [
      "rounded-lg text-sm transition-colors",
      showCollapsed ? "flex h-10 w-10 items-center justify-center" : "px-3 py-2.5",
      active
        ? "bg-[#243444] font-semibold text-white"
        : "text-[#C5CDD6] hover:bg-[#243444]/80 hover:text-white",
    ].join(" ");
  };

  const sidebar = (
    <>
      <div className={`flex items-start justify-between gap-3 ${showCollapsed ? "justify-center" : ""}`}>
        <div className={showCollapsed ? "text-center" : ""}>
          <p className="font-[family-name:var(--font-admin-display)] text-xl font-extrabold tracking-[0.02em] text-white">
            {showCollapsed ? "ML" : t("brand")}
          </p>
          {!showCollapsed ? (
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9AA7B3]">
              {t("slogan")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-[#9AA7B3] hover:text-white md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {user && !showCollapsed ? (
        <div className="mt-5 rounded-lg border border-[#3A4C5E] bg-[#243444] px-3 py-2.5">
          <p className="truncate text-xs text-[#9AA7B3]">{user.email}</p>
          <p className="mt-0.5 text-sm font-medium text-white">{roleLabel(user, locale)}</p>
        </div>
      ) : null}

      <nav className={`mt-6 flex flex-1 flex-col gap-1 ${showCollapsed ? "items-center" : ""}`}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={showCollapsed ? item.label : undefined}
            className={navLinkClass(item.href)}
          >
            {showCollapsed ? navShortLabel(item.label) : item.label}
          </Link>
        ))}
      </nav>

      {!mobileOpen ? (
        <button
          type="button"
          onClick={toggleSidebar}
          className="admin-sidebar-toggle"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "→" : "← Réduire"}
        </button>
      ) : null}

      <div
        className={`mt-2 flex flex-col gap-2 border-t border-[#3A4C5E] pt-4 ${
          showCollapsed ? "items-center" : ""
        }`}
      >
        <button
          type="button"
          onClick={toggleLocale}
          title={showCollapsed ? t("langToggle") : undefined}
          className={`rounded-lg text-sm text-[#9AA7B3] hover:bg-[#243444] hover:text-white ${
            showCollapsed ? "flex h-10 w-10 items-center justify-center" : "px-3 py-2 text-left"
          }`}
        >
          {showCollapsed ? (locale === "fr" ? "EN" : "FR") : t("langToggle")}
        </button>
        <button
          type="button"
          onClick={logout}
          title={showCollapsed ? t("logout") : undefined}
          className={`rounded-lg text-sm text-[#9AA7B3] hover:bg-[#243444] hover:text-white ${
            showCollapsed ? "flex h-10 w-10 items-center justify-center text-xs" : "px-3 py-2 text-left"
          }`}
        >
          {showCollapsed ? "Out" : t("logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-app flex min-h-screen bg-[var(--ml-paper)] text-[var(--ml-ink)]">
      <aside
        className={`hidden shrink-0 flex-col bg-[var(--ml-ink)] p-4 transition-[width] duration-200 md:flex ${
          sidebarCollapsed ? "w-[72px]" : "w-[220px]"
        }`}
      >
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[240px] flex-col bg-[var(--ml-ink)] p-4 shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--ml-line)] bg-[var(--ml-card)] px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-[var(--ml-line)] px-2.5 py-1.5 text-sm text-[var(--ml-ink)]"
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-admin-display)] text-sm font-extrabold tracking-wide">
              {t("brand")}
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-[var(--ml-steel)]">
              {t("slogan")}
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
