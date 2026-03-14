import { buildFormOgImage } from "../../../../og-form-image";

export const runtime = "edge";

export async function GET() {
  return buildFormOgImage({
    title: "Create a pool",
    description:
      "Set up a dedicated pool for funding and signaling in your community.",
  });
}
