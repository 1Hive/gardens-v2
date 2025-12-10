import { StackClient } from "@stackso/js-core";

export const superfluidStackClient = new StackClient({
  apiKey: process.env.STACKSO_API_KEY ?? "",
  pointSystemId: +(process.env.STACKSO_POINT_SYSTEM_ID ?? 0),
});

export const STACK_DRY_RUN =
  (process.env.STACK_DRY_RUN ?? "").toLowerCase() === "true";
