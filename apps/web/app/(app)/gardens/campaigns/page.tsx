import type { Metadata } from "next";
import ClientPage from "./client-page";
import { PlantBanner } from "@/assets";

export const description =
  "Discover and join campaigns across the Gardens ecosystem.";
export const FALLBACK_TITLE = "Gardens Campaigns";
const titlePrefix = "Gardens - ";
const ogImagePath =
  typeof PlantBanner === "string" ? PlantBanner : PlantBanner.src;

export const metadata: Metadata = {
  title: titlePrefix + FALLBACK_TITLE,
  description,
  openGraph: {
    title: titlePrefix + FALLBACK_TITLE,
    description,
    images: [{ url: ogImagePath }],
  },
  twitter: {
    card: "summary_large_image",
    title: titlePrefix + FALLBACK_TITLE,
    description,
    images: [ogImagePath],
  },
};

export default function Page() {
  return <ClientPage />;
}
