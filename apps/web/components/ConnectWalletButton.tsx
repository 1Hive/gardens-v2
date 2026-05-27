"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Menu, Transition } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  ChevronUpIcon,
  PowerIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import { blo } from "blo";
import cn from "classnames";
import { useIsMounted, useModal } from "connectkit";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { isAddress } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import {
  Address,
  useAccount,
  useBalance,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useNetwork,
} from "wagmi";
import { getCommunityNameDocument } from "#/subgraph/.graphclient";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { isSafeAvatarUrl } from "@/app/api/utils";
import { BeeKeeperNFT, FirstHolderNFT, ProtopianNFT } from "@/assets";
import { walletIcon } from "@/assets";
import { Button, DisplayNumber } from "@/components";
import { ChainIcon } from "@/configs/chains";
import { useAppSwitchNetwork } from "@/hooks/useAppSwitchNetwork";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useExplorerPreference } from "@/hooks/useExplorerPreference";
import { useHasContractCode } from "@/hooks/useHasContractCode";
import { useOwnerOfNFT } from "@/hooks/useOwnerOfNFT";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { formatAddress } from "@/utils/formatAddress";
import {
  clearWalletConnectSessionStorage,
  WALLETCONNECT_CONNECTOR_IDS,
} from "@/utils/walletConnectMobile";

const getWalletDisplayName = (name?: string) => {
  if (!name) return "Wallet";
  return name;
};

const hasProviderInfoMatching = (
  provider: any,
  matcher: (value: string) => boolean,
) => {
  const providerInfo = [
    provider?.info?.name,
    provider?.info?.rdns,
    provider?.selectedProvider?.info?.name,
    provider?.selectedProvider?.info?.rdns,
    ...(Array.isArray(provider?.providers) ?
      provider.providers.flatMap((nestedProvider: any) => [
        nestedProvider?.info?.name,
        nestedProvider?.info?.rdns,
      ])
    : []),
  ];

  return providerInfo.some(
    (value) => typeof value === "string" && matcher(value.toLowerCase()),
  );
};

const getWalletDisplayNameFromProvider = (provider: any) => {
  if (
    provider?.isRabby === true ||
    provider?.selectedProvider?.isRabby === true ||
    (Array.isArray(provider?.providers) &&
      provider.providers.some(
        (nestedProvider: any) => nestedProvider?.isRabby === true,
      ))
  ) {
    return "Rabby Wallet";
  }

  if (
    provider?.isCoinbaseWallet === true ||
    provider?.selectedProvider?.isCoinbaseWallet === true ||
    (Array.isArray(provider?.providers) &&
      provider.providers.some(
        (nestedProvider: any) => nestedProvider?.isCoinbaseWallet === true,
      )) ||
    hasProviderInfoMatching(provider, (value) => value.includes("coinbase"))
  ) {
    return "Coinbase Wallet";
  }

  if (
    provider?.isBraveWallet === true ||
    provider?.selectedProvider?.isBraveWallet === true ||
    (Array.isArray(provider?.providers) &&
      provider.providers.some(
        (nestedProvider: any) => nestedProvider?.isBraveWallet === true,
      )) ||
    hasProviderInfoMatching(provider, (value) => value.includes("brave"))
  ) {
    return "Brave Wallet";
  }

  if (
    provider?.isFrame === true ||
    provider?.selectedProvider?.isFrame === true ||
    (Array.isArray(provider?.providers) &&
      provider.providers.some(
        (nestedProvider: any) => nestedProvider?.isFrame === true,
      )) ||
    hasProviderInfoMatching(provider, (value) => value.includes("frame"))
  ) {
    return "Frame";
  }

  if (
    provider?.isMetaMask === true ||
    provider?.selectedProvider?.isMetaMask === true ||
    (Array.isArray(provider?.providers) &&
      provider.providers.some(
        (nestedProvider: any) => nestedProvider?.isMetaMask === true,
      )) ||
    hasProviderInfoMatching(provider, (value) => value.includes("metamask"))
  ) {
    return "MetaMask";
  }

  return undefined;
};

const getProviderDebugMetadata = (provider: any) => {
  if (!provider) {
    return null;
  }

  return {
    info: provider.info,
    selectedProviderInfo: provider.selectedProvider?.info,
    providers:
      Array.isArray(provider.providers) ?
        provider.providers.map((nestedProvider: any) => ({
          info: nestedProvider?.info,
          isRabby: nestedProvider?.isRabby,
          isMetaMask: nestedProvider?.isMetaMask,
          isCoinbaseWallet: nestedProvider?.isCoinbaseWallet,
        }))
      : undefined,
    isRabby: provider.isRabby,
    isMetaMask: provider.isMetaMask,
    isCoinbaseWallet: provider.isCoinbaseWallet,
    isFrame: provider.isFrame,
    isBraveWallet: provider.isBraveWallet,
  };
};

export function ConnectWallet() {
  const path = usePathname();
  const account = useAccount();
  const { chain } = useNetwork();
  const isMounted = useIsMounted();
  const { setOpen: setConnectModalOpen } = useModal();
  const chainFromPath = useChainFromPath();
  const urlChainId = chainFromPath?.id;
  const pathSegments = useMemo(
    () => path.split("/").filter((segment) => segment !== ""),
    [path],
  );
  const communitySegment =
    pathSegments[0] === "gardens" ? pathSegments[2] : undefined;
  const communityAddress =
    communitySegment && isAddress(communitySegment) ? communitySegment : (
      undefined
    );

  const { data: communityData } = useSubgraphQuery({
    query: getCommunityNameDocument,
    variables: { communityAddr: communityAddress ?? "" },
    enabled: !!communityAddress,
  });

  const tokenUrlAddress = communityData?.registryCommunity?.garden?.id;

  const { switchNetwork } = useAppSwitchNetwork();
  const { explorerPreference, setExplorerPreference } = useExplorerPreference();
  const { disconnectAsync } = useDisconnect();
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
    [isBeekperHolder, isFirstHolder, isProtopianHolder],
  );

  const [selectedNFTIndex, setSelectedNFTIndex] = useState(0);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [providerWalletDisplayName, setProviderWalletDisplayName] = useState<
    string | null
  >(null);

  const handleDisconnect = useCallback(async () => {
    const connector = account.connector;
    const isWalletConnect =
      connector != null && WALLETCONNECT_CONNECTOR_IDS.has(connector.id);

    try {
      setIsDisconnecting(true);
      await disconnectAsync();
    } finally {
      if (isWalletConnect) {
        const removedKeys = clearWalletConnectSessionStorage();
        console.info("[walletconnect-debug] cleared storage on disconnect", {
          connector: {
            id: connector?.id,
            name: connector?.name,
          },
          removedKeys,
        });
      }
      setIsDisconnecting(false);
    }
  }, [account.connector, disconnectAsync]);

  const wallet =
    providerWalletDisplayName ?? getWalletDisplayName(account.connector?.name);
  const isMockConnection = account.connector?.id === "mock";

  useEffect(() => {
    if (!account.isConnected || !account.connector) {
      setProviderWalletDisplayName(null);
      return;
    }

    let cancelled = false;

    account.connector
      .getProvider()
      .then((provider) => {
        if (cancelled) {
          return;
        }

        setProviderWalletDisplayName(
          getWalletDisplayNameFromProvider(provider) ?? null,
        );

        console.info("[wallet-debug] connected wallet metadata", {
          connector: {
            id: account.connector?.id,
            name: account.connector?.name,
            ready: account.connector?.ready,
          },
          provider: getProviderDebugMetadata(provider),
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.info("[wallet-debug] failed to inspect wallet provider", {
            connector: {
              id: account.connector?.id,
              name: account.connector?.name,
            },
            error,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [account.connector, account.isConnected]);

  const { hasContractCode: hasGardenTokenContract } = useHasContractCode({
    address: tokenUrlAddress,
    chainId: urlChainId,
    enabled: !!tokenUrlAddress && urlChainId != null,
  });

  const { data: token } = useBalance({
    address: account?.address,
    token: tokenUrlAddress as `0x${string}` | undefined,
    chainId: urlChainId,
    enabled:
      !!account.address &&
      urlChainId != null &&
      !!tokenUrlAddress &&
      hasGardenTokenContract,
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

  const handleOpenConnectModal = useCallback(() => {
    setConnectModalOpen(true);
  }, [setConnectModalOpen]);

  const connected =
    isMounted &&
    account.isConnected &&
    account.address != null &&
    chain != null;
  const walletAddress = account.address;
  const isWrongNetwork =
    chain?.id != urlChainId && urlChainId != null && !isNaN(urlChainId);

  if (!connected || walletAddress == null || chain == null) {
    return (
      <Button onClick={handleOpenConnectModal} testId="connectButton">
        <Image
          src={walletIcon}
          alt="wallet"
          height={20}
          width={20}
          loading="lazy"
        />
        <span className="hidden sm:block text-white">Connect wallet</span>
      </Button>
    );
  }

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
                    avatarUrl && isSafeAvatarUrl(avatarUrl) ? avatarUrl : (
                      `${blo(walletAddress as Address)}`
                    )
                  }
                  className="rounded-full"
                  width={34}
                  height={34}
                  loading="lazy"
                />
              }
              <div className="hidden sm:flex flex-col">
                <h5
                  className={cn("text-left", "tooltip tooltip-bottom", {
                    "text-warning-content dark:text-warning-content":
                      isMockConnection,
                  })}
                  data-tip={isMockConnection ? "Simulated wallet" : undefined}
                  data-testid="accounts"
                >
                  {ensName ?? formatAddress(walletAddress)}
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
                  <div className="flex w-full items-start justify-between gap-3 py-1">
                    <p className="subtitle2">Wallet</p>
                    <p className="subtitle2 min-w-0 break-words text-right w-fit">
                      {wallet}
                    </p>
                  </div>
                  {token && (
                    <div className="flex justify-between py-1">
                      <p className="subtitle2">Balance</p>
                      <DisplayNumber
                        number={(token.formatted ?? 0).toString()}
                        tokenSymbol={token.symbol}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 py-1">
                    <p className="subtitle2">Explorer</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span
                        className={cn("text-xs", {
                          "font-semibold text-neutral-content":
                            explorerPreference === "etherscan",
                          "text-neutral-soft-content":
                            explorerPreference !== "etherscan",
                        })}
                      >
                        Etherscan
                      </span>
                      <input
                        type="checkbox"
                        className="toggle toggle-sm [--tglbg:theme(colors.primary)] checked:[--tglbg:theme(colors.primary)]"
                        aria-label="Toggle preferred block explorer"
                        checked={explorerPreference === "blockscout"}
                        onChange={(event) => {
                          setExplorerPreference(
                            event.target.checked ? "blockscout" : "etherscan",
                          );
                        }}
                      />
                      <span
                        className={cn("text-xs", {
                          "font-semibold text-neutral-content":
                            explorerPreference === "blockscout",
                          "text-neutral-soft-content":
                            explorerPreference !== "blockscout",
                        })}
                      >
                        Blockscout
                      </span>
                    </label>
                  </div>
                </Menu.Item>

                {/* Switch network and Disconnect buttons */}
                <Menu.Item as="div" className="flex flex-col gap-2">
                  {isWrongNetwork && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (urlChainId != null) {
                          switchNetwork(urlChainId);
                        }
                      }}
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
                    onClick={() => {
                      void handleDisconnect();
                    }}
                    btnStyle="filled"
                    color="danger"
                    disabled={isDisconnecting}
                    className="w-full"
                    icon={<PowerIcon className="h-5 w-5" strokeWidth={10} />}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
