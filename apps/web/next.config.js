/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ipfs.io",
        port: "",
        pathname: "/",
      },
      {
        protocol: "https",
        hostname: "effigy.im",
        port: "",
        pathname: "/a/**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["ably"],
  },
};
