import { ImageResponse } from "next/og";
import { db } from "@/db";
import { roasts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const alt = "PageRoast Score Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface CategoryScore {
  category: string;
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 5) return "#eab308";
  return "#ef4444";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [roast] = await db
    .select()
    .from(roasts)
    .where(eq(roasts.id, id))
    .limit(1);

  if (!roast) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#09090b",
            color: "#fff",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Roast not found
        </div>
      ),
      { ...size }
    );
  }

  const scores = (roast.scores as CategoryScore[]) || [];
  const overall = roast.overallScore ?? 0;
  const displayUrl =
    roast.url.length > 40 ? roast.url.slice(0, 40) + "..." : roast.url;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          padding: "48px 56px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              PageRoast
            </span>
            <span
              style={{
                fontSize: 20,
                color: "#a1a1aa",
                marginTop: 4,
              }}
            >
              {displayUrl}
            </span>
          </div>

          {/* Overall Score Circle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 140,
              height: 140,
              borderRadius: 70,
              border: `6px solid ${scoreColor(overall)}`,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: scoreColor(overall),
              }}
            >
              {overall}
            </span>
          </div>
        </div>

        {/* Category Scores */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
          }}
        >
          {scores.map((cat) => (
            <div
              key={cat.category}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  color: "#a1a1aa",
                  width: 200,
                  flexShrink: 0,
                }}
              >
                {cat.category}
              </span>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  height: 24,
                  backgroundColor: "#27272a",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${cat.score * 10}%`,
                    height: "100%",
                    backgroundColor: scoreColor(cat.score),
                    borderRadius: 12,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: scoreColor(cat.score),
                  width: 48,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {cat.score}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <span style={{ fontSize: 16, color: "#52525b" }}>
            Get your landing page roasted free
          </span>
          <span style={{ fontSize: 16, color: "#52525b" }}>
            pageroast.com
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
