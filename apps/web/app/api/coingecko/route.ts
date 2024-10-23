// app/api/tokens/[chain]/[token]/route.ts
import { NextResponse } from "next/server";

// You should store this in your .env.local file
const COINGECKO_API_KEY = "CG-ibuEwEyXJ79RKSqQFxr78EGQ";

// Define supported chains and their CoinGecko IDs
const SUPPORTED_CHAINS = {
  ethereum: "ethereum",
  gnosis: "gnosis",
  polygon: "polygon-pos",
  arbitrum: "arbitrum-one",
  optimism: "optimistic-ethereum",
  bsc: "binance-smart-chain",
} as const;

type ChainType = keyof typeof SUPPORTED_CHAINS;

export async function GET(
  request: Request,
  { params }: { params: { chain: string; token: string } },
) {
  try {
    const { chain, token } = params;

    // Validate chain
    if (!chain || !(chain.toLowerCase() in SUPPORTED_CHAINS)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported chain. Supported chains are: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`,
          metadata: { chain, token, timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    // Validate token address format
    if (!token || !/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token address format",
          metadata: { chain, token, timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const url = `https://api.coingecko.com/api/v3/coins/${chain}/contract/${token}`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Token not found on the specified chain",
            metadata: { chain, token, timestamp: new Date().toISOString() },
          },
          { status: 404 },
        );
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Format the response with the most relevant data
    const formattedData = {
      success: true,
      data: {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        asset_platform_id: data.asset_platform_id,
        contract_address: data.contract_address,
        market_data: {
          current_price: data.market_data?.current_price,
          market_cap: data.market_data?.market_cap,
          total_volume: data.market_data?.total_volume,
          price_change_percentage_24h:
            data.market_data?.price_change_percentage_24h,
          price_change_percentage_7d:
            data.market_data?.price_change_percentage_7d,
          price_change_percentage_30d:
            data.market_data?.price_change_percentage_30d,
        },
        last_updated: data.last_updated,
      },
      metadata: {
        chain,
        token,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(formattedData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error fetching token data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch token data",
        metadata: {
          chain: params.chain,
          token: params.token,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
