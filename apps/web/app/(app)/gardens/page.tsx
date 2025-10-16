import type { Metadata } from "next";
import ClientPage from "./ClientPage";

const TITLE = "Gardens";
const DESCRIPTION = "Create, govern, and fund communities together.";
const OG_IMAGE_PATH = "/gardens/opengraph-image-1sk5tc";

export function generateMetadata(): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: OG_IMAGE_PATH }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [OG_IMAGE_PATH],
    },
  };
}

export default function Page() {
  return <ClientPage />;
}
