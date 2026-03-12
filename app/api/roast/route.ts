import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { roasts } from "@/db/schema";
import { createHash } from "crypto";

const anthropic = new Anthropic();

const CATEGORIES = [
  "Headline Clarity",
  "CTA Strength",
  "Trust Signals",
  "Visual Hierarchy",
  "Copy Quality",
  "Mobile-Readiness",
] as const;

type Category = (typeof CATEGORIES)[number];

interface CategoryScore {
  category: Category;
  score: number;
  justification: string;
  fix: string;
}

interface RoastResult {
  scores: CategoryScore[];
  overallScore: number;
  roastSummary: string;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

function buildPrompt(text: string, title: string, url: string): string {
  return `You are PageRoast — a brutally honest but constructive landing page critic. You've seen thousands of landing pages and you know exactly what converts and what doesn't.

You are analyzing the landing page at: ${url}
Page title: ${title}

Here is the extracted text content of the page:
---
${text.slice(0, 8000)}
---

Score this page on each of these 6 categories from 1 to 10. For each category, give a one-line justification that references SPECIFIC elements you found (or didn't find) on this page. Then give one concrete, specific fix — not generic advice.

Categories:
1. Headline Clarity — Is the main headline immediately clear about what the product does and who it's for?
2. CTA Strength — Are the calls-to-action compelling, visible, and specific? Do they create urgency?
3. Trust Signals — Are there testimonials, logos, stats, guarantees, or other proof elements?
4. Visual Hierarchy — Does the page guide the eye from headline → value prop → proof → CTA?
5. Copy Quality — Is the writing concise, benefit-focused, and free of jargon or fluff?
6. Mobile-Readiness — Does the content structure suggest it'll work well on small screens?

Then write an overall score (1-10, weighted average biased toward the weakest category) and a roast summary — 2-3 sentences that are sharp, memorable, and a little funny, but ultimately helpful. Think "tough love from a friend who wants you to succeed."

Respond ONLY with valid JSON in this exact format:
{
  "scores": [
    {"category": "Headline Clarity", "score": 7, "justification": "...", "fix": "..."},
    {"category": "CTA Strength", "score": 4, "justification": "...", "fix": "..."},
    {"category": "Trust Signals", "score": 3, "justification": "...", "fix": "..."},
    {"category": "Visual Hierarchy", "score": 6, "justification": "...", "fix": "..."},
    {"category": "Copy Quality", "score": 5, "justification": "...", "fix": "..."},
    {"category": "Mobile-Readiness", "score": 7, "justification": "...", "fix": "..."}
  ],
  "overallScore": 5,
  "roastSummary": "..."
}`;
}

function parseRoastResponse(content: string): RoastResult {
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response.");

  const parsed = JSON.parse(jsonMatch[0]);

  if (
    !parsed.scores ||
    !Array.isArray(parsed.scores) ||
    parsed.scores.length !== 6
  ) {
    throw new Error("Invalid scores format in AI response.");
  }

  if (typeof parsed.overallScore !== "number" || !parsed.roastSummary) {
    throw new Error("Missing overallScore or roastSummary.");
  }

  return {
    scores: parsed.scores,
    overallScore: Math.min(10, Math.max(1, Math.round(parsed.overallScore))),
    roastSummary: parsed.roastSummary,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required." },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL." },
        { status: 400 }
      );
    }

    // Step 1: Screenshot and extract content
    const screenshotBaseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      req.nextUrl.origin;

    const screenshotRes = await fetch(`${screenshotBaseUrl}/api/screenshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!screenshotRes.ok) {
      const err = await screenshotRes.json().catch(() => null);
      return NextResponse.json(
        { error: err?.error || "Failed to capture screenshot." },
        { status: screenshotRes.status }
      );
    }

    const screenshotData = await screenshotRes.json();

    // Step 2: Send to Claude for analysis
    const prompt = buildPrompt(
      screenshotData.text,
      screenshotData.title,
      url
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: screenshotData.screenshot.replace(
                  "data:image/png;base64,",
                  ""
                ),
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const aiText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Step 3: Parse the response
    const roastResult = parseRoastResponse(aiText);

    // Step 4: Store in database
    const ipHash = getClientIp(req);

    const [inserted] = await db
      .insert(roasts)
      .values({
        url,
        screenshotUrl: screenshotData.screenshot,
        scores: roastResult.scores,
        roastText: roastResult.roastSummary,
        overallScore: roastResult.overallScore,
        pageContent: screenshotData.text.slice(0, 50_000),
        ipHash,
      })
      .returning({ id: roasts.id });

    // Step 5: Return result
    return NextResponse.json({
      id: inserted.id,
      url,
      scores: roastResult.scores,
      overallScore: roastResult.overallScore,
      roastSummary: roastResult.roastSummary,
      screenshotUrl: screenshotData.screenshot,
    });
  } catch (err) {
    console.error("Roast API error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}
