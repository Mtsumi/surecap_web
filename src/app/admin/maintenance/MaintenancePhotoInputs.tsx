"use client";

import { useState } from "react";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { adminUi } from "@/lib/adminUi";
import { pickMaintenancePhotos } from "./pickMaintenancePhotos";

type Props = {
  disabled?: boolean;
  multipleBrowse?: boolean;
  variant?: "create" | "detail";
  onFiles: (files: File[]) => void;
  t: (key: AdminMessageKey) => string;
};

export default function MaintenancePhotoInputs({
  disabled,
  multipleBrowse = true,
  variant = "create",
  onFiles,
  t,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const openCamera = () => {
    if (disabled) return;
    setMenuOpen(false);
    pickMaintenancePhotos({ capture: true, onFiles });
  };

  const openBrowse = () => {
    if (disabled) return;
    setMenuOpen(false);
    pickMaintenancePhotos({ multiple: multipleBrowse, onFiles });
  };

  return (
    <div className="relative mt-2">
      {variant === "detail" ? (
        <>
          <button
            type="button"
            className={adminUi.btnSecondary}
            disabled={disabled}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {t("maintenancePhotoAddMore")}
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute left-0 z-10 mt-1 min-w-[12rem] rounded-lg border border-[var(--ml-line)] bg-[var(--ml-card)] py-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--ml-ink)] hover:bg-[var(--ml-paper)]"
                disabled={disabled}
                onClick={openCamera}
              >
                {t("maintenancePhotoTake")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--ml-ink)] hover:bg-[var(--ml-paper)]"
                disabled={disabled}
                onClick={openBrowse}
              >
                {t("maintenancePhotoChooseFiles")}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminUi.btnSecondary} disabled={disabled} onClick={openCamera}>
            {t("maintenancePhotoTake")}
          </button>
          <button type="button" className={adminUi.btnSecondary} disabled={disabled} onClick={openBrowse}>
            {t("maintenancePhotoChooseFiles")}
          </button>
        </div>
      )}
    </div>
  );
}
