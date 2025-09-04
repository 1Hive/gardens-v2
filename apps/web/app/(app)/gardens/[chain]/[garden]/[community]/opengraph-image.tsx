import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Community Discussion";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8f9fa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header section with logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "40px 60px",
            backgroundColor: "#1f2937",
            color: "white",
            height: "180px",
          }}
        >
          {/* Logo circle */}
          <div
            style={{
              width: "60px",
              height: "60px",
              backgroundColor: "white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "30px",
              color: "black",
              fontSize: "28px",
              fontWeight: "bold",
            }}
          >
            N
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              lineHeight: "1.2",
            }}
          >
            Community Discussion: Garden Name
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            padding: "60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              color: "#1f2937",
              lineHeight: "1.1",
              marginBottom: "20px",
            }}
          >
            Join the conversation
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "#6b7280",
              lineHeight: "1.4",
            }}
          >
            Explore discussions and connect with the community
          </div>
        </div>

        {/* Subtle border line */}
        <div
          style={{
            position: "absolute",
            top: "180px",
            left: "0",
            right: "0",
            height: "1px",
            backgroundColor: "#e5e7eb",
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
