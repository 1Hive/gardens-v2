export function getMemberActivationState({
  memberPower,
  subgraphActivatedPoints = 0n,
}: {
  memberPower?: bigint | null;
  subgraphActivatedPoints?: bigint | null;
}) {
  const hasResolvedMemberPower = memberPower != null;
  const memberActivatedPoints =
    hasResolvedMemberPower ? memberPower : (subgraphActivatedPoints ?? 0n);

  return {
    hasResolvedMemberPower,
    memberActivatedPoints,
    memberActivatedStrategy: memberActivatedPoints > 0n,
  };
}
