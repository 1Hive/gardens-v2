import { stringifyJson } from "./json";

type LogLevel = "debug" | "info" | "warn" | "error";
const logs = new Set<string>();
export function logOnce(
  level: LogLevel = "debug",
  ...message: Parameters<typeof console.debug>
) {
  let serializedMessage;
  try {
    serializedMessage = stringifyJson(message);
  } catch (error) {
    serializedMessage = message.toString();
  }
  if (!logs.has(serializedMessage)) {
    // eslint-disable-next-line no-console
    console[level](...message);
    logs.add(serializedMessage);
  }
}
