import "@/styles/globals.scss";
import React from "react";
import { Chakra_Petch, Inter } from "next/font/google";
import { Bounce, ToastContainer } from "react-toastify";
import Providers from "@/providers/Providers";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${inter.variable} ${chakra.variable} bg-primary`}
    >
      <body className="min-h-screen bg-primary font-chakra">
        <div id="modal-root" />

        <Providers>
          <>{children}</>
        </Providers>

        <ToastContainer
          style={{ zIndex: 1000 }}
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
