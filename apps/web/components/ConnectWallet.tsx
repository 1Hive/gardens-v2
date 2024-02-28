"use client";
import React, { useState, useEffect } from "react";
import {
  useBalance,
  useChainId,
  useSwitchNetwork,
  useNetwork,
  Address,
} from "wagmi";
import { usePathname } from "next/navigation";
import { getChain } from "@/configs/chainServer";
import Image from "next/image";
import { walletIcon } from "@/assets";
import {
  useConnectModal,
  useAccountModal,
  useChainModal,
  ConnectButton,
  useAddRecentTransaction,
} from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import cn from "classnames";
import { EthAddress } from "@/components";
import { Fragment, useRef } from "react";
import type { ReactNode } from "react";
import { useHover } from "@/hooks/useIsHover";

import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export const ConnectWallet = () => {
  return (
    <>
      {/* {networkWagmi?.id == 1 ? (
        <div className="border2">wrong network</div>
      ) : (
        <button
          //with this function we can switch to the arbitrumSep network
          onClick={() => switchNetwork && switchNetwork(urlChainId)}
          className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        >
          <div>switch to arbitrumSep - connected to {chainId}</div>
          {network.chain && (
            <div>Wallet frame is connected to {network.chain.name}</div>
          )}
          <div>balance: {!token ? "0" : data?.formatted.toString()}</div>
        </button>
      )} */}
      <YourButton />
    </>
  );
};

const YourButton = () => {
  const path = usePathname();
  const chainId = useChainId();
  const result = useBalance({
    address: "0xcc6c8b9f745db2277f7aac1bc026d5c2ea7bd88d",
  });
  const urlChainId = Number(path.split("/")[2]);
  const token = path.split("/")[3];

  console.log("token", token);

  const { data, isError, isLoading } = useBalance({
    address: "0x5BE8Bb8d7923879c3DDc9c551C5Aa85Ad0Fa4dE3",
    token: token as `0x${string}` | undefined,
    chainId: urlChainId || 0,
  });

  const { switchNetwork } = useSwitchNetwork();

  const { disconnect } = useDisconnect();

  const network = useNetwork();
  console.log("my wallet is connect to", network);

  console.log("the chain urlPath:", urlChainId);
  console.log("wagmiChainId:", chainId);
  console.log("urlChainId:", urlChainId);
  console.log("result:", data?.formatted);

  console.log("getChainUsingUrl", getChain(urlChainId));
  console.log("getChainUsingchainId", getChain(chainId));
  const networkWagmi = getChain(network?.chain?.id as string | number);
  console.log("networkWagmi", networkWagmi);

  const ref = useRef<HTMLDivElement>(null);

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
          <div
            {...(!ready && {
              "aria-hidden": true,
              className: " pointer-events-none border2",
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <div className="relative flex text-black hover:brightness-90 active:scale-95">
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="border2 flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold uppercase transition-all ease-out hover:brightness-90 active:scale-95"
                    >
                      <Image
                        src={walletIcon}
                        alt="wallet"
                        height={30}
                        width={30}
                        className=""
                      />
                      Connect
                    </button>
                  </div>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="btn btn-error px-4 py-2 font-bold text-white"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <div>
                  <button
                    onClick={openChainModal}
                    style={{ display: "flex", alignItems: "center" }}
                    type="button"
                  >
                    {/* {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )} */}
                    {/* {chain.name} */}
                  </button>
                  <div
                    className="border2 relative flex w-56 gap-2 rounded-lg px-2 py-1"
                    ref={ref}
                  >
                    <img
                      alt={"Chain icon"}
                      src={`https://effigy.im/a/${account.address}.png`}
                      className="border2 h-10 w-10 rounded-full"
                    />
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="w-fit"
                    >
                      <span className="">{account.displayName}</span>
                    </button>
                    <Dropdown>
                      <Menu.Item>
                        {({ active }) => (
                          <div
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm",
                            )}
                          >
                            Wallet:
                          </div>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <div
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm",
                            )}
                          >
                            Balance
                          </div>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <div
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm",
                            )}
                          >
                            Switch Network
                          </div>
                        )}
                      </Menu.Item>
                      {/* <Menu.Item>
                        {({ active }) => (
                          <div
                            className={classNames(
                              active
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700",
                              "block px-4 py-2 text-sm",
                            )}
                          >
                            <button
                              className="btn btn-warning"
                              onClick={() => disconnect()}
                            >
                              Disconnect
                            </button>
                          </div>
                        )}
                      </Menu.Item> */}
                    </Dropdown>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

function Dropdown({ children }: { children: ReactNode }) {
  return (
    <Menu as="div" className="border2 inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="border2 absolute left-0 right-5 top-0 z-50 mr-10 mt-14 w-56 rounded-md bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">{children}</div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
