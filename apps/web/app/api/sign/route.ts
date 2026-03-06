import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

const privateKey = process.env.CG_PLUGIN_PRIVATE_KEY;
const publicKey = process.env.NEXT_PUBLIC_CG_PLUGIN_PUBLIC_KEY;

export async function POST(request: Request) {
  if (!privateKey || !publicKey) {
    return Response.json(
      { error: "CG plugin keys not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const pluginLib = await CgPluginLibHost.initialize(privateKey, publicKey);
  const signedRequest = await pluginLib.signRequest(body);
  return Response.json(signedRequest);
}
