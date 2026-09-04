export type CitizenSubmittedAction =
  | "approval-submitted"
  | "registration-submitted";

type ConfirmationOptions = {
  action: CitizenSubmittedAction;
  registrationCost: bigint;
  readAllowance: () => Promise<bigint>;
  readIsMember: () => Promise<boolean>;
  attempts?: number;
  intervalMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
};

const DEFAULT_ATTEMPTS = 45;
const DEFAULT_INTERVAL_MS = 2_000;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function getCitizenSubmittedAction(
  value: string | string[] | undefined,
): CitizenSubmittedAction | undefined {
  const action = Array.isArray(value) ? value[0] : value;
  return (
      action === "approval-submitted" || action === "registration-submitted"
    ) ?
      action
    : undefined;
}

export async function waitForCitizenActionConfirmation({
  action,
  registrationCost,
  readAllowance,
  readIsMember,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  wait = delay,
}: ConfirmationOptions) {
  let lastReadError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const confirmed =
        action === "approval-submitted" ?
          (await readAllowance()) >= registrationCost
        : await readIsMember();

      if (confirmed) return;
    } catch (error) {
      lastReadError = error;
    }
    if (attempt < attempts) await wait(intervalMs);
  }

  const actionName =
    action === "approval-submitted" ? "approval" : "registration";
  throw new Error(
    `Citizen Wallet ${actionName} was submitted, but its on-chain state was not confirmed.`,
    { cause: lastReadError },
  );
}
