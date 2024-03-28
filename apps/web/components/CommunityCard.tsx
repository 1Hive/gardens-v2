"use client";
import { Button, RegisterMember } from "@/components";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { PoolCard, IncreasePower } from "@/components";
import { CommunityProfile } from "@/components";
import { Address, useAccount, useContractWrite } from "wagmi";
import {
  TokenGarden,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { registryCommunityABI } from "@/src/generated";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type CommunityQuery = NonNullable<
  NonNullable<getCommunitiesByGardenQuery["tokenGarden"]>["communities"]
>[number];

type CommunityCardProps = CommunityQuery & {
  tokenGarden: TokenGarden | undefined;
} & {
  covenantData?: { logo: string; covenant: string };
};

export function CommunityCard({
  covenantData,
  communityName: name,
  id: communityAddress,
  strategies,
  members,
  registerStakeAmount,
  protocolFee,
  communityFee,
  tokenGarden,
}: CommunityCardProps) {
  // const [open, setOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const { openConnectModal } = useConnectModal();

  const pools = strategies ?? [];
  members = members ?? [];
  let registerToken = tokenGarden?.id ?? "0x0";
  registerStakeAmount = registerStakeAmount ?? 0;

  return (
    <>
      <div className="border2 card card-side bg-white">
        {/* aside:  community name + btn to access profile */}
        <aside className="flex min-h-[300px] w-[280px] flex-col items-center justify-center gap-10 rounded-xl bg-base-100 p-2">
          <h3 className="text-center font-press text-xl text-info-content">
            {name}
          </h3>
          <CommunityProfile
            communityAddress={communityAddress as Address}
            name={name as string}
            covenantData={covenantData}
          />
        </aside>

        {/* main: stats, action buttons, display pools */}
        <main className="card-body space-y-10">
          <div className="stats flex">
            <div className="stat flex-1">
              <div className="stat-figure text-primary">
                <UserGroupIcon className="inline-block h-8 w-8 text-primary" />
              </div>
              <div className="stat-title">Members</div>
              <div className="stat-value text-primary">{members.length}</div>
              <div className="stat-desc">
                {formatTokenAmount(registerStakeAmount, tokenGarden?.decimals)}{" "}
                {tokenGarden?.symbol} membership
              </div>
            </div>

            <div className="stat flex-1">
              <div className="stat-figure text-secondary">
                <BuildingOffice2Icon className="inline-block h-8 w-8 text-secondary" />
              </div>
              <div className="stat-title">Pools</div>
              <div className="stat-value text-secondary">{pools.length}</div>
              {/* TODO: add this parameter */}
              <div className="stat-desc"> # in total funds</div>
            </div>
          </div>

          <div>
            {accountAddress ? (
              <RegisterMember
                name={name as string}
                connectedAccount={accountAddress as Address}
                tokenSymbol={tokenGarden?.symbol as string}
                communityAddress={communityAddress as Address}
                registerToken={registerToken as Address}
                registerTokenDecimals={tokenGarden?.decimals as number}
                membershipAmount={registerStakeAmount}
                protocolFee={protocolFee}
                communityFee={communityFee}
              />
            ) : (
              <Button onClick={openConnectModal} className="w-full">
                Connect Wallet
              </Button>
            )}

            <div className="flex-1"> {/* TODO: add pool btn here ???*/}</div>
          </div>
          <div className="justify-end">
            <div
              className={`flex w-full transform gap-4 overflow-x-auto transition-height duration-200 ease-in-out ${
                !open && "max-h-[290px]"
              } `}
            >
              {pools.map((pool, i) => (
                <PoolCard tokenGarden={tokenGarden} {...pool} key={i} />
              ))}

              {/* {pools.length > 2 && (
                <Button
                  className="!rounded-full bg-white !p-3"
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <ChevronDownIcon
                    className={`block h-6 w-6 stroke-2 ${open && "rotate-180"}`}
                    aria-hidden="true"
                  />
                </Button>
              )} */}
            </div>
            <IncreasePower
              communityAddress={communityAddress as Address}
              registerToken={registerToken as Address}
              connectedAccount={accountAddress as Address}
              tokenSymbol={tokenGarden?.symbol as string}
              registerTokenDecimals={tokenGarden?.decimals as number}
            />
          </div>
        </main>
      </div>
    </>
  );
}
