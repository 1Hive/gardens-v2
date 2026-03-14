import { buildFormOgImage } from "../../../../../og-form-image";

export const runtime = "edge";

export async function GET() {
  return buildFormOgImage({
    title: "Create a proposal",
    description:
      "Draft a proposal to align supporters and move collective action forward.",
  });
}
