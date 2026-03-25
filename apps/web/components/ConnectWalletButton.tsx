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
import { useHasContractCode } from "@/hooks/useHasContractCode";
import { useOwnerOfNFT } from "@/hooks/useOwnerOfNFT";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import {
  AUTOCONNECT_RESET_EVENT,
  SKIP_AUTOCONNECT_STORAGE_KEY,
  WALLETCONNECT_RESET_EVENT,
} from "@/providers/Providers";
import { formatAddress } from "@/utils/formatAddress";

const WALLETCONNECT_STORAGE_KEY_PREFIXES = [
  "wc@",
  "walletconnect",
  "WALLETCONNECT_DEEPLINK_CHOICE",
];
const DISCONNECT_RESET_STORAGE_KEY_PREFIXES = [
  ...WALLETCONNECT_STORAGE_KEY_PREFIXES,
  "wagmi",
  "rk-",
];
const DISCONNECT_RESET_STORAGE_KEY_SUBSTRINGS = ["recentWalletIds"];

type WalletConnectProviderLike = {
  disconnect?: () => Promise<void> | void;
  session?: unknown;
  modal?: {
    closeModal?: () => void;
  };
};

const clearDisconnectPersistence = (storage: Storage) => {
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) {
      continue;
    }

    if (
      DISCONNECT_RESET_STORAGE_KEY_PREFIXES.some((prefix) =>
        key.startsWith(prefix),
      ) ||
      DISCONNECT_RESET_STORAGE_KEY_SUBSTRINGS.some((fragment) =>
        key.includes(fragment),
      )
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
};

const WALLETCONNECT_INDEXED_DB_NAME_FRAGMENTS = [
  "walletconnect",
  "wallet_connect",
  "wc@",
];

const clearWalletConnectIndexedDb = async () => {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }

  const indexedDbWithDatabases = window.indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };

  if (indexedDbWithDatabases.databases == null) {
    return;
  }

  const databases = await indexedDbWithDatabases.databases();
  await Promise.all(
    databases.map(async ({ name }) => {
      if (
        !name ||
        !WALLETCONNECT_INDEXED_DB_NAME_FRAGMENTS.some((fragment) =>
          name.toLowerCase().includes(fragment),
        )
      ) {
        return;
      }

      await new Promise<void>((resolve) => {
        const request = window.indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }),
  );
};

export function ConnectWallet() {
  const path = usePathname();
  const account = useAccount();
  const chainFromPath = useChainFromPath();
  const urlChainId = chainFromPath?.id;
  const pathSegments = useMemo(
    () => path.split("/").filter((segment) => segment !== ""),
    [path],
  );
  const communitySegment =
    pathSegments[0] === "gardens" ? pathSegments[2] : undefined;
  const communityAddress =
    communitySegment && isAddress(communitySegment) ?
      communitySegment
    : undefined;

  const { data: communityData } = useSubgraphQuery({
    query: getCommunityNameDocument,
    variables: { communityAddr: communityAddress ?? "" },
    enabled: !!communityAddress,
  });

  const tokenUrlAddress = communityData?.registryCommunity?.garden?.id;

  const { switchNetwork } = useAppSwitchNetwork();
  const { disconnectAsync } = useDisconnect();
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

  useEffect(() => {
    if (!account.isConnected || account.connector?.id !== "walletConnect") {
      return;
    }

    type WalletConnectProviderWithModal = {
      modal?: {
        closeModal?: () => void;
      };
    };

    void account.connector
      .getProvider()
      .then((provider) => {
        (provider as WalletConnectProviderWithModal).modal?.closeModal?.();
      })
      .catch(() => {
        // Ignore provider access failures. This only cleans up a stale QR modal.
      });
  }, [account.connector, account.isConnected]);

  useEffect(() => {
    if (!account.isConnected || typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(SKIP_AUTOCONNECT_STORAGE_KEY) !== "true") {
      return;
    }

    window.localStorage.removeItem(SKIP_AUTOCONNECT_STORAGE_KEY);
  }, [account.isConnected]);

  const handleDisconnect = useCallback(async () => {
    const connector = account.connector;
    const isWalletConnectConnector = connector?.id === "walletConnect";
    let provider: WalletConnectProviderLike | null = null;

    try {
      if (isWalletConnectConnector) {
        provider =
          (await connector.getProvider()) as WalletConnectProviderLike | null;

        provider?.modal?.closeModal?.();
      }
    } catch {
      // Ignore provider-level disconnect failures and still clear local state.
    } finally {
      await disconnectAsync();

      if (isWalletConnectConnector && provider?.session) {
        try {
          await provider.disconnect?.();
        } catch {
          // Ignore late WalletConnect provider disconnect failures after wagmi disconnect.
        }
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SKIP_AUTOCONNECT_STORAGE_KEY, "true");
        clearDisconnectPersistence(window.localStorage);
        clearDisconnectPersistence(window.sessionStorage);
        await clearWalletConnectIndexedDb();
        window.dispatchEvent(new Event(AUTOCONNECT_RESET_EVENT));
        window.dispatchEvent(new Event(WALLETCONNECT_RESET_EVENT));
      }
    }
  }, [account.connector, disconnectAsync]);

  const wallet = connectors[0].name;
  const isMockConnection = account.connector?.id === "mock";
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

  const handleOpenConnectModal = useCallback(
    (openConnectModal?: (() => void) | undefined) => {
      openConnectModal?.();
    },
    [],
  );

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
                  <Button onClick={() => handleOpenConnectModal(openConnectModal)}>
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
                              : <p className="text-xs text-danger-content dark:text-danger-content">
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
                                {token ?
                                  <DisplayNumber
                                    number={(token.formatted ?? 0).toString()}
                                    tokenSymbol={token.symbol}
                                  />
                                : <span className="subtitle2 text-neutral-soft-content">
                                    Unavailable
                                  </span>}
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
