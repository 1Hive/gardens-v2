import React from "react";
import type { Metadata } from "next";
import { CommunityForm } from "@/components/Forms";

const TITLE = "Create your community";
const DESCRIPTION =
  "Launch a new Gardens community and invite members to collaborate, govern, and fund shared ideas.";
const OG_IMAGE_PATH = "/gardens/opengraph-image-1sk5tc";

export const metadata: Metadata = {
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

export default function Page() {
  return (
    <div className="page-layout mx-auto">
      <section className="section-layout">
        <div className="text-center sm:mt-5 mb-12">
          <h2 className="mb-2">Create your community on Gardens</h2>
        </div>
        <CommunityForm />
      </section>
    </div>
  );
}
