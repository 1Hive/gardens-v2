/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
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
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
