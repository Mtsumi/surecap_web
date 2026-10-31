"use client";

import { useRef } from "react";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { adminUi } from "@/lib/adminUi";

type Props = {
  disabled?: boolean;
  /** Gallery picker may add several files at once (new ticket). Detail uploads one-by-one. */
  multipleBrowse?: boolean;
  onFiles: (files: File[]) => void;
  t: (key: AdminMessageKey) => string;
};

export default function MaintenancePhotoInputs({
  disabled,
  multipleBrowse = true,
  onFiles,
  t,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLInputElement>(null);

  const absorb = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list));
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          absorb(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={browseRef}
        type="file"
        accept="image/*"
        multiple={multipleBrowse}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          absorb(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className={adminUi.btnSecondary}
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
      >
        {t("maintenancePhotoTake")}
      </button>
      <button
        type="button"
        className={adminUi.btnSecondary}
        disabled={disabled}
        onClick={() => browseRef.current?.click()}
      >
        {t("maintenancePhotoChooseFiles")}
      </button>
    </div>
  );
}
