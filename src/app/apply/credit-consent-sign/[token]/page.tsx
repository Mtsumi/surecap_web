import { Suspense } from "react";
import CreditConsentSignForm from "./CreditConsentSignForm";

type Props = { params: { token: string } };

export default function CreditConsentSignPage({ params }: Props) {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <Suspense fallback={<p className="text-sm text-[#78716c]">Loading…</p>}>
        <CreditConsentSignForm token={params.token} />
      </Suspense>
    </main>
  );
}
