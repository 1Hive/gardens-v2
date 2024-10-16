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
import { initUrqlClient } from "@/providers/urql";
import { passportScorerABI } from "@/src/generated";
import { CV_PASSPORT_THRESHOLD_SCALE } from "@/utils/numbers";
import { getViemChain } from "@/utils/web3";
const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;
const LOCAL_RPC = "http://127.0.0.1:8545";

const fetchScoreFromGitcoin = async (user: string) => {
  const url = `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/passport`;
  const response = await fetch(`${url}/${user}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data.score;
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch score from Gitcoin");
  }
};

export async function POST(req: Request, { params }: Params) {
  const { chain } = params;
  const { user } = await req.json();

  if (typeof user !== "string") {
    return NextResponse.json(
      {
        error: "User address is required",
      },
      { status: 400 },
    );
  }

  const chainConfig = getConfigByChain(chain);

  try {
    const subgraphUrl = chainConfig?.subgraphUrl as string;
    const { urqlClient } = initUrqlClient({ chainId: chain });
    const subgraphResponse = await urqlClient
      .query<getMemberPassportAndCommunitiesQuery>(
        getMemberPassportAndCommunitiesDocument,
        {
          memberId: user.toLowerCase(),
        },
        {
          url: subgraphUrl,
          requestPolicy: "network-only",
        },
      )
      .toPromise();

    if (subgraphResponse.data == null) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { member, passportUser } = subgraphResponse.data;

    if (!member?.memberCommunity || member.memberCommunity.length === 0) {
      return NextResponse.json(
        { error: "User has no communities" },
        { status: 400 },
      );
    }

    // Throttle the score update to once per day
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (
      passportUser &&
      +passportUser.score > 0 &&
      +passportUser.lastUpdated * 1000 > Date.now() - twoHoursMs
    ) {
      return NextResponse.json(
        {
          error:
            "User score cannot be updated before " +
            new Date(
              passportUser.lastUpdated * 1000 + twoHoursMs,
            ).toUTCString(),
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  try {
    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http(chainConfig?.rpcUrl ?? LOCAL_RPC),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(
        (`${LIST_MANAGER_PRIVATE_KEY}` as Address) || "",
      ),
      chain: getViemChain(chain),
      transport: custom(client.transport),
    });

    const score = await fetchScoreFromGitcoin(user);
    const integerScore = Number(score) * CV_PASSPORT_THRESHOLD_SCALE;

    if (!chainConfig?.passportScorer) {
      console.error("Passport scorer contract address is missing");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const hash = await walletClient.writeContract({
      abi: passportScorerABI,
      address: chainConfig.passportScorer,
      functionName: "addUserScore",
      args: [user as Address, BigInt(integerScore)],
    });

    return NextResponse.json({
      message: "User score added successfully",
      transactionHash: hash,
    });
  } catch (error) {
    console.error("Error adding user score:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
