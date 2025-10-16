import _ from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { generateMetadata as gardenPageMetadatataGenerator } from "./(app)/gardens/page";

export function generateMetadata(): Metadata {
  return gardenPageMetadatataGenerator();
}

export default function Page() {
  redirect("/gardens");
}
