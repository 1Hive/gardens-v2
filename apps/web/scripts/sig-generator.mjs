import { keccak256, stringToBytes } from "viem";

const errorLines = [
  "error CannotEditRequestedAmountWithActiveSupport(uint256 proposalId, uint256 currentAmount, uint256 newAmount);",
];

function selector(sig) {
  const hash = keccak256(stringToBytes(sig));
  return hash.slice(0, 10); // first 4 bytes
}

const normalizeSignature = (signature) => {
  const match = signature.match(/^([^(]+)\((.*)\)$/);
  if (!match) return signature;

  const name = match[1].trim();
  const params = match[2]
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean)
    .map((param) => param.split(/\s+/)[0])
    .join(",");

  return `${name}(${params})`;
};

const signatures = errorLines
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) =>
    line
      .replace(/^"|"$/g, "")
      .replace(/^error\s+/i, "")
      .replace(/;$/, "")
      .trim(),
  )
  .map(normalizeSignature);

signatures.forEach((signature) => {
  console.log(`${signature} -> ${selector(signature)}`);
});
