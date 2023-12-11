"use client"
import React from 'react';
import WagmiProvider from './WagmiProvider';
import ThemeProvider from './ThemeProvider';

type ProviderType = {
  children: React.ReactNode,
}

const Providers = ({children}: ProviderType) => {
  return (
    <WagmiProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
      </WagmiProvider>
  )
}

export default Providers