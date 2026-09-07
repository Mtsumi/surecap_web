"use client";

import { useEffect, useRef, useState } from "react";
import { Locale, t } from "@/lib/i18n";

const DOCUSEAL_SCRIPT_SRC = "https://cdn.docuseal.com/js/form.js";
const DOCUSEAL_FORM_BASE = "https://docuseal.com/s/";

/** Shared loader so multiple mounts await the same script. */
let docusealScriptPromise: Promise<void> | null = null;

function loadDocusealScript(): Promise<void> {
  if (typeof window !== "undefined" && window.customElements?.get("docuseal-form")) {
    return Promise.resolve();
  }
  if (docusealScriptPromise) return docusealScriptPromise;

  docusealScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${DOCUSEAL_SCRIPT_SRC}"]`
    );
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        docusealScriptPromise = null;
        reject(new Error("Failed to load DocuSeal"));
      },
      { once: true }
    );
    if (!existing) {
      script.src = DOCUSEAL_SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return docusealScriptPromise;
}

type Props = {
  locale: Locale;
  /** DocuSeal submitter slug returned by the credit-consent endpoint. */
  slug: string;
  /** Prefills the signer identity inside the embedded form. */
  email?: string;
  name?: string;
  onCompleted: () => void;
};

/**
 * Embedded DocuSeal signing form (declaration + credit history search form).
 * Fires `onCompleted` when the applicant finishes signing.
 */
export default function DocusealSign({ locale, slug, email, name, onCompleted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompletedRef = useRef(onCompleted);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    let cancelled = false;
    let form: HTMLElement | null = null;
    const handleCompleted = () => onCompletedRef.current();

    void loadDocusealScript()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        container.innerHTML = "";
        form = document.createElement("docuseal-form");
        form.setAttribute("data-src", `${DOCUSEAL_FORM_BASE}${slug}`);
        if (email) form.setAttribute("data-email", email);
        if (name) form.setAttribute("data-name", name);
        form.setAttribute("data-language", locale);
        form.addEventListener("completed", handleCompleted);
        container.appendChild(form);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      form?.removeEventListener("completed", handleCompleted);
    };
  }, [slug, email, name, locale]);

  if (loadFailed) {
    return (
      <p className="text-sm text-[#b91c1c]" role="alert">
        {t(locale, "consentEmbedFailed")}
      </p>
    );
  }
  return <div ref={containerRef} className="min-h-[320px]" />;
}
