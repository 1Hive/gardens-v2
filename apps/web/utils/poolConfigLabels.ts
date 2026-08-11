import type { PointSystems, PoolTypes } from "@/types";

type PoolType = (typeof PoolTypes)[string];
type PointSystem = (typeof PointSystems)[string];

type HiddenPoolConfigLabelsArgs = {
  poolType: PoolType | undefined;
  pointSystem: PointSystem | undefined;
};

/**
 * Pool settings rows that don't apply to the given pool.
 *
 * Signaling pools distribute nothing, so the funding-oriented rows are dropped.
 * That includes `Token`: a signaling pool has no pool token, only the community
 * governance token that voting weight is denominated in, and labelling that as
 * the pool token is misleading.
 *
 * `Max voting weight` only means something when the point system caps it.
 */
export function getHiddenPoolConfigLabels({
  poolType,
  pointSystem,
}: HiddenPoolConfigLabelsArgs): string[] {
  const hidden =
    poolType === "signaling" ?
      ["Spending limit", "Min threshold", "Min conviction", "Token"]
    : [];

  if (pointSystem !== "capped") {
    hidden.push("Max voting weight");
  }

  return hidden;
}
