import { EdgeOptions, BrowserOptions, NodeOptions } from "@sentry/nextjs";

export const SENTRY_CORE_CONFIG: EdgeOptions | BrowserOptions | NodeOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // spotlight: process.env.NODE_ENV === "development",
};
