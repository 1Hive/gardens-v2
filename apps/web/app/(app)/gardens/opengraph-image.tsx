import type { Metadata } from "next";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Gardens";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const metadata: Metadata = {
  title: "Gardens",
  description: "Create, govern, and fund communities together.",
};

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
          color: "#F8FAFC",
          fontFamily: '"Inter", "Inter Fallback", system-ui, Arial, sans-serif',
          fontSize: "56px",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          background:
            "radial-gradient(circle at top right, rgba(16,185,129,0.35), transparent 34%), linear-gradient(135deg, #0F172A 0%, #111827 55%, #164E63 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "26px",
              fontWeight: 500,
              color: "#A7F3D0",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            <span>Gardens</span>
            <span style={{ opacity: 0.55 }}>Collective Funding</span>
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.05,
              maxWidth: "900px",
            }}
          >
            Create, govern, and fund communities together.
          </div>
        </div>
      </div>
    ),
  );
}
