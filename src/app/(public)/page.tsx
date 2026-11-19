import Link from "next/link";
import {
  Radio,
  Shield,
  Users,
  Trophy,
  Gavel,
  ListOrdered,
  BadgeDollarSign,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import { SEGMENT_COUNT, PLAYERS_PER_SEGMENT, TOTAL_PLAYERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Official live auction display for the BUPL University Cricket Tournament. Watch every pick, every segment, every club — in real time.",
};

const FORMAT_FACTS = [
  { icon: Trophy, value: String(SEGMENT_COUNT), label: "Segments" },
  { icon: Users, value: String(TOTAL_PLAYERS), label: "Players" },
  { icon: Shield, value: "10", label: "Clubs" },
  { icon: ListOrdered, value: String(PLAYERS_PER_SEGMENT), label: "Per segment" },
];

const HOW_IT_WORKS = [
  {
    icon: Users,
    title: "50 players, 5 segments",
    body: "Each segment holds 10 players, auctioned in a randomized order confirmed by the auctioneers.",
  },
  {
    icon: BadgeDollarSign,
    title: "Base price, open room",
    body: "Every player enters with a predefined base price. Clubs bid live in the room — the highest valid bid wins.",
  },
  {
    icon: Gavel,
    title: "Live, official, final",
    body: "Results are recorded by the auction admin the moment the hammer falls. This display updates in real time.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.14),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 hidden size-[480px] -translate-y-1/2 rounded-full border border-amber-400/10 lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-1/2 hidden size-[320px] -translate-y-1/2 rounded-full border border-amber-400/20 lg:block"
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:gap-8 sm:px-6 sm:py-20 lg:py-28">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400 sm:text-[11px]">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              Official Auction
            </span>
          </div>
          <h1 className="max-w-4xl text-3xl font-black uppercase leading-[0.95] tracking-tight text-zinc-50 xs:text-4xl sm:text-6xl md:text-7xl">
            BUPL <span className="text-amber-400">Cricket</span> Auction
          </h1>
          <p className="max-w-2xl text-base text-zinc-400 sm:text-lg">
            The live, official display for the university cricket player auction —
            five segments, sixty players, and a handful of clubs fighting for
            their dream squad. Every result, as it happens.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/live"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-6 text-sm font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-amber-300 sm:w-auto"
            >
              <Radio className="size-5" aria-hidden />
              Watch the auction
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/squads"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-6 text-sm font-semibold uppercase tracking-wider text-zinc-200 transition-colors hover:border-amber-400/50 hover:text-amber-400 sm:w-auto"
            >
              View club squads
            </Link>
          </div>
        </div>
      </section>

      {/* Format facts */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-y divide-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {FORMAT_FACTS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 px-4 py-6 text-center"
            >
              <Icon className="mb-1 size-5 text-amber-400" aria-hidden />
              <span className="text-3xl font-black tabular-nums text-zinc-50">{value}</span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
          How the room works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
            >
              <Icon className="mb-3 size-6 text-amber-400" aria-hidden />
              <h3 className="mb-1.5 font-bold text-zinc-100">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
