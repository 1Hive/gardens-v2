import _ from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { generateMetadata as gardenPageMetadatataGenerator } from "./(app)/gardens/page";
import { logOnce } from "@/utils/log";

export function generateMetadata(): Metadata {
  return gardenPageMetadatataGenerator();
}

export default function Page() {
  logOnce("debug", "Loading page: app/page.tsx");
  redirect("/gardens");
}

