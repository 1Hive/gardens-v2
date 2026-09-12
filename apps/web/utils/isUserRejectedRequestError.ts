import { UserRejectedRequestError } from "viem";

type ErrorLike = {
  cause?: unknown;
  code?: unknown;
  name?: unknown;
};

export function isUserRejectedRequestError(error: unknown): boolean {
  let current = error;
  let depth = 0;

  while (current != null && depth < 8) {
    if (current instanceof UserRejectedRequestError) return true;
    if (typeof current !== "object") return false;

    const errorLike = current as ErrorLike;
    if (
      errorLike.name === "UserRejectedRequestError" ||
      errorLike.code === 4001
    ) {
      return true;
    }

    current = errorLike.cause;
    depth++;
  }

  return false;
}
