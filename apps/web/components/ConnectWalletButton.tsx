"use client";

import React, { Fragment, useMemo, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  ChevronUpIcon,
  PowerIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { blo } from "blo";
import cn from "classnames";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { isAddress } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import {
  Address,
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSwitchNetwork,
} from "wagmi";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { isSafeAvatarUrl } from "@/app/api/utils";
import { BeeKeeperNFT, FirstHolderNFT, ProtopianNFT } from "@/assets";
import { walletIcon } from "@/assets";
import { Button, DisplayNumber } from "@/components";
import { ChainIcon } from "@/configs/chains";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useOwnerOfNFT } from "@/hooks/useOwnerOfNFT";
import { formatAddress } from "@/utils/formatAddress";

export function ConnectWallet() {
  const path = usePathname();
  const account = useAccount();
  const chainFromPath = useChainFromPath();
  const urlChainId = chainFromPath?.id;
  const tokenUrlAddress = path.split("/")[3];

  const { switchNetwork } = useSwitchNetwork();
  const { disconnect } = useDisconnect();
  const { connectors } = useConnect();
  const { isOwner: isFirstHolder } = useOwnerOfNFT({
    nft: "FirstHolder",
    chains: [optimism, arbitrum, base, mainnet],
    enabled: account.isConnected,
  });
  const { isOwner: isProtopianHolder } = useOwnerOfNFT({
    nft: "Protopian",
    chains: [optimism, arbitrum, base, mainnet],
    enabled: account.isConnected,
  });
  const { isOwner: isBeekperHolder } = useOwnerOfNFT({
    nft: "Keeper",
    chains: [optimism, arbitrum, base, mainnet],
    enabled: account.isConnected,
  });

  const nfts = useMemo(
    () =>
      [
        {
          image: ProtopianNFT,
          title: "Protopian NFT",
          hasNFT: isProtopianHolder,
        },
        {
          image: BeeKeeperNFT,
          title: "Bee Keeper NFT",
          hasNFT: isBeekperHolder,
        },
        {
          image: FirstHolderNFT,
          title: "First Holder NFT",
          hasNFT: !!isFirstHolder,
        },
      ].filter((nft) => nft.hasNFT),
    [isFirstHolder],
  );

  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);

  const wallet = connectors[0].name;
  const isMockConnection = account.connector?.id === "mock";

  const { data: token } = useBalance({
    address: account?.address,
    token: tokenUrlAddress as `0x${string}` | undefined,
    chainId: urlChainId,
    enabled: !!account.address && urlChainId != null,
  });

  const { data: ensName } = useEnsName({
    address: account?.address as Address,
    enabled: isAddress(account?.address ?? ""),
    chainId: 1,
    cacheTime: 30_000,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    enabled: Boolean(ensName),
    chainId: 1,
    cacheTime: 30_000,
  });

  return (
    <ConnectButton.Custom>
      {({ account: acc, chain, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && !!acc && !!chain;
        const isWrongNetwork =
          chain?.id != urlChainId && urlChainId != null && !isNaN(urlChainId);

        return (
          <>
            {(() => {
              //button to connect wallet
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} testId="connectButton">
                    <Image
                      src={walletIcon}
                      alt="wallet"
                      height={20}
                      width={20}
                      loading="lazy"
                    />
                    <span className="hidden sm:block text-white">
                      Connect wallet
                    </span>
                  </Button>
                );
              }

              //Is CONNECTED to a supported chains with condition => urlChainId(urlChain) === chainId(wallet)
              //Dropdown menu with wallet, balance, switch network and disconnect buttons
              return (
                <Menu as="div" className="flex gap-2 relative">
                  {({ open }) => (
                    <>
                      <Menu.Button>
                        <div
                          className={`flex w-fit cursor-pointer items-center gap-4 rounded-2xl pl-4 py-2 hover:opacity-85 pr-2 
                             ${cn({ "bg-danger-soft dark:bg-danger-soft-dark": urlChainId != null && urlChainId !== chain.id }, { "bg-primary": urlChainId == null || urlChainId === chain.id })}      
                          `}
                        >
                          {isWrongNetwork ?
                            <ExclamationTriangleIcon className="w-6 text-danger-content dark:text-danger-content" />
                          : <Image
                              alt="Wallet Avatar"
                              src={
                                avatarUrl && isSafeAvatarUrl(avatarUrl) ?
                                  avatarUrl
                                : `${blo(acc.address as Address)}`
                              }
                              className="rounded-full"
                              width={34}
                              height={34}
                              loading="lazy"
                            />
                          }
                          <div className="hidden sm:flex flex-col">
                            <h5
                              className={cn(
                                "text-left",
                                "tooltip tooltip-bottom",
                                {
                                  "text-warning-content dark:text-warning-content":
                                    isMockConnection,
                                },
                              )}
                              data-tip={
                                isMockConnection ? "Simulated wallet" : (
                                  undefined
                                )
                              }
                              data-testid="accounts"
                            >
                              {ensName ?? formatAddress(acc.address)}
                            </h5>
                            <div className="flex items-center">
                              {(
                                urlChainId == null ||
                                isNaN(urlChainId!) ||
                                chain.id === urlChainId
                              ) ?
                                <>
                                  <ChainIcon chain={chain.id} height={14} />
                                  <p className="text-xs ml-1">{chain.name}</p>
                                </>
                              : <p
                                  className="text-xs text-danger-content dark:text-danger-content"
                                  data-testid="wrong-network"
                                >
                                  Switch To {chainFromPath?.name ?? ""} Network
                                </p>
                              }
                            </div>
                          </div>
                          <ChevronUpIcon
                            className={`h-3 w-3 font-bold text-neutral-content dark:text-neutral-inverted-content transition-transform duration-200 ease-in-out ${cn(
                              {
                                "rotate-180": !open,
                              },
                            )} `}
                            aria-hidden="true"
                          />
                        </div>
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-200"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="border1 bg-neutral rounded-3xl absolute right-0 top-16 z-10 focus:outline-none">
                          {nfts.map(({ title, image }, i) => (
                            <div
                              key={title}
                              className={`relative w-full ${selectedNFTIndex !== i ? "hidden" : ""}`}
                            >
                              <Image
                                src={image}
                                width={300}
                                height={300}
                                alt={title}
                                className="rounded-t-[18px] w-[300px] h-[300px]"
                                title={title}
                              />
                            </div>
                          ))}

                          {nfts.length > 1 && (
                            <div className="flex w-full justify-center gap-2 py-2">
                              {nfts.map(({ title }, i) => (
                                <span
                                  key={title}
                                  className={`cursor-pointer w-3 h-3 bg-gray-600 rounded-full inline-block mx-1 ${selectedNFTIndex !== i ? "opacity-25" : ""}`}
                                  aria-label="View Protopian NFT"
                                  onClick={() => setSelectedNFTIndex(i)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      setSelectedNFTIndex(i);
                                    }
                                  }}
                                >
                                  <span className="sr-only">View {title}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-col gap-4 rounded-lg p-4 min-w-[300px]">
                            {/* wallet and token balance info */}
                            <Menu.Item as="div" className="flex flex-col gap-2">
                              <div className="flex justify-between py-1">
                                <p className="subtitle2">Wallet</p>{" "}
                                <p className="subtitle2">{wallet}</p>
                              </div>
                              <div className="flex justify-between py-1">
                                <p className="subtitle2">Balance</p>
                                <DisplayNumber
                                  number={(token?.formatted ?? 0).toString()}
                                  tokenSymbol={token?.symbol}
                                />
                              </div>
                            </Menu.Item>

                            {/* Switch network and Disconnect buttons */}
                            <Menu.Item as="div" className="flex flex-col gap-2">
                              {isWrongNetwork && (
                                <Button
                                  className="w-full"
                                  onClick={() =>
                                    switchNetwork && switchNetwork(urlChainId)
                                  }
                                  icon={
                                    <ArrowsRightLeftIcon
                                      className="h-5 w-5"
                                      strokeWidth={10}
                                    />
                                  }
                                  testId="switch-network-button"
                                >
                                  <TooltipIfOverflow>
                                    {`Switch to ${chainFromPath?.name ?? ""}`}
                                  </TooltipIfOverflow>
                                </Button>
                              )}

                              <Button
                                onClick={() => disconnect()}
                                btnStyle="filled"
                                color="danger"
                                className="w-full"
                                icon={
                                  <PowerIcon
                                    className="h-5 w-5"
                                    strokeWidth={10}
                                  />
                                }
                              >
                                Disconnect
                              </Button>
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </>
                  )}
                </Menu>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
