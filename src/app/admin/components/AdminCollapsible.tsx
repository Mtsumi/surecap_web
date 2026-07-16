"use client";

import { useState, type ReactNode } from "react";
import { adminUi } from "@/lib/adminUi";

type AdminCollapsibleProps = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  compact?: boolean;
};

export default function AdminCollapsible({
  title,
  subtitle,
  badge,
  defaultOpen = true,
  children,
  className = "",
  bodyClassName = "",
  compact = false,
}: AdminCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`${adminUi.card} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={
          compact
            ? "admin-collapsible-trigger admin-collapsible-trigger-compact"
            : "admin-collapsible-trigger"
        }
      >
        <div className="min-w-0">
          <h2 className={compact ? "text-sm font-semibold text-[var(--ml-ink)]" : adminUi.sectionTitle}>
            {title}
          </h2>
          {subtitle ? (
            <p className={compact ? "mt-0.5 text-xs text-[var(--ml-steel)]" : adminUi.pageSubtitle}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <span className="admin-collapsible-chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </div>
      </button>
      {open ? (
        <div
          className={`border-t border-[var(--ml-line)] ${compact ? "px-4 py-3 sm:px-5" : adminUi.cardPad} ${bodyClassName}`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
