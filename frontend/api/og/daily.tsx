// api/og/daily.tsx
/* Edge OG image for the Daily page */
export const config = { runtime: "edge" };

import { ImageResponse } from "@vercel/og";

function fmt(d?: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return d;
  }
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const d  = searchParams.get("d");
  const ds = fmt(d);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background:
            "radial-gradient(1000px 600px at 0% 0%, rgba(99,102,241,0.35), transparent), radial-gradient(900px 600px at 100% 100%, rgba(168,85,247,0.35), transparent), #0b0b0f",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial",
          position: "relative",
          padding: "64px",
        }}
      >
        {/* Branding */}
        <div style={{ position: "absolute", top: 48, left: 64, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: "linear-gradient(135deg, #34d399 0%, #22d3ee 100%)",
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.4 }}>Hard&nbsp;Quiz</div>
        </div>

        {/* Content */}
        <div style={{ marginTop: 100, maxWidth: 900 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.04, marginBottom: 12 }}>
            Daily Challenge
          </div>
          <div style={{ fontSize: 30, opacity: 0.85 }}>
            {ds ? `New still — ${ds}` : "One new still every day"}
          </div>

          <div
            style={{
              marginTop: 32,
              display: "inline-flex",
              gap: 12,
              alignItems: "center",
              fontSize: 26,
              opacity: 0.9,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 6,
                background: "#10b981",
                boxShadow: "0 0 20px rgba(16,185,129,0.6)",
              }}
            />
            Guess the movie/actor • Streaks • Leaderboards
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
