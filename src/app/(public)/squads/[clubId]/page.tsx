import type { Metadata } from "next";
import { Suspense } from "react";
import { SquadDetailClient } from "@/components/squad-detail-client";

export const metadata: Metadata = {
  title: "Club Squad",
  description: "Every player this club bought, in order of price — live from the auction.",
};

function SquadDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="h-6 w-32 animate-pulse rounded bg-white/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}

export default function SquadDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  return (
    <Suspense fallback={<SquadDetailSkeleton />}>
      <SquadDetailLoader params={params} />
    </Suspense>
  );
}

async function SquadDetailLoader({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <SquadDetailClient clubId={clubId} />;
}
