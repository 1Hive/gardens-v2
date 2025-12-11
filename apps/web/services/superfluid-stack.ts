import { StackClient } from "@stackso/js-core";

let cachedStackClient: StackClient | null = null;

export const getSuperfluidStackClient = (): StackClient => {
  if (cachedStackClient) return cachedStackClient;
  const apiKey = process.env.STACKSO_API_KEY;
  const pointSystemId = +(process.env.STACKSO_POINT_SYSTEM_ID ?? 0);
  if (!apiKey) {
    throw new Error("STACKSO_API_KEY is required");
  }
  if (!pointSystemId) {
    throw new Error("STACKSO_POINT_SYSTEM_ID is required");
  }
  cachedStackClient = new StackClient({
    apiKey,
    pointSystemId,
  });
  return cachedStackClient;
};

export const STACK_DRY_RUN =
  (process.env.STACK_DRY_RUN ?? "").toLowerCase() === "true";
