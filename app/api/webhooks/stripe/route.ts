import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { paidEntitlements } from "@/db/schema";

function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const elements = signature.split(",");
  const timestamp = elements
    .find((e) => e.startsWith("t="))
    ?.slice(2);
  const sig = elements
    .find((e) => e.startsWith("v1="))
    ?.slice(3);

  if (!timestamp || !sig) return false;

  // Reject if timestamp is older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !verifyStripeSignature(body, signature, secret)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const event = JSON.parse(body);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = (session.customer_email || session.customer_details?.email || "")
      .toLowerCase()
      .trim();

    if (email) {
      await db.insert(paidEntitlements).values({
        email,
        stripeCustomerId: session.customer || null,
        stripeSessionId: session.id || null,
      });
    }
  }

  return NextResponse.json({ received: true });
}
