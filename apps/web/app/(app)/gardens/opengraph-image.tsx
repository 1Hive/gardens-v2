import type { Metadata, ServerRuntime } from "next";
import { ImageResponse } from "next/og";
import { GARDENS_COVER_BASE64 } from "./[chain]/[garden]/[community]/ogAssets";

export const runtime: ServerRuntime = "nodejs";

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

let cachedGardensCoverDataUrl: string | null = null;

function getGardensCoverDataUrl() {
  if (cachedGardensCoverDataUrl) {
    return cachedGardensCoverDataUrl;
  }

  cachedGardensCoverDataUrl = `data:image/svg+xml;base64,${GARDENS_COVER_BASE64}`;

  return cachedGardensCoverDataUrl;
}

export default async function Image() {
  let gardensCoverSrc: string | null = null;

  try {
    gardensCoverSrc = getGardensCoverDataUrl();
  } catch (error) {
    console.error("Failed to load Gardens cover OG image asset.", { error });
  }

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
        }}
      >
        {gardensCoverSrc ?
          // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
          <img
            alt="Gardens cover illustration"
            src={gardensCoverSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        : <span>Gardens</span>}
      </div>
    ),
  );
}
