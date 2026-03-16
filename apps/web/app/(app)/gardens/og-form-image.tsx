import { ImageResponse } from "next/og";

type BuildFormOgImageProps = {
  title: string;
  description: string;
};

export function buildFormOgImage({ title, description }: BuildFormOgImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top right, rgba(16,185,129,0.35), transparent 34%), linear-gradient(135deg, #0F172A 0%, #111827 55%, #164E63 100%)",
          color: "#F8FAFC",
          fontFamily: '"Inter", "Inter Fallback", system-ui, Arial, sans-serif',
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#A7F3D0",
          }}
        >
          Gardens
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "74px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              lineHeight: 1.3,
              color: "#E2E8F0",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
