import { Suspense } from "react";
import ApplyForm from "./ApplyForm";

export default function ApplyPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading…</p>}>
      <ApplyForm />
    </Suspense>
  );
}
