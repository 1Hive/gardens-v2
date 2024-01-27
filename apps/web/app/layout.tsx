import "@/styles/globals.css";
import React from "react";
import { Press_Start_2P, Chakra_Petch } from "next/font/google";
import Providers from "@/providers/Providers";
import { Metadata } from "next";

const press = Press_Start_2P({
  variable: "--font-press",
  subsets: ["latin"],
  weight: ["400"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// const metadata: Metadata = {
//   title: "Gardens v2",
//   description: "Gardens description...",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${press.variable} ${chakra.variable} font-sans`}
    >
      <body className="min-h-screen bg-white font-chakra">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
