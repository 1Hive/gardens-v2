import "@/styles/globals.scss";
import React from "react";
import { Chakra_Petch, Inter } from "next/font/google";
import { Bounce, ToastContainer } from "react-toastify";
import Providers from "@/providers/Providers";
import "react-toastify/dist/ReactToastify.css";
import "@mdxeditor/editor/style.css";

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

export const metadata = {
  title: "Community Page",
  description: "Preview info for sharing links to this page.",
  openGraph: {
    title: "Community Page",
    description: "Your custom OG description here.",
    url: "https://yourdomain.com/...", // dynamic if possible
    images: [
      {
        url: "https://yourdomain.com/preview.jpg",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

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
