import { db } from "@/db";
import { roasts } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { NextRequest } from "next/server";

const FREE_LIMIT = 1;
const WINDOW_HOURS = 24;

export function hashIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  ipHash: string
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roasts)
    .where(
      and(eq(roasts.ipHash, ipHash), gte(roasts.createdAt, windowStart))
    );

  const used = result?.count ?? 0;

  if (used >= FREE_LIMIT) {
    // Find the oldest roast in the window to calculate retry time
    const [oldest] = await db
      .select({ createdAt: roasts.createdAt })
      .from(roasts)
      .where(
        and(eq(roasts.ipHash, ipHash), gte(roasts.createdAt, windowStart))
      )
      .orderBy(roasts.createdAt)
      .limit(1);

    const retryAfterMs = oldest?.createdAt
      ? oldest.createdAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000 - Date.now()
      : 0;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    };
  }

  return { allowed: true, remaining: FREE_LIMIT - used };
}

export function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
