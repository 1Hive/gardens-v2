import "../styles/globals.css";
import React from "react";
import Providers from "@/providers/Providers";
import ThemeProvider from "@/providers/ThemeProvider";
import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Gardens v2',
  description: 'Gardens description...',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <ThemeProvider>
          {children}
          </ThemeProvider>
          </Providers>
      </body>
    </html>
  );
}
