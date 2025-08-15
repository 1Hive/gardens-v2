// api/passport-oracle/write-score

import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getMemberPassportAndCommunitiesDocument,
  getMemberPassportAndCommunitiesQuery,
} from "#/subgraph/.graphclient";
import { getConfigByChain } from "@/configs/chains";
import { isProd } from "@/configs/isProd";
import { initUrqlClient } from "@/providers/urql";
import { goodDollarABI, passportScorerABI } from "@/src/generated";
import { fetchGooddollarWhitelisted } from "@/utils/gooddollar";
import { CV_PASSPORT_THRESHOLD_SCALE } from "@/utils/numbers";
import { getViemChain } from "@/utils/web3";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;
const LOCAL_RPC = "http://127.0.0.1:8545";

export async function POST(req: Request, { params }: Params) {
  const { chain: chainId } = params as { chain: string };
  const { user } = await req.json();
  if (typeof user !== "string") {
    return NextResponse.json(
      {
        error: "User address is required",
      },
      { status: 400 },
    );
  }

  const chain = getViemChain(chainId);
  const chainConfig = getConfigByChain(chainId);
  //TODO: check with subgraph instead of wagmi if we add to subgraph in the future
  // try {
  // const publishedSubgraphUrl = chainConfig?.publishedSubgraphUrl as string;
  // const subgraphUrl = chainConfig?.subgraphUrl as string;
  // const { urqlClient } = initUrqlClient({ chainId });
  //   const fetchUser = (_subgraphUrl: string) =>
  //     urqlClient
  //       .query<getMemberPassportAndCommunitiesQuery>(
  //         getMemberPassportAndCommunitiesDocument,
  //         {
  //           memberId: user.toLowerCase(),
  //         },
  //         {
  //           url: _subgraphUrl,
  //           fetchOptions: {
  //             headers: [
  //               ["origin", isProd ? "app.gardens.fund" : ""],
  //               ["referer", isProd ? "https://app.gardens.fund/" : ""],
  //             ],
  //           },
  //           requestPolicy: "network-only",
  //         },
  //       )
  //       .toPromise()
  //       .catch((error) => {
  //         console.error("Error fetching subgraph data:", {
  //           error,
  //           url: _subgraphUrl,
  //         });
  //         return { data: null, error: "Failed to fetch subgraph data" };
  //       });
  //   let subgraphResponse = await fetchUser(publishedSubgraphUrl);
  //   if (subgraphResponse == null || subgraphResponse.error != null) {
  //     console.warn(
  //       "Subgraph query failed with published query, trying dev subgraph",
  //       {
  //         subgraphUrl,
  //         publishedSubgraphUrl,
  //         error: subgraphResponse?.error,
  //       },
  //     );
  //     subgraphResponse = await fetchUser(subgraphUrl);
  //   }

  //   if (subgraphResponse == null || subgraphResponse.error != null) {
  //     console.error("Subgraph query error:", subgraphResponse?.error);
  //     return NextResponse.json(
  //       { error: "Failed to fetch user data" },
  //       { status: 500 },
  //     );
  //   }

  //   if (subgraphResponse.data == null) {
  //     return NextResponse.json({ error: "User not found" }, { status: 404 });
  //   }

  //   const { member, passportUser } = subgraphResponse.data;

  //   if (!member?.memberCommunity || member.memberCommunity.length === 0) {
  //     return NextResponse.json({ error: "Not a member" }, { status: 400 });
  //   }

  //   // Throttle the score update to once per day
  //   const twoHoursMs = 2 * 60 * 60 * 1000;
  //   if (
  //     passportUser &&
  //     +passportUser.score > 0 &&
  //     +passportUser.lastUpdated * 1000 > Date.now() - twoHoursMs
  //   ) {
  //     return NextResponse.json(
  //       {
  //         error:
  //           "Score cannot be updated before " +
  //           new Date(
  //             passportUser.lastUpdated * 1000 + twoHoursMs,
  //           ).toUTCString(),
  //       },
  //       { status: 400 },
  //     );
  //   }
  // } catch (error) {
  //   console.error("Error fetching user data:", error);
  //   return NextResponse.json(
  //     { error: "Internal server error" },
  //     { status: 500 },
  //   );
  // }

  try {
    const client = createPublicClient({
      chain: chain,
      transport: http(chainConfig?.rpcUrl ?? LOCAL_RPC),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(
        (`${LIST_MANAGER_PRIVATE_KEY}` as Address) || "",
      ),
      chain: chain,
      transport: custom(client.transport),
    });

    const isWhitelisted = await fetchGooddollarWhitelisted(user);
    // const integerScore = Math.round(score * CV_PASSPORT_THRESHOLD_SCALE);

    // if (!integerScore || isNaN(integerScore)) {
    //   return NextResponse.json(
    //     { error: "Passport has no score" },
    //     { status: 400 },
    //   );
    // }

    if (!chainConfig?.goodDollarSybil) {
      console.error("Gooddoll Sybil contract address is missing");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (isWhitelisted) {
      const isAlreadyValid = (await client.readContract({
        abi: goodDollarABI,
        address: chainConfig.goodDollarSybil,
        functionName: "userValidity",
        args: [user as Address],
      })) as boolean;

      if (isAlreadyValid) {
        return NextResponse.json({
          message: "User already validated on Gooddollar Sybil smart contract",
          isValid: true,
        });
      }

      const hash = await walletClient.writeContract({
        abi: goodDollarABI,
        // abi: goodDollarABI,
        address: chainConfig.goodDollarSybil,
        functionName: "validateUser",
        chain: chain,
        args: [user as Address],
      });

      return NextResponse.json({
        message: "Validity set successfully",
        transactionHash: hash,
      });
    }
  } catch (error) {
    console.error("Error validating user", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
