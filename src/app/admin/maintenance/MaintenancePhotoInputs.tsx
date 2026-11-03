"use client";

import { useRef, useState } from "react";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { adminUi } from "@/lib/adminUi";

type Props = {
  disabled?: boolean;
  /** Gallery picker may add several files at once (new ticket). Detail uploads one-by-one. */
  multipleBrowse?: boolean;
  /** Detail: one “Add more photos” control; create: separate take / choose buttons. */
  variant?: "create" | "detail";
  onFiles: (files: File[]) => void;
  t: (key: AdminMessageKey) => string;
};

/** Copy files then reset input on next task — avoids React 19 removeChild during onChange. */
function handleFileInputChange(
  input: HTMLInputElement,
  onFiles: (files: File[]) => void
) {
  const list = input.files;
  if (!list?.length) return;
  const files = Array.from(list);
  window.setTimeout(() => {
    onFiles(files);
    input.value = "";
  }, 0);
}

export default function MaintenancePhotoInputs({
  disabled,
  multipleBrowse = true,
  variant = "create",
  onFiles,
  t,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const openCamera = () => {
    setMenuOpen(false);
    cameraRef.current?.click();
  };

  const openBrowse = () => {
    setMenuOpen(false);
    browseRef.current?.click();
  };

  return (
    <div className="relative mt-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] h-px w-px opacity-0"
        onChange={(e) => handleFileInputChange(e.currentTarget, onFiles)}
      />
      <input
        ref={browseRef}
        type="file"
        accept="image/*"
        multiple={multipleBrowse}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] h-px w-px opacity-0"
        onChange={(e) => handleFileInputChange(e.currentTarget, onFiles)}
      />

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
          <button
            type="button"
            className={adminUi.btnSecondary}
            disabled={disabled}
            onClick={openCamera}
          >
            {t("maintenancePhotoTake")}
          </button>
          <button
            type="button"
            className={adminUi.btnSecondary}
            disabled={disabled}
            onClick={openBrowse}
          >
            {t("maintenancePhotoChooseFiles")}
          </button>
        </div>
      )}
    </div>
  );
}
