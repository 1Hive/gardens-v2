import { buildFormOgImage } from "../../og-form-image";

export const runtime = "edge";

export async function GET() {
  return buildFormOgImage({
    title: "Create your community",
    description:
      "Launch a new Gardens community and invite members to collaborate.",
  });
}
