import { NextResponse } from "next/server";

const SELECTOR_REGEX = /^0x[a-fA-F0-9]{8}$/;
const OPENCHAIN_LOOKUP_URL =
  "https://api.openchain.xyz/signature-database/v1/lookup";
const FOUR_BYTE_LOOKUP_URL = "https://www.4byte.directory/api/v1/signatures/";
const MAX_SELECTORS_PER_REQUEST = 150;

type OpenChainEntry = {
  name?: string;
};

type OpenChainResponse = {
  ok?: boolean;
  result?: {
    function?: Record<string, OpenChainEntry[]>;
  };
};

type FourByteEntry = {
  text_signature?: string;
};

type FourByteResponse = {
  results?: FourByteEntry[];
};

const dedupeSignatures = (entries: string[]) =>
  Array.from(new Set(entries.filter(Boolean)));

const resolveFromOpenChain = async (selector: string) => {
  const url = `${OPENCHAIN_LOOKUP_URL}?function=${selector}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as OpenChainResponse;
  const resolved = payload.result?.function?.[selector] ?? [];
  return dedupeSignatures(resolved.map((entry) => entry.name ?? ""));
};

const resolveFrom4Byte = async (selector: string) => {
  const url = `${FOUR_BYTE_LOOKUP_URL}?hex_signature=${selector}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as FourByteResponse;
  return dedupeSignatures(
    (payload.results ?? []).map((entry) => entry.text_signature ?? ""),
  );
};

const normalizeSelectors = (selectorsParam: string) =>
  Array.from(
    new Set(
      selectorsParam
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => SELECTOR_REGEX.test(value)),
    ),
  ).slice(0, MAX_SELECTORS_PER_REQUEST);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectorsParam = url.searchParams.get("selectors") ?? "";
  const selectors = normalizeSelectors(selectorsParam);

  if (!selectors.length) {
    return NextResponse.json(
      { error: "Provide selectors as a comma-separated list of bytes4 values." },
      { status: 400 },
    );
  }

  const resolvedEntries = await Promise.all(
    selectors.map(async (selector) => {
      const openChainNames = await resolveFromOpenChain(selector);
      if (openChainNames.length) {
        return [selector, openChainNames] as const;
      }

      const fourByteNames = await resolveFrom4Byte(selector);
      return [selector, fourByteNames] as const;
    }),
  );

  return NextResponse.json({
    selectors: Object.fromEntries(resolvedEntries),
  });
}
