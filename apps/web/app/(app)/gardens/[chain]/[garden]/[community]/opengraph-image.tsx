import { readFile } from "fs/promises";
import path from "path";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { getCommunityNameDocument } from "#/subgraph/.graphclient";
import { COMMUNITY_IMAGE_BASE64, GARDEN_LOGO_BASE64 } from "./ogAssets";
import { chainConfigMap, ChainIcon } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";

export const runtime = "nodejs";

// Image metadata
export const alt = "Community Discussion";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const description =
  "Gardens community for collective decision-making and funding.";
export const FALLBACK_TITLE = "Gardens community";

// Image generation
type ImageParams = {
  chain: string;
  garden: string;
  community: string;
};

const isLocalEnvironment =
  (process.env.NODE_ENV === "development" && !process.env.VERCEL) ||
  process.env.GARDENS_LOCAL_OG === "true";

let cachedCommunityImageDataUrl: string | null = null;
const COMMUNITY_IMAGE_SOURCE = path.resolve(
  process.cwd(),
  "assets/CommunityImage.png",
);

let cachedGardenLogoDataUrl: string | null = null;
const GARDEN_LOGO_SOURCE = path.resolve(process.cwd(), "assets/NewLogo.png");

const FOOTER_MESSAGES = [
  "Collaborate • Propose ideas • Grow your community",
  "Decide together • Fund change • Build your future",
  "Create proposals • Vote collectively • Shape impact",
  "Connect • Govern • Thrive",
  "Empower your community • Make decisions • Bloom with purpose",
];

async function getCommunityImageDataUrl() {
  if (cachedCommunityImageDataUrl) {
    return cachedCommunityImageDataUrl;
  }

  if (isLocalEnvironment) {
    const imageBuffer = await readFile(COMMUNITY_IMAGE_SOURCE);
    cachedCommunityImageDataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  } else {
    cachedCommunityImageDataUrl = `data:image/png;base64,${COMMUNITY_IMAGE_BASE64}`;
  }

  return cachedCommunityImageDataUrl;
}

async function getGardenLogoDataUrl() {
  if (cachedGardenLogoDataUrl) {
    return cachedGardenLogoDataUrl;
  }

  if (isLocalEnvironment) {
    const imageBuffer = await readFile(GARDEN_LOGO_SOURCE);
    cachedGardenLogoDataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  } else {
    cachedGardenLogoDataUrl = `data:image/png;base64,${GARDEN_LOGO_BASE64}`;
  }

  return cachedGardenLogoDataUrl;
}

function formatTitle(title: string) {
  const trimmed = title?.trim() ?? "Community";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

async function renderImage(title: string, chainId: number) {
  let communityImageSrc: string | null = null;
  let gardenImageSrc: string | null = null;

  try {
    communityImageSrc = await getCommunityImageDataUrl();
  } catch (error) {
    console.error("Failed to load community OG image asset.", { error });
  }

  try {
    gardenImageSrc = await getGardenLogoDataUrl();
  } catch (error) {
    console.error("Failed to load garden logo image asset.", { error });
  }

  const safeTitle = formatTitle(title);
  const footerMessage =
    FOOTER_MESSAGES[Math.floor(Math.random() * FOOTER_MESSAGES.length)] ??
    FOOTER_MESSAGES[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#F8FAFC",
          padding: "48px",
          color: "#0F172A",
          fontFamily:
            '"Inter", "Manrope", "Helvetica Neue", "Arial", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "stretch",
            height: "100%",
            width: "100%",
            borderRadius: "40px",
            backgroundColor: "#FFFFFF",
            padding: "48px",
            boxShadow: "0 30px 60px rgba(79, 70, 229, 0.18)",
            gap: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {gardenImageSrc ?
                // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
                <img
                  alt="Gardens logo"
                  src={gardenImageSrc}
                  style={{
                    height: "50px",
                    width: "50px",
                  }}
                />
              : <span
                  style={{
                    fontSize: "48px",
                    fontWeight: 700,
                    color: "#15803D",
                  }}
                >
                  🌱
                </span>
              }
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 600,
                  color: "#1c1d1c",
                  lineHeight: 1,
                  fontFamily:
                    '"Inter", "Inter Fallback", system-ui, Arial, sans-serif',
                }}
              >
                Gardens
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "12px",
              }}
            >
              <ChainIcon chain={chainId} height={50} width={50} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "48px",
              flexGrow: 1,
            }}
          >
            {communityImageSrc ?
              // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
              <img
                alt="Community illustration"
                src={communityImageSrc}
                style={{
                  width: "200px",
                  height: "200px",
                }}
              />
            : <div
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "40px",
                  backgroundColor: "#DDD6FE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "88px",
                  fontWeight: 700,
                  color: "#6D28D9",
                }}
              >
                🌱
              </div>
            }

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                maxWidth: "640px",
              }}
            >
              <span
                style={{
                  fontSize: "72px",
                  fontWeight: 700,
                  lineHeight: 1.05,
                }}
              >
                {safeTitle}
              </span>

              <span
                style={{
                  fontSize: "32px",
                  color: "#475569",
                  lineHeight: 1.4,
                }}
              >
                A Gardens community for collective decision-making and funding.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: "32px",
              color: "#1E293B",
            }}
          >
            <span style={{ color: "#475569" }}>{footerMessage}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

export async function generateMetadata({
  params,
}: {
  params: ImageParams;
}): Promise<Metadata> {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];

  const fallbackMetadata: Metadata = {
    title: FALLBACK_TITLE,
    description,
  };

  if (chainConfig == null) {
    console.error(
      "Unsupported chainId for community opengraph-image metadata.",
      { chainId: params.chain },
    );
    return fallbackMetadata;
  }

  try {
    const communityResult = await queryByChain(
      chainConfig,
      getCommunityNameDocument,
      {
        communityAddr: params.community,
      },
      undefined,
      true,
    );

    if (communityResult.error) {
      console.error("Error fetching community metadata for OG image.", {
        chainId: params.chain,
        community: params.community,
        error: communityResult.error,
      });
      return fallbackMetadata;
    }

    const communityName =
      communityResult?.data?.registryCommunity?.communityName?.trim();

    if (!communityName) {
      return fallbackMetadata;
    }

    return {
      title: communityName,
      description,
    };
  } catch (error) {
    console.error("Failed to generate metadata for community OG image.", {
      chainId: params.chain,
      community: params.community,
      error,
    });
    return fallbackMetadata;
  }
}

export default async function Image({ params }: { params: ImageParams }) {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];

  if (chainConfig == null) {
    console.error(
      "Unsupported chainId for community opengraph-image generation.",
      { chainId: params.chain },
    );
    return renderImage("Community", chainId);
  }

  try {
    const communityResult = await queryByChain(
      chainConfig,
      getCommunityNameDocument,
      {
        communityAddr: params.community,
      },
      undefined,
      true, // TODO: Use published when subgraph with metadata has been published (0.2.1)
    );

    if (communityResult.error) {
      console.error("Error fetching community data for OG image.", {
        chainId: params.chain,
        community: params.community,
        error: communityResult.error,
      });
      return await renderImage("Community", chainId);
    }

    const communityName =
      communityResult?.data?.registryCommunity?.communityName?.trim() ??
      "Community";

    return await renderImage(communityName, chainId);
  } catch (error) {
    console.error("Failed to fetch community data for OG image.", {
      chainId: params.chain,
      community: params.community,
      error,
    });
    return await renderImage("Community", chainId);
  }
}
