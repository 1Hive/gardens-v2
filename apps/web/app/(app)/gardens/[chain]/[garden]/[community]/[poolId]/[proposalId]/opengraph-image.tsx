import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import {
  getProposalTitleDocument,
  type getProposalTitleQuery,
} from "#/subgraph/.graphclient";
import type { ProposalPageParams } from "./client-page";
import {
  ACTIVE_PROPOSAL_DESCRIPTION,
  ENDED_PROPOSAL_DESCRIPTION,
  FALLBACK_TITLE,
  getDescriptionFromStatus,
  titleCaseStatus,
} from "./page";
import {
  GARDEN_LOGO_BASE64,
  POOL_FUNDING_ICON_BASE64,
  POOL_SIGNALING_ICON_BASE64,
} from "../../ogAssets";
import { ChainIcon, getConfigByChain } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { PoolTypes, ProposalStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // keep OG image fresh with live status

export const alt = "Gardens Proposal";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type ProposalImageData = {
  title: string;
  status?: (typeof ProposalStatus)[number];
  poolType?: "signaling" | "funding" | "streaming";
  poolTitle?: string | null;
  communityName?: string | null;
};

type LoadedProposal = {
  chainId: number;
  data: ProposalImageData | null;
};

const STATUS_STYLES: Record<string, { text: string; background: string }> = {
  active: { text: "#065F46", background: "#D1FAE5" },
  inactive: { text: "#1F2937", background: "#E5E7EB" },
  paused: { text: "#92400E", background: "#FEF3C7" },
  cancelled: { text: "#7F1D1D", background: "#FEE2E2" },
  executed: { text: "#1D4ED8", background: "#DBEAFE" },
  disputed: { text: "#B45309", background: "#FEF3C7" },
  rejected: { text: "#9F1239", background: "#FCE7F3" },
};

const DEFAULT_STATUS_STYLE = { text: "#1E293B", background: "#E2E8F0" };

const POOL_TYPE_STYLES: Record<
  "signaling" | "funding" | "streaming",
  { text: string; background: string }
> = {
  signaling: { text: "#065F46", background: "#D1FAE5" },
  funding: { text: "#1B5370", background: "#D1ECF3" },
  streaming: { text: "#312E81", background: "#EDE9FE" },
};

const DEFAULT_POOL_STYLE = { text: "#1F2937", background: "#E5E7EB" };

let cachedGardenLogoDataUrl: string | null = null;
const PROPOSAL_STATUS_VALUES = Object.values(ProposalStatus);

function normalizeStatus(
  status?: string | null,
): (typeof ProposalStatus)[number] | undefined {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  return (
      PROPOSAL_STATUS_VALUES.includes(
        normalized as (typeof ProposalStatus)[number],
      )
    ) ?
      (normalized as (typeof ProposalStatus)[number])
    : undefined;
}

function formatTitle(title: string) {
  const trimmed = title?.trim();
  const normalized = trimmed && trimmed.length > 0 ? trimmed : FALLBACK_TITLE;
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}
function getPoolStyle(poolType?: "signaling" | "funding" | "streaming") {
  if (!poolType) {
    return DEFAULT_POOL_STYLE;
  }
  return POOL_TYPE_STYLES[poolType] ?? DEFAULT_POOL_STYLE;
}

function getPoolLabel(poolType?: "signaling" | "funding" | "streaming") {
  return poolType ? `${poolType} proposal` : null;
}

async function getGardenLogoDataUrl() {
  if (cachedGardenLogoDataUrl) {
    return cachedGardenLogoDataUrl;
  }

  cachedGardenLogoDataUrl = `data:image/png;base64,${GARDEN_LOGO_BASE64}`;

  return cachedGardenLogoDataUrl;
}

async function loadProposal(
  params: ProposalPageParams,
): Promise<LoadedProposal> {
  const numericChainId = Number(params.chain);
  const chainConfig =
    getConfigByChain(params.chain) ??
    (Number.isFinite(numericChainId) ?
      getConfigByChain(numericChainId)
    : undefined);
  const resolvedChainId =
    chainConfig?.id ?? (Number.isFinite(numericChainId) ? numericChainId : 0);

  if (!chainConfig) {
    console.error("Unsupported chainId for proposal opengraph-image.", {
      chainId: params.chain,
    });
    return { chainId: resolvedChainId, data: null };
  }

  const proposalId = params.proposalId?.toLowerCase?.() ?? params.proposalId;

  try {
    const proposalResult = await queryByChain<getProposalTitleQuery>(
      chainConfig,
      getProposalTitleDocument,
      { proposalId },
      { requestPolicy: "network-only" },
      true,
    );

    if (proposalResult.error) {
      console.error("Error fetching proposal data for OG image.", {
        chainId: params.chain,
        proposalId,
        error: proposalResult.error,
      });
      return { chainId: resolvedChainId, data: null };
    }

    const proposal = proposalResult.data?.cvproposal;

    if (!proposal) {
      console.warn("Proposal data not found for OG image.", {
        chainId: params.chain,
        proposalId,
      });
      return { chainId: resolvedChainId, data: null };
    }

    const statusCode = proposal.proposalStatus?.toString?.();
    const status = normalizeStatus(
      statusCode != null ? ProposalStatus[statusCode] : undefined,
    );

    const poolTypeCode = proposal.strategy?.config?.proposalType?.toString?.();
    const poolType = poolTypeCode != null ? PoolTypes[poolTypeCode] : undefined;

    const rawTitle = proposal.metadata?.title?.trim();
    const title = rawTitle && rawTitle.length > 0 ? rawTitle : FALLBACK_TITLE;
    const poolTitle = proposal.strategy?.metadata?.title?.trim() ?? null;
    const communityName =
      proposal.strategy?.registryCommunity?.communityName?.trim() ?? null;

    return {
      chainId: resolvedChainId,
      data: {
        title,
        status,
        poolType,
        poolTitle,
        communityName,
      },
    };
  } catch (error) {
    console.error("Failed to fetch proposal data for OG image.", {
      chainId: params.chain,
      proposalId,
      error,
    });
    return { chainId: resolvedChainId, data: null };
  }
}

async function renderImage({
  title,
  status,
  poolType,
  communityName,
  poolTitle,
  chainId,
}: ProposalImageData & { chainId: number }) {
  let gardenLogoSrc: string | null = null;

  try {
    gardenLogoSrc = await getGardenLogoDataUrl();
  } catch (error) {
    console.error("Failed to load garden logo for proposal OG image.", {
      error,
    });
  }

  const poolStyle = getPoolStyle(poolType);
  const poolLabel = getPoolLabel(poolType);
  const poolIconSrc =
    poolType === "funding" ?
      `data:image/svg+xml;base64,${POOL_FUNDING_ICON_BASE64}`
    : poolType === "signaling" ?
      `data:image/svg+xml;base64,${POOL_SIGNALING_ICON_BASE64}`
    : null;
  const normalizedStatus = normalizeStatus(status);
  const description = getDescriptionFromStatus(normalizedStatus);
  const safeTitle = formatTitle(title);
  const subHeaderText =
    communityName && poolTitle ?
      `${communityName} - ${poolTitle}`
    : communityName ?? poolTitle ?? null;
  const showStatusBadge = normalizedStatus != null;
  const statusStyle =
    showStatusBadge ?
      STATUS_STYLES[normalizedStatus ?? ""] ?? DEFAULT_STATUS_STYLE
    : null;
  const statusLabel =
    showStatusBadge ? titleCaseStatus(normalizedStatus) ?? "Proposal" : null;
  const hasStatusBadge = statusStyle != null && statusLabel != null;
  const hasPoolBadge = !!poolLabel;
  const showBadges = hasPoolBadge || hasStatusBadge;
  const badgeStyle = statusStyle ?? DEFAULT_STATUS_STYLE;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #F8FAFC 0%, #ECFDF5 100%)",
          color: "#0F172A",
          fontFamily:
            '"Inter", "Inter Fallback", system-ui, "Helvetica Neue", Arial, sans-serif',
          gap: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {gardenLogoSrc ?
              // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
              <img
                alt="Gardens logo"
                src={gardenLogoSrc}
                style={{ height: "50px", width: "50px" }}
              />
            : <span
                style={{
                  fontSize: "42px",
                  fontWeight: 700,
                  color: "#047857",
                }}
              >
                🌱
              </span>
            }
            <span
              style={{
                fontSize: "34px",
                fontWeight: 600,
                color: "#065F46",
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              Gardens
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChainIcon chain={chainId} height={54} width={54} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            flexGrow: 1,
            justifyContent: "center",
            maxWidth: "100%",
          }}
        >
          {showBadges ?
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {hasPoolBadge ?
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "20px",
                    fontWeight: 600,
                    padding: "9px 18px",
                    borderRadius: "9999px",
                    color: poolStyle.text,
                    backgroundColor: poolStyle.background,
                    textTransform: "capitalize",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {poolIconSrc ?
                    // eslint-disable-next-line @next/next/no-img-element -- Rendering inside ImageResponse.
                    <img
                      alt=""
                      src={poolIconSrc}
                      style={{ height: "20px", width: "20px" }}
                    />
                  : null}
                  {poolLabel}
                </span>
              : null}
              {hasStatusBadge ?
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "22px",
                    fontWeight: 600,
                    padding: "10px 20px",
                    borderRadius: "9999px",
                    color: badgeStyle.text,
                    backgroundColor: badgeStyle.background,
                    textTransform: "capitalize",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {statusLabel}
                </span>
              : null}
            </div>
          : null}

          <span
            style={{
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#111827",
              letterSpacing: "-0.02em",
              maxWidth: "980px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {safeTitle}
          </span>

          {subHeaderText ?
            <span
              style={{
                fontSize: "28px",
                color: "#64748B",
                lineHeight: 1.35,
                maxWidth: "900px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: "-0.01em",
              }}
            >
              {subHeaderText}
            </span>
          : null}

          <span
            style={{
              fontSize: "32px",
              color: "#475569",
              lineHeight: 1.4,
              maxWidth: "760px",
            }}
          >
            {description}
          </span>
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
  params: ProposalPageParams;
}): Promise<Metadata> {
  const fallbackMetadata: Metadata = {
    title: FALLBACK_TITLE,
    description: ENDED_PROPOSAL_DESCRIPTION,
  };

  const { data } = await loadProposal(params);

  if (!data) {
    return fallbackMetadata;
  }

  const description = getDescriptionFromStatus(data.status);
  const title = data.title ?? FALLBACK_TITLE;

  return {
    title,
    description,
  };
}

export default async function Image({
  params,
  searchParams,
}: {
  params: ProposalPageParams;
  searchParams?: { status?: string };
}) {
  const { chainId, data } = await loadProposal(params);
  const status = normalizeStatus(searchParams?.status) ?? data?.status;

  try {
    return await renderImage({
      title: data?.title ?? FALLBACK_TITLE,
      status,
      poolType: data?.poolType,
      poolTitle: data?.poolTitle ?? null,
      communityName: data?.communityName ?? null,
      chainId,
    });
  } catch (error) {
    console.error("Failed to render proposal OG image.", {
      chainId: params.chain,
      proposalId: params.proposalId,
      error,
    });

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#F8FAFC",
            color: "#0F172A",
            fontFamily:
              '"Inter", "Inter Fallback", system-ui, "Helvetica Neue", Arial, sans-serif',
            gap: "16px",
          }}
        >
          <span style={{ fontSize: "60px", fontWeight: 700 }}>
            {FALLBACK_TITLE}
          </span>
          <span style={{ fontSize: "28px", color: "#475569" }}>
            {ACTIVE_PROPOSAL_DESCRIPTION}
          </span>
        </div>
      ),
      {
        ...size,
      },
    );
  }
}
