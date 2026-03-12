import { db } from "@/db";
import { paidEntitlements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";

const PRO_COOKIE = "pageroast_pro_email";

export async function isProUser(req: NextRequest): Promise<boolean> {
  const email = req.cookies.get(PRO_COOKIE)?.value;
  if (!email) return false;

  const [entitlement] = await db
    .select()
    .from(paidEntitlements)
    .where(
      and(
        eq(paidEntitlements.email, email.toLowerCase().trim()),
        eq(paidEntitlements.active, true)
      )
    )
    .limit(1);

  return !!entitlement;
}
