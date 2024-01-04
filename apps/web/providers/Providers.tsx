"use client";
import React from "react";
import WagmiProvider from "./WagmiProvider";
import ThemeProvider from "./ThemeProvider";
import UrqlProvider from "./UrqlProvider";

type ProviderType = {
  children: React.ReactNode;
};

const Providers = ({ children }: ProviderType) => {
  return (
    <WagmiProvider>
      {/* <UrqlProvider> */}
      <ThemeProvider>{children}</ThemeProvider>
      {/* </UrqlProvider> */}
    </WagmiProvider>
  );
};

export default Providers;
