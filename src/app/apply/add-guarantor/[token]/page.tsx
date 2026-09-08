import { Suspense } from "react";
import AddGuarantorForm from "./AddGuarantorForm";

type Props = { params: { token: string } };

export default function AddGuarantorPage({ params }: Props) {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Suspense fallback={<p className="text-sm text-[#78716c]">Loading…</p>}>
        <AddGuarantorForm token={params.token} />
      </Suspense>
    </main>
  );
}
