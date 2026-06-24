import { Suspense } from "react";
import InviteForm from "./InviteForm";

type Props = { params: { token: string } };

export default function InvitePage({ params }: Props) {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <Suspense fallback={<p className="text-sm text-[#78716c]">Loading…</p>}>
        <InviteForm token={params.token} />
      </Suspense>
    </main>
  );
}
