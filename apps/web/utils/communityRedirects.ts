export type CommunityRedirectSearchParams =
  | Record<string, string | string[] | undefined>
  | undefined;

type CommunityRedirectTarget = {
  chain: string;
  community: string;
};

const ETHEREUM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/i;
const CHAIN_ID_PATTERN = /^\d+$/;

function parseCommunityRouteKey(value: string): CommunityRedirectTarget | null {
  const [chain, community, ...extraParts] = value.trim().split("/");
  const normalizedChain = chain?.trim();
  const normalizedCommunity = community?.trim().toLowerCase();

  if (
    extraParts.length > 0 ||
    !normalizedChain ||
    !normalizedCommunity ||
    !CHAIN_ID_PATTERN.test(normalizedChain) ||
    !ETHEREUM_ADDRESS_PATTERN.test(normalizedCommunity)
  ) {
    return null;
  }

  return {
    chain: normalizedChain,
    community: normalizedCommunity,
  };
}

function stringifyCommunityRouteKey({
  chain,
  community,
}: CommunityRedirectTarget): string {
  return `${chain}/${community}`;
}

export function parseCommunityAddressRedirects(
  redirects = process.env.COMMUNITY_ADDRESS_REDIRECTS,
) {
  const mapping = new Map<string, CommunityRedirectTarget>();

  if (!redirects) {
    return mapping;
  }

  redirects
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [from, to, ...extraParts] = entry.split(":");
      if (extraParts.length > 0 || !from || !to) {
        return;
      }

      const normalizedFrom = parseCommunityRouteKey(from);
      const normalizedTo = parseCommunityRouteKey(to);

      if (
        !normalizedFrom ||
        !normalizedTo ||
        stringifyCommunityRouteKey(normalizedFrom) ===
          stringifyCommunityRouteKey(normalizedTo)
      ) {
        return;
      }

      mapping.set(stringifyCommunityRouteKey(normalizedFrom), normalizedTo);
    });

  return mapping;
}

export function getCommunityRedirectTarget(
  chain: string,
  community: string,
  redirects?: string,
): CommunityRedirectTarget | null {
  const routeKey = parseCommunityRouteKey(`${chain}/${community}`);

  if (!routeKey) {
    return null;
  }

  return (
    parseCommunityAddressRedirects(redirects).get(
      stringifyCommunityRouteKey(routeKey),
    ) ?? null
  );
}

function stringifySearchParams(
  searchParams: CommunityRedirectSearchParams,
): string {
  if (!searchParams) return "";

  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value == null) return;

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry != null) {
          params.append(key, entry);
        }
      });
      return;
    }

    params.append(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getCommunityRedirectPath(
  chain: string,
  community: string,
  searchParams?: CommunityRedirectSearchParams,
  redirects?: string,
) {
  const target = getCommunityRedirectTarget(chain, community, redirects);

  if (!target) {
    return null;
  }

  return `/gardens/${target.chain}/${target.community}${stringifySearchParams(searchParams)}`;
}
