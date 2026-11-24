#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAddress, keccak256 } from 'viem';

const contractsRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const configPath = join(contractsRoot, 'config/networks.json');
const candidateKeys = {
  ConvictionsUtils: 'CV_UTIL_LIB',
  CVStrategy: 'CV_STRATEGY',
  RegistryCommunity: 'REGISTRY_COMMUNITY',
  RegistryFactory: 'REGISTRY_FACTORY',
  StreamingEscrow: 'STREAMING_ESCROW',
  CVAdminFacet: 'CV_ADMIN',
  CVAllocationFacet: 'CV_ALLOCATION',
  CVDisputeFacet: 'CV_DISPUTE',
  CVPauseFacet: 'CV_PAUSE',
  CVPowerFacet: 'CV_POWER',
  CVProposalFacet: 'CV_PROPOSAL',
  CVStreamingFacet: 'CV_STREAMING',
  CVSyncPowerFacet: 'CV_SYNC_POWER',
  CommunityAdminFacet: 'COMMUNITY_ADMIN',
  CommunityPowerFacet: 'COMMUNITY_POWER',
};
const convictionsConsumers = new Set([
  'CVStrategy', 'CVAllocationFacet', 'CVPowerFacet', 'CVProposalFacet', 'CVStreamingFacet',
]);
const powerConsumers = new Set(['CVPowerFacet']);

function argsFrom(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value || value.startsWith('--')) {
      throw new Error(`Expected --key value, got ${key ?? 'end of arguments'}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

async function rpc(url, method, params = []) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${method}: RPC returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`${method}: ${payload.error.message}`);
  return payload.result;
}

function spliceAddress(bytecode, start, length, address) {
  if (length !== 20) throw new Error(`Unexpected library link length ${length}`);
  const at = 2 + start * 2;
  return bytecode.slice(0, at) + address.slice(2).toLowerCase() + bytecode.slice(at + length * 2);
}

function embeddedAddress(bytecode, start, length) {
  if (length !== 20) throw new Error(`Unexpected library link length ${length}`);
  return getAddress(`0x${bytecode.slice(2 + start * 2, 2 + (start + length) * 2)}`);
}

function expectedRuntime(artifact, actual, contract, address, library, powerLibrary) {
  let expected = artifact.deployedBytecode?.object?.toLowerCase();
  if (!expected?.startsWith('0x')) throw new Error('Artifact has no deployed bytecode');
  const linkReferences = artifact.deployedBytecode.linkReferences ?? {};
  if (convictionsConsumers.has(contract) && !library) {
    throw new Error(`${contract} requires --library`);
  }
  if (powerConsumers.has(contract) && !powerLibrary) {
    throw new Error(`${contract} requires --power-library`);
  }
  let linkCount = 0;
  for (const libraries of Object.values(linkReferences)) {
    for (const [name, references] of Object.entries(libraries)) {
      const addressForLink = name === 'ConvictionsUtils' ? library
        : name === 'PowerManagementUtils' ? powerLibrary : undefined;
      if (!addressForLink) throw new Error(`Missing supported address for linked ${name}`);
      for (const reference of references) {
        const linked = embeddedAddress(actual, reference.start, reference.length);
        if (linked !== addressForLink) throw new Error(`${contract} links ${linked}, expected ${addressForLink}`);
        expected = spliceAddress(expected, reference.start, reference.length, addressForLink);
        linkCount++;
      }
    }
  }
  if (contract === 'ConvictionsUtils') {
    // Non-IR builds embed a self-address guard; the IR build used for this
    // release may omit it. Compare the exact artifact in either case.
    if (expected.startsWith(`0x73${'0'.repeat(40)}`)) {
      if (!actual.startsWith(`0x73${address.slice(2).toLowerCase()}`)) {
        throw new Error('Deployed Solidity library has the wrong self address');
      }
      expected = spliceAddress(expected, 1, 20, address);
    }
  }
  for (const referencesForImmutable of Object.values(artifact.deployedBytecode.immutableReferences ?? {})) {
    for (const reference of referencesForImmutable) {
      const at = 2 + reference.start * 2;
      expected = expected.slice(0, at)
        + actual.slice(at, at + reference.length * 2)
        + expected.slice(at + reference.length * 2);
    }
  }
  if (expected !== actual) {
    throw new Error(`${contract} runtime differs from the compiled artifact`);
  }
  if (convictionsConsumers.has(contract) && linkCount === 0) {
    // Forge removes linkReferences from artifacts compiled with --libraries.
    // The exact runtime comparison above then proves the prelinked artifact,
    // while this check proves it embeds the requested chain-local library.
    const embedded = library.slice(2).toLowerCase();
    if (!actual.includes(embedded)) throw new Error(`${contract} does not embed --library`);
    linkCount += actual.split(embedded).length - 1;
  }
  if (powerConsumers.has(contract) && !actual.includes(powerLibrary.slice(2).toLowerCase())) {
    throw new Error(`${contract} does not embed --power-library`);
  }
  return linkCount;
}

async function main() {
  const args = argsFrom(process.argv.slice(2));
  for (const key of ['network', 'rpc', 'contract', 'address', 'tx']) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }
  if (!(args.contract in candidateKeys)) throw new Error(`Unsupported contract ${args.contract}`);
  if (args.record && args.record !== 'true') throw new Error('--record must be true when supplied');
  const address = getAddress(args.address);
  const library = args.library ? getAddress(args.library) : undefined;
  const powerLibrary = args['power-library'] ? getAddress(args['power-library']) : undefined;
  const txHash = args.tx.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(txHash)) throw new Error('Invalid deployment transaction hash');
  const selectedConfigPath = args.config ?? configPath;
  const config = JSON.parse(await readFile(selectedConfigPath, 'utf8'));
  const network = config.networks.find((item) => item.name === args.network);
  if (!network) throw new Error(`Unknown network ${args.network}`);
  const actualChainId = Number(await rpc(args.rpc, 'eth_chainId'));
  if (actualChainId !== network.chainId) throw new Error(`RPC chain ID ${actualChainId} differs from ${network.chainId}`);
  const receipt = await rpc(args.rpc, 'eth_getTransactionReceipt', [txHash]);
  if (!receipt || Number(receipt.status) !== 1) throw new Error('Deployment receipt is absent or unsuccessful');
  if (!receipt.contractAddress || getAddress(receipt.contractAddress) !== address) {
    throw new Error('Receipt contract address differs from candidate');
  }
  const runtime = (await rpc(args.rpc, 'eth_getCode', [address, 'latest']))?.toLowerCase();
  if (!runtime || runtime === '0x') throw new Error('Candidate has no code');
  for (const linked of [library, powerLibrary].filter(Boolean)) {
    const libraryRuntime = await rpc(args.rpc, 'eth_getCode', [linked, 'latest']);
    if (!libraryRuntime || libraryRuntime === '0x') throw new Error(`Linked library ${linked} has no code`);
  }
  const artifact = JSON.parse(await readFile(
    join(contractsRoot, 'out', `${args.contract}.sol`, `${args.contract}.json`), 'utf8',
  ));
  const linkCount = expectedRuntime(artifact, runtime, args.contract, address, library, powerLibrary);
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const verified = {
    network: network.name,
    chainId: network.chainId,
    contract: args.contract,
    address,
    transactionHash: txHash,
    blockNumber: Number(receipt.blockNumber),
    runtimeHash: keccak256(runtime),
    linkedLibrary: convictionsConsumers.has(args.contract) ? library : null,
    linkedPowerLibrary: powerConsumers.has(args.contract) ? powerLibrary : null,
    linkCount,
    sourceCommit,
  };
  if (args.record) {
    network.CANDIDATES ??= {};
    const key = candidateKeys[args.contract];
    if (network.CANDIDATES[key] && getAddress(network.CANDIDATES[key]) !== address) {
      throw new Error(`CANDIDATES.${key} already contains a different address`);
    }
    network.CANDIDATES[key] = address;
    const manifestDir = args['manifest-dir'] ?? join(contractsRoot, 'transaction-builder/remediation-candidates');
    const manifestPath = join(manifestDir, `${network.name}.json`);
    await mkdir(manifestDir, { recursive: true });
    let manifest = { network: network.name, chainId: network.chainId, candidates: {} };
    try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    manifest.candidates[key] = verified;
    const configTemp = `${selectedConfigPath}.candidate.tmp`;
    const manifestTemp = `${manifestPath}.tmp`;
    await writeFile(configTemp, `${JSON.stringify(config, null, 2)}\n`);
    await writeFile(manifestTemp, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(configTemp, selectedConfigPath);
    await rename(manifestTemp, manifestPath);
  }
  console.log(JSON.stringify(verified));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
