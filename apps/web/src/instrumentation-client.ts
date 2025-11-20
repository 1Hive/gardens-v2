import * as Sentry from "@sentry/nextjs";
import { SENTRY_CORE_CONFIG } from "../sentry.conf";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

export function register() {
  if (process.env.NEXT_RUNTIME !== "browser") return;

  Sentry.init({
    ...SENTRY_CORE_CONFIG,

    replaysOnErrorSampleRate: +(
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "1"
    ),

    replaysSessionSampleRate: +(
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0.1"
    ),

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.extraErrorDataIntegration({
        depth: 3,
        captureErrorCause: true,
      }),
    ],
  });
}
