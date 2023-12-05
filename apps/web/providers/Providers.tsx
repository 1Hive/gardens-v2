"use client"
import React from 'react';
import WagmiProvider from './WagmiProvider';

type ProviderType = {
  children: React.ReactNode,
}

const Providers = ({children}: ProviderType) => {
  return (
    <WagmiProvider>{children}</WagmiProvider>
  )
}

export default Providers