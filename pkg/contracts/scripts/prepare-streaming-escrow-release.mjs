#!/usr/bin/env node
// Read-only payload generator for a deployed StreamingEscrow implementation.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createPublicClient, encodeFunctionData, getAddress, http, isAddress, parseAbi } from 'viem';

const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const legacyStrategySlot = `0x${105n.toString(16).padStart(64, '0')}`;
const currentStrategySlot = `0x${155n.toString(16).padStart(64, '0')}`;
const abi = parseAbi([
  'function owner() view returns (address)',
  'function upgradeAccess() view returns (address)',
  'function getThreshold() view returns (uint256)',
  'function proxiableUUID() view returns (bytes32)',
  'function escrowImplementation() view returns (address)',
  'function escrowsLength() view returns (uint256)',
  'function escrows(uint256) view returns (address)',
  'function strategy() view returns (address)',
  'function setEscrowImplementation(address implementation)',
  'function upgradeTo(address implementation)',
  'function reinitializeV2Migrate()',
]);
const { values } = parseArgs({ options: {
  network: { type: 'string' }, rpc: { type: 'string' }, implementation: { type: 'string' },
  executor: { type: 'string' }, safe: { type: 'string' }, out: { type: 'string' },
  help: { type: 'boolean' },
} });

if (values.help) {
  console.log('Usage: node scripts/prepare-streaming-escrow-release.mjs --network <chain> --rpc <rpc> --implementation <deployed-candidate> (--executor <PK_DEPLOYER-address> | --safe <owner-safe>) --out <file>');
  process.exit(0);
}

function assert(condition, message) { if (!condition) throw new Error(message); }
function address(value, label) {
  assert(isAddress(value), `Invalid ${label}: ${value}`);
  return getAddress(value);
}
function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }
async function codeAt(client, target, label) {
  const code = await client.getCode({ address: target });
  assert(code && code !== '0x', `${label} has no code: ${target}`);
}

async function main() {
  assert(values.network && values.rpc && values.implementation && values.out,
    'Missing network, rpc, implementation, or out');
  assert(Boolean(values.executor) !== Boolean(values.safe), 'Specify exactly one of --executor or --safe');
  const config = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../config/networks.json'), 'utf8'));
  const network = config.networks.find((entry) => entry.name === values.network);
  assert(network, `Unknown network ${values.network}`);
  const client = createPublicClient({ transport: http(values.rpc) });
  assert(await client.getChainId() === network.chainId, 'RPC chain ID differs from networks.json');
  const factory = address(network.ENVS.STREAMING_ESCROW_FACTORY, 'escrow factory');
  const proxyOwner = address(network.ENVS.PROXY_OWNER, 'ProxyOwner');
  const implementation = address(values.implementation, 'candidate implementation');
  const executor = address(values.executor ?? values.safe, 'executor');
  await codeAt(client, factory, 'Escrow factory');
  await codeAt(client, proxyOwner, 'ProxyOwner');
  await codeAt(client, implementation, 'Candidate implementation');
  assert(same(await client.readContract({ address: implementation, abi, functionName: 'proxiableUUID' }),
    implementationSlot), 'Candidate implementation is not UUPS compatible');
  if (values.executor) {
    const executorCode = await client.getCode({ address: executor });
    assert(!executorCode || executorCode === '0x', '--executor must be an EOA');
    assert(same(await client.readContract({ address: proxyOwner, abi, functionName: 'upgradeAccess' }), executor),
      'ProxyOwner upgradeAccess differs from executor');
    assert(same(await client.readContract({ address: proxyOwner, abi, functionName: 'owner' }), executor),
      'ProxyOwner effective owner differs from executor');
  } else {
    await codeAt(client, executor, 'Safe');
    assert((await client.readContract({ address: executor, abi, functionName: 'getThreshold' })) > 0n,
      'Safe threshold is zero');
  }
  assert(same(await client.readContract({ address: factory, abi, functionName: 'owner' }), executor),
    'Escrow factory effective owner differs from executor');
  const current = await client.readContract({ address: factory, abi, functionName: 'escrowImplementation' });
  await codeAt(client, current, 'Current escrow implementation');
  assert(!same(current, implementation), 'Escrow implementation is unchanged');
  const count = await client.readContract({ address: factory, abi, functionName: 'escrowsLength' });
  assert(count <= 100_000n, 'Escrow inventory exceeds safety limit');
  const escrows = [];
  const seen = new Set();
  for (let index = 0n; index < count; index++) {
    const escrow = await client.readContract({ address: factory, abi, functionName: 'escrows', args: [index] });
    assert(!seen.has(escrow.toLowerCase()), `Duplicate escrow ${escrow}`);
    seen.add(escrow.toLowerCase());
    await codeAt(client, escrow, 'Existing escrow');
    assert(same(await client.readContract({ address: escrow, abi, functionName: 'owner' }), executor),
      `Escrow ${escrow} effective owner differs from executor`);
    const slot = await client.getStorageAt({ address: escrow, slot: implementationSlot });
    assert(slot?.length === 66 && !/^0x0+$/.test(slot), `Escrow ${escrow} has no implementation slot`);
    const liveStrategy = await client.readContract({ address: escrow, abi, functionName: 'strategy' });
    assert(!same(liveStrategy, '0x0000000000000000000000000000000000000000'),
      `Escrow ${escrow} has no live strategy`);
    const [oldWord, newWord] = await Promise.all([
      client.getStorageAt({ address: escrow, slot: legacyStrategySlot }),
      client.getStorageAt({ address: escrow, slot: currentStrategySlot }),
    ]);
    const oldStrategy = getAddress(`0x${oldWord.slice(-40)}`);
    const newStrategy = getAddress(`0x${newWord.slice(-40)}`);
    const migrate = same(liveStrategy, oldStrategy) && same(newStrategy, '0x0000000000000000000000000000000000000000');
    assert(migrate || same(liveStrategy, newStrategy),
      `Escrow ${escrow} has an unrecognized storage layout`);
    escrows.push({ address: escrow, migrate });
  }
  const transaction = (to, functionName, args = [implementation]) => ({
    to, value: '0', data: encodeFunctionData({ abi, functionName, args }),
  });
  const payload = {
    version: '1.0', chainId: String(network.chainId), createdAt: Date.now(),
    meta: {
      name: `${network.name} streaming escrow release`,
      description: 'Update the escrow template, then upgrade each enumerated existing escrow and migrate legacy layouts. Recheck live inventory and ownership before execution.',
      txBuilderVersion: '1.18.0', createdFromSafeAddress: values.safe ? executor : '',
      createdFromOwnerAddress: values.executor ? executor : '', checksum: '',
    },
    transactions: [transaction(factory, 'setEscrowImplementation'),
      ...escrows.flatMap((escrow) => [transaction(escrow.address, 'upgradeTo'),
        ...(escrow.migrate ? [transaction(escrow.address, 'reinitializeV2Migrate', [])] : [])])],
  };
  const output = resolve(values.out);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Prepared ${payload.transactions.length} escrow transaction(s) for ${network.name}; ${escrows.length} existing escrows checked, ${escrows.filter((escrow) => escrow.migrate).length} legacy migrations.`);
}

main().catch((error) => {
  console.error(`Escrow release preparation failed: ${error.shortMessage || error.message}`);
  process.exitCode = 1;
});
