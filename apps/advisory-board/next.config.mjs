import { fileURLToPath } from "node:url";

const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
];

export default {
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  async headers() {
    return [{ source: "/:path*", headers }];
  },
};
