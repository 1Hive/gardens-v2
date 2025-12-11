import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Superfluid Ecosystem Rewards";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const CAMPAIGN_TITLE = "Superfluid Ecosystem Rewards";
const CAMPAIGN_DESCRIPTION =
  "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.";
const CAMPAIGN_ENDS = "Ends 25 Feb 2025";
const TOTAL_SUP = "848K SUP";
const PARTICIPANTS = "1K participants";

export const description = CAMPAIGN_DESCRIPTION;
export const FALLBACK_TITLE = CAMPAIGN_TITLE;

type ImageParams = {
  campaignId: string;
};

let cachedBanner: string | null = null;
let cachedLogo: string | null = null;

const bannerAssetUrl = new URL(
  "../../../../../assets/superfluid-banner.png",
  import.meta.url,
);
const logoAssetUrl = new URL(
  "../../../../../assets/superfluid-logo-dark.svg",
  import.meta.url,
);

async function getAssetDataUrl(
  assetUrl: URL,
  mimeType: string,
): Promise<string | null> {
  try {
    const filePath = fileURLToPath(assetUrl);
    const fileBuffer = await fs.readFile(filePath);
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Failed to load OG asset.", {
      assetUrl: assetUrl.href,
      error,
    });
    return null;
  }
}

async function getBanner() {
  if (cachedBanner) {
    return cachedBanner;
  }

  cachedBanner = await getAssetDataUrl(bannerAssetUrl, "image/png");

  return cachedBanner;
}

async function getLogo() {
  if (cachedLogo) {
    return cachedLogo;
  }

  cachedLogo = await getAssetDataUrl(logoAssetUrl, "image/svg+xml");

  return cachedLogo;
}

function statBlock(label: string, value: string) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "14px 16px",
        background: "#111822",
        borderRadius: "14px",
        border: "1px solid #1f2a38",
        minWidth: "180px",
        gap: "6px",
      }}
    >
      <span
        style={{
          fontSize: "18px",
          color: "#9fb4cc",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: "#f2f6fb",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

async function renderImage() {
  const [bannerDataUrl, logoDataUrl] = await Promise.all([
    getBanner(),
    getLogo(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05080f",
          padding: "32px",
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: "1120px",
            height: "566px",
            background: "#0c1118",
            borderRadius: "28px",
            border: "1px solid #1b2432",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 28px 120px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ position: "relative", height: "280px" }}>
            {bannerDataUrl ?
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${bannerDataUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            : <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(circle at 20% 20%, #1f8a5d, #0c1118 55%)",
                }}
              />
            }

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(5,8,15,0.05) 0%, rgba(5,8,15,0.92) 100%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: 24,
                left: 24,
                width: "76px",
                height: "76px",
                borderRadius: "18px",
                background: "rgba(5,8,15,0.55)",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 16px 42px rgba(0,0,0,0.35)",
              }}
            >
              {logoDataUrl ?
                // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
                <img
                  src={logoDataUrl}
                  alt="Superfluid logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              : <span style={{ fontSize: "42px" }}>💧</span>}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 30,
                left: 28,
                right: 28,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: 800,
                  color: "#f7fafc",
                  letterSpacing: "-0.02em",
                  textShadow: "0 8px 24px rgba(0,0,0,0.35)",
                }}
              >
                {CAMPAIGN_TITLE}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  background: "rgba(12,17,24,0.65)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#d8e7f5",
                  width: "fit-content",
                  fontSize: "20px",
                  letterSpacing: "-0.01em",
                }}
              >
                <span aria-hidden style={{ fontSize: "18px" }}>
                  📅
                </span>
                {CAMPAIGN_ENDS}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
              color: "#dbe7f3",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "22px",
                lineHeight: 1.5,
                color: "#c3d4e7",
                maxWidth: "960px",
                letterSpacing: "-0.01em",
              }}
            >
              {CAMPAIGN_DESCRIPTION}
            </div>

            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              {statBlock("Total to distribute", TOTAL_SUP)}
              {statBlock("Campaign ends", CAMPAIGN_ENDS)}
              {statBlock("Community momentum", PARTICIPANTS)}
            </div>

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#9fb4cc",
                fontSize: "18px",
                letterSpacing: "-0.01em",
              }}
            >
              <span aria-hidden style={{ fontSize: "18px" }}>
                🌱
              </span>
              Rewards campaign on Gardens
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

export async function generateMetadata({
  params,
}: {
  params: ImageParams;
}): Promise<Metadata> {
  return {
    title: `${CAMPAIGN_TITLE} - Campaign ${params.campaignId}`,
    description: CAMPAIGN_DESCRIPTION,
  };
}

export default async function Image() {
  return renderImage();
}
