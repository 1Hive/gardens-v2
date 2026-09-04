import { notFound } from "next/navigation";
import { Address, getAddress, isAddress, parseAbi } from "viem";
import { CitizenWalletRegistrationFlow } from "@/components/CitizenWalletRegistrationFlow";
import {
  BREAD_TOKEN_ADDRESS,
  buildCitizenRegistrationPath,
  CITIZEN_WALLET_CHAIN_ID,
} from "@/utils/citizenWallet";
import { getCitizenSubmittedAction } from "@/utils/citizenWalletConfirmation";
import {
  CitizenSearchParams,
  getCitizenConnectionParams,
  hasCitizenConnectionParams,
  verifyCitizenConnection,
} from "@/utils/citizenWalletServer";
import { getEnvPublicClient } from "@/utils/publicClient";

type PageProps = {
  params: Promise<{ chain: string; community: string }>;
  searchParams: Promise<CitizenSearchParams>;
};

const registryAbi = parseAbi([
  "function communityName() view returns (string)",
  "function gardenToken() view returns (address)",
  "function getStakeAmountWithFees() view returns (uint256)",
  "function isMember(address account) view returns (bool)",
]);
const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

function OpenInCitizenWallet({
  registrationPath,
}: {
  registrationPath: string;
}) {
  return (
    <section className="col-span-12 mx-auto flex max-w-xl flex-col gap-5 rounded-2xl border border-border-neutral bg-primary p-6">
      <h1>Open with Citizen Wallet</h1>
      <p>
        Open the BREAD community in Citizen Wallet, choose its QR scanner, and
        scan the QR code shown from the Garden’s Join menu.
      </p>
      <p className="text-sm text-neutral-content">
        This page becomes active only after Citizen Wallet opens it with a
        signed connection for the selected smart account.
      </p>
      <a className="text-primary-content underline" href={registrationPath}>
        Reload scanning instructions
      </a>
    </section>
  );
}

export default async function CitizenRegistrationPage({
  params,
  searchParams,
}: PageProps) {
  const route = await params;
  const query = await searchParams;
  const chainId = Number(route.chain);
  if (chainId !== CITIZEN_WALLET_CHAIN_ID || !isAddress(route.community)) {
    notFound();
  }

  const communityAddress = getAddress(route.community) as Address;
  const registrationPath = buildCitizenRegistrationPath(
    communityAddress,
    chainId,
  );

  if (!hasCitizenConnectionParams(query)) {
    return <OpenInCitizenWallet registrationPath={registrationPath} />;
  }

  const connection = await verifyCitizenConnection(query);
  const connectionParams = getCitizenConnectionParams(query);
  if (!connection || !connectionParams) {
    return (
      <section className="col-span-12 mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-danger-content bg-primary p-6">
        <h1>Invalid Citizen Wallet connection</h1>
        <p>
          Return to Citizen Wallet and scan the Gardens registration QR code
          again. The signed connection may be invalid or expired.
        </p>
      </section>
    );
  }

  const client = getEnvPublicClient(chainId);
  const [communityName, gardenToken, registrationCost, isMember] =
    await Promise.all([
      client.readContract({
        address: communityAddress,
        abi: registryAbi,
        functionName: "communityName",
      }),
      client.readContract({
        address: communityAddress,
        abi: registryAbi,
        functionName: "gardenToken",
      }),
      client.readContract({
        address: communityAddress,
        abi: registryAbi,
        functionName: "getStakeAmountWithFees",
      }),
      client.readContract({
        address: communityAddress,
        abi: registryAbi,
        functionName: "isMember",
        args: [connection.account],
      }),
    ]);

  if (getAddress(gardenToken) !== BREAD_TOKEN_ADDRESS) {
    notFound();
  }

  const [balance, allowance, tokenSymbol, tokenDecimals] = await Promise.all([
    client.readContract({
      address: BREAD_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [connection.account],
    }),
    client.readContract({
      address: BREAD_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: [connection.account, communityAddress],
    }),
    client.readContract({
      address: BREAD_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    client.readContract({
      address: BREAD_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return (
    <section className="col-span-12 mx-auto w-full max-w-xl rounded-2xl border border-border-neutral bg-primary p-6">
      <CitizenWalletRegistrationFlow
        account={connection.account}
        communityAddress={communityAddress}
        communityName={communityName}
        redirectUrl={connection.redirectUrl}
        registrationCost={registrationCost.toString()}
        balance={balance.toString()}
        allowance={allowance.toString()}
        isMember={isMember}
        tokenSymbol={tokenSymbol}
        tokenDecimals={tokenDecimals}
        connectionParams={connectionParams}
        submittedAction={getCitizenSubmittedAction(query.citizenAction)}
        transactionHash={
          typeof query.tx === "string" ? query.tx : query.tx?.[0]
        }
      />
    </section>
  );
}
