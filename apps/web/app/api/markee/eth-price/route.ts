import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ETH_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

export async function GET() {
  try {
    const response = await fetch(ETH_PRICE_URL, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    const result = (await response.json()) as {
      ethereum?: { usd?: unknown };
    };
    const usd = result.ethereum?.usd;

    if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) {
      throw new Error("CoinGecko returned an invalid ETH price");
    }

    return NextResponse.json(
      { usd },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[Markee ETH price] Unable to load ETH/USD price", error);
    return NextResponse.json(
      { error: "Unable to load ETH price." },
      { status: 502 },
    );
  }
}
