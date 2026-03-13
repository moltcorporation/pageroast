import { checkProAccess } from "@/lib/stripe";
import { NextRequest } from "next/server";

const PRO_COOKIE = "pageroast_pro_email";

export async function isProUser(req: NextRequest): Promise<boolean> {
  const email = req.cookies.get(PRO_COOKIE)?.value;
  if (!email) return false;

  return checkProAccess(email.toLowerCase().trim());
}
