/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    if (isServer) {
      config.output = config.output || {};
      config.output.chunkFilename = "chunks/[name].js";
    }
    // Silence dynamic require warnings coming from GraphQL Mesh/Yoga packages bundled via .graphclient
    const criticalRequestExpr = "Critical dependency: the request of a dependency is an expression";
    const meshModules = /@graphql-mesh|@whatwg-node\/fetch|graphql-yoga/;
    const existingIgnore = config.ignoreWarnings ?? [];
    config.ignoreWarnings = [
      ...existingIgnore,
      (warning) => {
        const msg = typeof warning?.message === "string" ? warning.message : "";
        const resource =
          (warning?.module && warning.module.resource) || "";
        return msg.includes(criticalRequestExpr) && meshModules.test(resource);
      },
    ];
    return config;
  },
  images: {
    domains: [
      "metadata.ens.domains", // Official ENS metadata service (best choice)
      "ipfs.io", // Public IPFS gateway
      "arweave.net", // Arweave storage (some ENS avatars are hosted here)
      "nftstorage.link", // NFT.Storage, used for IPFS images
      "gateway.pinata.cloud", // Pinata IPFS Gateway (often used for ENS avatars)
      "cloudflare-ipfs.com", // Cloudflare's IPFS gateway (faster alternative)
      "euc.li", // ENS avatar gateway
      "api2.clovers.network", // Clovers ENS avatar service
      "avatars.dicebear.com", // Dicebear avatars
      "lh3.googleusercontent.com", // Google-hosted avatars (e.g., from Google accounts)
      "pbs.twimg.com", // Twitter-hosted avatars
      "avatars.githubusercontent.com", // GitHub-hosted avatars
      "cdn.stamp.fyi", // Stamp avatars
      "www.gravatar.com", // Gravatar-hosted avatars
      "avatars.twitch.tv", // Twitch-hosted avatars
      "cdn.discordapp.com", // Discord-hosted avatars
      "media-exp1.licdn.com", // LinkedIn-hosted avatars
      "s.gravatar.com", // Secure Gravatar
      "cloudflare-ipfs.com", // Cloudflare IPFS gateway
      "openseauserdata.com", // OpenSea user avatars
      "ccip.ens.xyz", // ENS CCIP gateway
      "dweb.link", // Another IPFS gateway
      "infura-ipfs.io", // Infura IPFS gateway
      "images.mirror-media.xyz", // Mirror avatars
      "zerion-dna.s3.us-east-1.amazonaws.com", // Zerion ENS avatars
      "api2.clovers.network", // Clovers ENS avatar service
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.eth.link", // ENS domains with avatars stored on IPFS
      },
      {
        protocol: "https",
        hostname: "**.limo", // LIMO ENS gateway for decentralized websites
      },
      {
        // Fallback so avatars from unexpected hosts don't hard-error
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["ably"],
  },
  productionBrowserSourceMaps: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "gardens",
  project: "gardens-app",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: false,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
