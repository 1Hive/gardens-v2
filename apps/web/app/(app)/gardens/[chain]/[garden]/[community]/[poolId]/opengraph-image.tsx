import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { getPoolTitleDocument } from "#/subgraph/.graphclient";
import {
  GARDEN_LOGO_BASE64,
  GRASS_BASE64,
  POOL_BLUE_GRASS_BASE64,
  POOL_FUNDING_ICON_BASE64,
  POOL_SIGNALING_ICON_BASE64,
  STATUS_ARCHIVED_ICON_BASE64,
  STATUS_REVIEW_ICON_BASE64,
} from "../ogAssets";
import { chainConfigMap, ChainIcon } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { PoolTypes } from "@/types";

export const runtime = "nodejs";

// Image metadata
export const alt = "Gardens Pool";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const description =
  "Gardens pool for collaborative funding and decision-making.";
export const FALLBACK_TITLE = "Gardens pool";

// Image generation
type ImageParams = {
  chain: string;
  garden: string;
  community: string;
  poolId: string | number;
};

let cachedGardenLogoDataUrl: string | null = null;

let fundingBackgroundDataUrl: string | null = null;
let signalingBackgroundDataUrl: string | null = null;

const FOOTER_MESSAGES = [
  "Collaborate • Propose ideas • Grow your community",
  "Decide together • Fund change • Build your future",
  "Create proposals • Vote collectively • Shape impact",
  "Connect • Govern • Thrive",
  "Empower your community • Make decisions • Bloom with purpose",
];

async function getGardenLogoDataUrl() {
  if (cachedGardenLogoDataUrl) {
    return cachedGardenLogoDataUrl;
  }

  cachedGardenLogoDataUrl = `data:image/png;base64,${GARDEN_LOGO_BASE64}`;

  return cachedGardenLogoDataUrl;
}

function getSvgDataUrl(base64: string) {
  return `data:image/svg+xml;base64,${base64}`;
}

async function getPoolBackgroundDataUrl(
  poolType: "signaling" | "funding" | "streaming" | undefined | null,
): Promise<string> {
  if (poolType === "funding") {
    if (!fundingBackgroundDataUrl) {
      fundingBackgroundDataUrl = getSvgDataUrl(POOL_BLUE_GRASS_BASE64);
    }
    return fundingBackgroundDataUrl;
  }

  if (!signalingBackgroundDataUrl) {
    signalingBackgroundDataUrl = getSvgDataUrl(GRASS_BASE64);
  }
  return signalingBackgroundDataUrl;
}

function formatTitle(title: string) {
  const trimmed = title?.trim() ?? "Pool";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

async function renderImage({
  title,
  chainId,
  poolType,
  communityName,
  isEnabled,
  archived,
}: {
  title: string;
  chainId: number;
  poolType?: "signaling" | "funding" | "streaming";
  communityName?: string | null;
  isEnabled?: boolean | null;
  archived?: boolean | null;
}) {
  let gardenImageSrc: string | null = null;
  let backgroundImageSrc: string | null = null;

  try {
    gardenImageSrc = await getGardenLogoDataUrl();
  } catch (error) {
    console.error("Failed to load garden logo image asset.", { error });
  }

  try {
    backgroundImageSrc = await getPoolBackgroundDataUrl(poolType);
  } catch (error) {
    console.error("Failed to load pool background OG asset.", {
      poolType,
      error,
    });
  }

  const safeTitle = formatTitle(title);
  const safeCommunityName = communityName?.trim() ?? "";
  const normalizedPoolType = poolType?.toLowerCase() as
    | "signaling"
    | "funding"
    | "streaming"
    | undefined;
  const descriptionText =
    normalizedPoolType === "signaling" ?
      "Where collective coordination meets community sentiment."
    : normalizedPoolType === "funding" ?
      "For collective resource allocation and project support."
    : "A Gardens pool for collective decision-making and funding.";
  const footerMessage =
    FOOTER_MESSAGES[Math.floor(Math.random() * FOOTER_MESSAGES.length)] ??
    FOOTER_MESSAGES[0];
  const statusBadges: Array<{
    label: string;
    color: string;
    bg: string;
    iconSrc: string;
  }> = [];

  if (archived) {
    statusBadges.push({
      label: "Archived",
      color: "#92400E",
      bg: "#FDE68A",
      iconSrc: `data:image/svg+xml;base64,${STATUS_ARCHIVED_ICON_BASE64}`,
    });
  } else if (isEnabled === false) {
    statusBadges.push({
      label: "In review",
      color: "#B45309",
      bg: "#FEF3C7",
      iconSrc: `data:image/svg+xml;base64,${STATUS_REVIEW_ICON_BASE64}`,
    });
  }
  const poolLabelText =
    normalizedPoolType ? `${normalizedPoolType} pool` : "pool";
  const poolLabelStyles =
    normalizedPoolType === "funding" ?
      { text: "#1B5370", background: "#D1ECF3" }
    : normalizedPoolType === "signaling" ?
      { text: "#065F46", background: "#D1FAE5" }
    : { text: "#312E81", background: "#EDE9FE" };
  const poolLabelIconSrc =
    normalizedPoolType === "funding" ?
      `data:image/svg+xml;base64,${POOL_FUNDING_ICON_BASE64}`
    : normalizedPoolType === "signaling" ?
      `data:image/svg+xml;base64,${POOL_SIGNALING_ICON_BASE64}`
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F8FAFC",
          padding: "64px",
          color: "#0F172A",
          fontFamily:
            '"Inter", "Manrope", "Helvetica Neue", "Arial", sans-serif',
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
            flexDirection: "column",
            gap: "24px",
            flexGrow: 1,
            justifyContent: "center",
            maxWidth: "1200px",
          }}
        >
          {!!poolLabelIconSrc || statusBadges.length || safeCommunityName ?
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                {safeCommunityName ?
                  <span
                    style={{
                      fontSize: "32px",
                      fontWeight: 600,
                      lineHeight: 1.05,
                      color: "#1E293B",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textTransform: "capitalize",
                    }}
                  >
                    {safeCommunityName}
                  </span>
                : null}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                {statusBadges.map(({ label, color, bg, iconSrc }) => (
                  <span
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "20px",
                      color,
                      backgroundColor: bg,
                      padding: "8px 16px",
                      borderRadius: "9999px",
                      fontWeight: 600,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse. */}
                    <img
                      alt=""
                      src={iconSrc}
                      style={{ height: "24px", width: "24px" }}
                    />
                    {label}
                  </span>
                ))}
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "20px",
                    color: poolLabelStyles.text,
                    backgroundColor: poolLabelStyles.background,
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {poolLabelIconSrc ?
                    // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
                    <img
                      alt=""
                      src={poolLabelIconSrc}
                      style={{ height: "24px", width: "24px" }}
                    />
                  : null}
                  {poolLabelText}
                </span>
              </div>
            </div>
          : null}
          <span
            style={{
              fontSize: "65px",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {safeTitle}
          </span>

          <span
            style={{
              fontSize: "32px",
              color: "#475569",
              lineHeight: 1.4,
              maxWidth: "720px",
            }}
          >
            {descriptionText}
          </span>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "160px",
            borderRadius: "24px",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {backgroundImageSrc ?
            // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
            <img
              alt=""
              src={backgroundImageSrc}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          : null}
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
  const poolId = params.poolId?.toString();

  const fallbackMetadata: Metadata = {
    title: FALLBACK_TITLE,
    description,
  };

  if (chainConfig == null) {
    console.error("Unsupported chainId for pool opengraph-image metadata.", {
      chainId: params.chain,
    });
    return fallbackMetadata;
  }

  if (!poolId) {
    console.error("Missing poolId for pool opengraph-image metadata.", {
      poolId: params.poolId,
    });
    return fallbackMetadata;
  }

  try {
    const poolResult = await queryByChain(
      chainConfig,
      getPoolTitleDocument,
      {
        poolId,
      },
      undefined,
      true,
    );

    if (poolResult.error) {
      console.error("Error fetching pool metadata for OG image.", {
        chainId: params.chain,
        poolId,
        error: poolResult.error,
      });
      return fallbackMetadata;
    }

    const strategy = poolResult?.data?.cvstrategies?.[0];
    const poolTitle = strategy?.metadata?.title?.trim();

    if (!poolTitle) {
      return fallbackMetadata;
    }

    return {
      title: poolTitle,
      description,
    };
  } catch (error) {
    console.error("Failed to generate metadata for pool OG image.", {
      chainId: params.chain,
      poolId,
      error,
    });
    return fallbackMetadata;
  }
}

export default async function Image({ params }: { params: ImageParams }) {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];
  const poolId = params.poolId?.toString();

  if (chainConfig == null) {
    console.error("Unsupported chainId for pool opengraph-image generation.", {
      chainId: params.chain,
    });
    return renderImage({ title: "Pool", chainId });
  }

  if (!poolId) {
    console.error("Missing poolId for pool opengraph-image generation.", {
      poolId: params.poolId,
    });
    return renderImage({ title: "Pool", chainId });
  }

  try {
    const poolResult = await queryByChain(
      chainConfig,
      getPoolTitleDocument,
      {
        poolId,
      },
      undefined,
      true, // TODO: Use published when subgraph with metadata has been published (0.2.1)
    );

    if (poolResult.error) {
      console.error("Error fetching pool data for OG image.", {
        chainId: params.chain,
        poolId,
        error: poolResult.error,
      });
      return await renderImage({ title: "Pool", chainId });
    }

    const poolData = poolResult?.data?.cvstrategies?.[0];
    const poolTitle = poolData?.metadata?.title?.trim() ?? "Pool";
    const poolTypeKey =
      poolData?.config?.proposalType != null ?
        poolData.config.proposalType.toString()
      : undefined;
    const poolType = poolTypeKey ? PoolTypes[poolTypeKey] : undefined;
    const communityName = poolData.registryCommunity?.communityName?.trim();

    return await renderImage({
      title: poolTitle,
      chainId,
      poolType,
      communityName,
      archived: poolData?.archived ?? undefined,
      isEnabled: poolData?.isEnabled ?? undefined,
    });
  } catch (error) {
    console.error("Failed to fetch pool data for OG image.", {
      chainId: params.chain,
      poolId,
      error,
    });
    return await renderImage({ title: "Pool", chainId });
  }
}
