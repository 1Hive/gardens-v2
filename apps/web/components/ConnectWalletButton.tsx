"use client";

import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  ChevronUpIcon,
  PowerIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/solid";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import cn from "classnames";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchNetwork,
} from "wagmi";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { walletIcon } from "@/assets";
import { Button, DisplayNumber } from "@/components";
import { ChainIcon } from "@/configs/chains";
import { useChainFromPath } from "@/hooks/useChainFromPath";
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

  const wallet = connectors[0].name;

  const { data: token } = useBalance({
    address: account?.address,
    token: tokenUrlAddress as `0x${string}` | undefined,
    chainId: urlChainId,
    enabled: !!account && !!urlChainId,
  });

  return (
    <ConnectButton.Custom>
      {({ account: accountAddress, chain, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && accountAddress && chain;
        const isWrongNetwork =
          chain?.id != urlChainId && urlChainId && !isNaN(urlChainId);

        return (
          <>
            {(() => {
              //button to connect wallet
              if (!connected) {
                return (
                  <Button onClick={openConnectModal}>
                    <Image
                      src={walletIcon}
                      alt="wallet"
                      height={20}
                      width={20}
                      loading="lazy"
                    />
                    <span className="hidden sm:block">Connect wallet</span>
                  </Button>
                );
              }
              //WRONG NETWORK! button if wallet is connected to unsupported chains
              // if (chain.unsupported) {
              //   return (
              //     <Button
              //       onClick={openChainModal}
              //       btnStyle="outline"
              //       color="danger"
              //     >
              //       Wrong network
              //     </Button>
              //   );
              // }

              //Is CONNECTED to a supported chains with condition => urlChainId(urlChain) === chainId(wallet)
              //Dropdown menu with wallet, balance, switch network and disconnect buttons
              return (
                <Menu as="div" className="flex gap-2 relative">
                  {({ open }) => (
                    <>
                      <Menu.Button>
                        <div
                          className={`flex w-fit cursor-pointer items-center gap-4 rounded-2xl pl-4 py-2 hover:opacity-85 pr-2 
                             ${cn({ "bg-danger-soft": urlChainId && urlChainId !== chain.id }, { "bg-primary": !urlChainId || urlChainId === chain.id })}      
                          `}
                        >
                          {isWrongNetwork ?
                            <ExclamationTriangleIcon className="text-danger-content w-6" />
                          : <Image
                              alt={"Chain icon"}
                              src={`https://effigy.im/a/${accountAddress.address}.png`}
                              className="rounded-full"
                              width={34}
                              height={34}
                              loading="lazy"
                            />
                          }
                          <div className="hidden sm:flex flex-col">
                            <h5 className="text-left">
                              {formatAddress(accountAddress.address)}
                            </h5>
                            <div className="flex items-center">
                              {(
                                !urlChainId ||
                                isNaN(urlChainId!) ||
                                chain.id === urlChainId
                              ) ?
                                <>
                                  <ChainIcon chain={chain.id} height={14} />
                                  <p className="text-xs ml-1">{chain.name}</p>
                                </>
                              : <p className="text-danger-content text-xs">
                                  Switch to network {chainFromPath?.name ?? ""}
                                </p>
                              }
                            </div>
                          </div>
                          <ChevronUpIcon
                            className={`h-3 w-3 font-bold text-black transition-transform duration-200 ease-in-out ${cn(
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
                                  className="text-primary-content"
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
