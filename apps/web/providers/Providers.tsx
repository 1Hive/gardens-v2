import React from "react";
import { headers } from 'next/headers'
import { Web3Modal, wagmiConfig } from './WagmiProvider'
import { cookieToInitialState } from 'wagmi'
import ThemeProvider from "./ThemeProvider";
import UrqlProvider from "./UrqlProvider";
import Web3OnboardProvider from "./web3OnBoardProvider";

type ProviderType = {
  children: React.ReactNode;
};

const Providers = ({ children }: ProviderType) => {
  const initialState = cookieToInitialState(wagmiConfig, headers().get('cookie'))
  return (
    <Web3Modal initialState={initialState}>
      {/* <UrqlProvider> */}
      <Web3OnboardProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </Web3OnboardProvider>
      {/* </UrqlProvider> */}
    </Web3Modal>
  );
};

export default Providers;
