import type { Metadata } from "next";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, description } from "./opengraph-image";

const titlePrefix = "Gardens - ";
const ogImagePath = "/gardens/campaigns/opengraph-image";

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
