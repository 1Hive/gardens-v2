import Image from "../opengraph-image";

export const runtime = "edge";

export async function GET() {
  return Image();
}
