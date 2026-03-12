import { db } from "@/db";
import { roasts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface CategoryScore {
  category: string;
  score: number;
  justification: string;
  fix: string;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-500";
  if (score >= 5) return "text-yellow-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [roast] = await db.select().from(roasts).where(eq(roasts.id, id)).limit(1);

  if (!roast) return { title: "Roast not found — PageRoast" };

  return {
    title: `${roast.overallScore}/10 — ${roast.url} | PageRoast`,
    description: roast.roastText || "See the full roast report.",
  };
}

export default async function RoastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [roast] = await db.select().from(roasts).where(eq(roasts.id, id)).limit(1);

  if (!roast) notFound();

  const scores = (roast.scores as CategoryScore[]) || [];

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            &larr; PageRoast
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-black dark:text-white">
            Roast Report
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-md mx-auto">
            {roast.url}
          </p>
        </div>

        {/* Overall Score */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${
              (roast.overallScore ?? 0) >= 8
                ? "border-green-500"
                : (roast.overallScore ?? 0) >= 5
                  ? "border-yellow-500"
                  : "border-red-500"
            }`}
          >
            <span
              className={`text-5xl font-bold ${scoreColor(roast.overallScore ?? 0)}`}
            >
              {roast.overallScore}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            out of 10
          </p>
        </div>

        {/* Roast Summary */}
        {roast.roastText && (
          <div className="mb-10 rounded-xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-medium italic text-black dark:text-white">
              &ldquo;{roast.roastText}&rdquo;
            </p>
          </div>
        )}

        {/* Screenshot */}
        {roast.screenshotUrl && (
          <div className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Page Screenshot
            </h2>
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={roast.screenshotUrl}
                alt={`Screenshot of ${roast.url}`}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Category Scores */}
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Category Breakdown
          </h2>
          <div className="space-y-4">
            {scores.map((cat) => (
              <div
                key={cat.category}
                className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-black dark:text-white">
                    {cat.category}
                  </h3>
                  <span
                    className={`text-2xl font-bold ${scoreColor(cat.score)}`}
                  >
                    {cat.score}/10
                  </span>
                </div>
                {/* Score bar */}
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${scoreBg(cat.score)}`}
                    style={{ width: `${cat.score * 10}%` }}
                  />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {cat.justification}
                </p>
                <p className="mt-2 text-sm font-medium text-black dark:text-white">
                  Fix: {cat.fix}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-black px-8 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Roast another page
          </Link>
        </div>
      </div>
    </div>
  );
}
