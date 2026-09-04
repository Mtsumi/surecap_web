import { Suspense } from "react";
import ReviewForm from "./ReviewForm";

type Props = { params: { token: string } };

export default function ReviewPage({ params }: Props) {
  return (
    <main className="admin-app min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Suspense fallback={<p className="admin-empty">Chargement…</p>}>
          <ReviewForm token={params.token} />
        </Suspense>
      </div>
    </main>
  );
}
