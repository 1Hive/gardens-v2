import "@/styles/globals.css";
import React from "react";
import { Press_Start_2P, Chakra_Petch, Inter } from "next/font/google";
import Providers from "@/providers/Providers";
import { Metadata } from "next";
import { Bounce, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${inter.variable} ${chakra.variable} bg-white`}
    >
      <body className="min-h-screen bg-white font-chakra">
        <Providers>{children}</Providers>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
      </body>
    </html>
  );
}
