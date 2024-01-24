import React from "react";
import { headers } from "next/headers";
import WagmiProvider from "./WagmiProvider";
import { State, cookieToInitialState } from "wagmi";
import ThemeProvider from "./ThemeProvider";
import UrqlProvider from "./UrqlProvider";
import Web3OnboardProvider from "./web3OnBoardProvider";
import { wagmiConfig } from "@/configs/wagmiConfig";

type Props = {
  children: React.ReactNode;
};

const Providers = ({ children }: Props) => {
  const initialState = cookieToInitialState(
  wagmiConfig,
  headers().get("cookie"),
  ) as State;

  return (
    <WagmiProvider initialState={initialState}>
      {/* <UrqlProvider> */}
      <Web3OnboardProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </Web3OnboardProvider>
      {/* </UrqlProvider> */}
    </WagmiProvider>
  );
};

export default Providers;
