import type { Metadata } from "next";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Gardens Campaigns";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const description =
  "Discover and join campaigns across the Gardens ecosystem.";
export const FALLBACK_TITLE = "Gardens Campaigns";

function formatTitle(title: string) {
  const trimmed = title?.trim() ?? FALLBACK_TITLE;
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

async function renderImage(title: string) {
  const safeTitle = formatTitle(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0f172a",
          padding: "56px",
          color: "#e2e8f0",
          fontFamily:
            '"Inter", "Manrope", "Helvetica Neue", "Arial", sans-serif',
              gap: "32px",
              background:
                "radial-gradient(circle at top right, rgba(59,130,246,0.28), transparent 28%), radial-gradient(circle at bottom left, rgba(16,185,129,0.22), transparent 32%), linear-gradient(135deg, #0f172a 0%, #111827 55%, #0b1120 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                height: "60px",
                width: "60px",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.9), rgba(59,130,246,0.9))",
                color: "#f8fafc",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              G
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#f8fafc",
                lineHeight: 1,
              }}
            >
              Gardens
            </span>
          </div>
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(148, 163, 184, 0.08)",
              color: "#cbd5e1",
              fontSize: "18px",
            }}
          >
            Ecosystem Campaigns
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "36px",
            flexGrow: 1,
          }}
        >
          <div
            style={{
              width: "240px",
              height: "240px",
              borderRadius: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(145deg, rgba(30,41,59,0.92), rgba(15,23,42,0.82))",
              border: "1px solid rgba(148,163,184,0.18)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                color: "#93c5fd",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: "#f8fafc",
                }}
              >
                SUP
              </div>
              <div
                style={{
                  fontSize: "18px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Campaigns
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "720px",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                fontWeight: 800,
                lineHeight: 1.05,
                color: "#f8fafc",
              }}
            >
              {safeTitle}
            </span>
            <span
              style={{
                fontSize: "28px",
                color: "#cbd5e1",
                lineHeight: 1.4,
              }}
            >
              Discover rewards campaigns, contribute to communities, and earn by
              helping ecosystems thrive on Gardens.
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: "22px",
            color: "#cbd5e1",
          }}
        >
          <span>Collaborate • Reward • Grow</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

export const metadata: Metadata = {
  title: FALLBACK_TITLE,
  description,
};

export default async function Image() {
  return renderImage(FALLBACK_TITLE);
}
