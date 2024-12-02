/**
 * JSON.stirngify with bigint support
 * @param json
 * @returns string
 */
export function stringifyJson(payload: unknown): string {
  return JSON.stringify(payload, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}
