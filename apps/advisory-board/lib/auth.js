import GitHubProvider from "next-auth/providers/github";
import { getToken } from "next-auth/jwt";
import { hasPrivateAdvisoryAccess } from "./authorization.mjs";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 4 * 60 * 60 },
  providers: [GitHubProvider({
    clientId: process.env.GITHUB_APP_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || "",
    authorization: { params: { scope: "" } },
  })],
  callbacks: {
    async signIn({ account }) {
      if (!account?.access_token) return false;
      try {
        return await hasPrivateAdvisoryAccess(account.access_token);
      } catch {
        return false;
      }
    },
    async jwt({ token, account }) {
      if (account?.provider === "github") {
        token.githubAccessToken = account.access_token;
        token.githubExpiresAt = account.expires_at || null;
      }
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
};

export async function authorizedToken(request) {
  const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!session?.githubAccessToken ||
      (session.githubExpiresAt && Date.now() >= session.githubExpiresAt * 1000 - 30_000)) {
    return null;
  }
  return session.githubAccessToken;
}
