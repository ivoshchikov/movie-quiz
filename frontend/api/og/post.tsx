// api/og/post.tsx
import { ImageResponse } from "@vercel/og";

// Работает на Edge Runtime (быстро и без ноды)
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const title =
      (searchParams.get("title") || "Hard Quiz — Guess Movies from Stills & Faces").slice(0, 120);
    const date = (searchParams.get("date") || "").slice(0, 32);
    const reading = (searchParams.get("reading") || "").slice(0, 8);
    const tagsRaw = (searchParams.get("tags") || "").trim();
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4) : [];

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px",
            color: "#fff",
            background:
              "linear-gradient(135deg, rgba(11,11,17,1) 0%, rgba(20,20,50,1) 100%)",
          }}
        >
          {/* top brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #8B5CF6",
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              HQ
            </div>
            <div style={{ fontSize: 36, opacity: 0.85 }}>Hard Quiz</div>
          </div>

          {/* title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1,
              textShadow: "0 2px 12px rgba(0,0,0,.35)",
            }}
          >
            {title}
          </div>

          {/* footer line: tags + meta */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 28,
              opacity: 0.9,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {tags.map((t) => (
                <div
                  key={t}
                  style={{
                    border: "1px solid rgba(255,255,255,.25)",
                    padding: "6px 14px",
                    borderRadius: 999,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {date && <div>{date}</div>}
              {reading && <div>{reading} min</div>}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        // полезно для кэширования бота X и OG-скрепперов
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      }
    );
  } catch (err) {
    // На всякий случай отдаём простую картинку «заглушку», чтобы не было 500
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            background: "#111827",
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          Hard Quiz
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
