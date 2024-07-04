"use client";
import React from "react";
import { useBalance, useSwitchNetwork } from "wagmi";
import { usePathname } from "next/navigation";
import { ChainIcon } from "@/configs/chainServer";
import Image from "next/image";
import { walletIcon } from "@/assets";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect, useConnect, useAccount } from "wagmi";
import cn from "classnames";
import { Button } from "@/components";
import { Fragment } from "react";
import { formatAddress } from "@/utils/formatAddress";
import { Menu, Transition } from "@headlessui/react";
import { ChevronUpIcon, PowerIcon } from "@heroicons/react/24/solid";
import useChainFromPath from "@/hooks/useChainIdFromtPath";

export function ConnectWallet() {
  const path = usePathname();
  const account = useAccount();
  const chainFromPath = useChainFromPath();
  const { id: urlChainId } = chainFromPath;
  const tokenUrlAddress = path.split("/")[3];

  const { switchNetwork } = useSwitchNetwork();
  const { disconnect } = useDisconnect();
  const { connectors } = useConnect();

  const wallet = connectors[0].name;

  const { data: token } = useBalance({
    address: account?.address,
    token: tokenUrlAddress as `0x${string}` | undefined,
    chainId: urlChainId || 0,
  });
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;
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
                    />
                    Connect
                  </Button>
                );
              }
              //WRONG NETWORK! button if wallet is connected to unsupported chains
              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    btnStyle="outline"
                    color="danger"
                  >
                    Wrong network
                  </Button>
                );
              }
              //Is CONNECTED to a supported chains with condition => urlChainId(urlChain) === chainId(wallet)
              //Dropdown menu with wallet, balance, switch network and disconnect buttons
              return (
                <Menu as="div" className="relative inline-block text-left">
                  {({ open }) => (
                    <>
                      <Menu.Button>
                        <div
                          className={`flex w-fit cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:opacity-85 
                      ${cn({
                        "border-2 border-danger-content":
                          urlChainId !== chain.id && !isNaN(urlChainId),
                      })} `}
                        >
                          <Image
                            alt={"Chain icon"}
                            src={`https://effigy.im/a/${account.address}.png`}
                            className="h-8 w-8 rounded-full"
                            width={32}
                            height={32}
                          />
                          <div className="flex flex-col">
                            <h4 className="text-left">
                              {formatAddress(account.address)}
                            </h4>
                            <div className="ml-[2px] flex items-center text-xs font-semibold text-success">
                              {!urlChainId ||
                              isNaN(urlChainId!) ||
                              chain.id === urlChainId ? (
                                <>
                                  <span>Connected to</span>
                                  <div className="mx-1">
                                    <ChainIcon chain={chain.id} height={16} />
                                  </div>
                                  <span>{chain.name}</span>
                                </>
                              ) : (
                                <span className="text-danger-content">
                                  Network mismatch
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronUpIcon
                            className={`h-4 w-4 font-bold text-black transition-transform duration-200 ease-in-out ${cn(
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
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 top-0 z-10  mt-14 rounded-md bg-white focus:outline-none">
                          <div className="border2 flex flex-col gap-4 rounded-lg p-4">
                            {/* wallet and token balance info */}
                            <Menu.Item as="div" className="flex flex-col gap-2">
                              <div className="flex justify-between py-1">
                                <span className="stat-title">Wallet</span>{" "}
                                <span className="text-sm">{wallet}</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="stat-title">Balance</span>
                                <span className="text-sm">
                                  {" "}
                                  {!tokenUrlAddress
                                    ? "Unknow garden"
                                    : Number(token?.formatted).toFixed(0)}{" "}
                                  {token?.symbol === "ETH" ? "" : token?.symbol}
                                </span>
                              </div>
                            </Menu.Item>

                            {/* Switch network and Disconnect buttons */}
                            <Menu.Item as="div" className="flex flex-col gap-2">
                              {chain.id !== urlChainId &&
                                urlChainId &&
                                !isNaN(urlChainId) && (
                                  <Button
                                    className="overflow-hidden truncate"
                                    onClick={() =>
                                      switchNetwork && switchNetwork(urlChainId)
                                    }
                                  >
                                    Switch to {chainFromPath?.name ?? ""}
                                  </Button>
                                )}

                              <Button
                                onClick={() => disconnect()}
                                btnStyle="outline"
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
