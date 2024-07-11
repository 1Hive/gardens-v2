import { EdgeOptions, BrowserOptions, NodeOptions } from "@sentry/nextjs";

export const SENTRY_CORE_CONFIG: EdgeOptions | BrowserOptions | NodeOptions = {
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    "https://4220ecb16c770fe0dfb4495d5e6001ed@o4507572657913856.ingest.us.sentry.io/4507572660404224",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // spotlight: process.env.NODE_ENV === "development",
};
