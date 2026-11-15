#!/usr/bin/env node
// Read-only Safe payload generator for releases after the shared-router migration.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createPublicClient, encodeFunctionData, getAddress, http, isAddress, parseAbi } from 'viem';

const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function owner() view returns (address)',
  'function routingFactory() view returns (address)',
  'function routesStrategies() view returns (bool)',
  'function proxiableUUID() view returns (bytes32)',
  'function registryCommunity() view returns (address)',
  'function registryFactory() view returns (address)',
  'function strategyTemplate() view returns (address)',
  'function registryCommunityTemplate() view returns (address)',
  'function strategyImplementation() view returns (address)',
  'function communityImplementation() view returns (address)',
  'function getStrategyFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function getCommunityFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function setStrategyRelease((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address implementation)',
  'function setCommunityRelease((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address implementation)',
]);

const { values } = parseArgs({ options: {
  network: { type: 'string' }, rpc: { type: 'string' }, family: { type: 'string' },
  implementation: { type: 'string' }, facet: { type: 'string', multiple: true },
  out: { type: 'string' }, 'expected-owner': { type: 'string' },
  'storage-reviewed': { type: 'boolean' }, help: { type: 'boolean' },
} });

if (values.help) {
  process.stdout.write('Usage: node scripts/prepare-shared-release.mjs --network <name> --rpc <url> --family strategy|community --expected-owner <owner> --out <file> [--implementation <new-core> --storage-reviewed] [--facet <old-address>:<new-address> ...]\n');
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
async function proxyImplementation(client, proxy) {
  const word = await client.getStorageAt({ address: proxy, slot: implementationSlot });
  assert(word?.length === 66, `Cannot read implementation slot: ${proxy}`);
  return getAddress(`0x${word.slice(-40)}`);
}

async function main() {
  assert(values.network && values.rpc && values.family && values.out && values['expected-owner'],
    'Missing required network, rpc, family, out or expected-owner');
  assert(['strategy', 'community'].includes(values.family), 'Family must be strategy or community');
  const replacements = new Map();
  for (const entry of values.facet ?? []) {
    const pair = entry.split(':');
    assert(pair.length === 2, `Facet replacement must be old:new: ${entry}`);
    const oldAddress = address(pair[0], 'old facet');
    const newAddress = address(pair[1], 'new facet');
    assert(!same(oldAddress, newAddress), `Facet is unchanged: ${oldAddress}`);
    assert(!replacements.has(oldAddress.toLowerCase()), `Duplicate facet replacement: ${oldAddress}`);
    replacements.set(oldAddress.toLowerCase(), newAddress);
  }
  assert(values.implementation || replacements.size, 'Specify a new implementation and/or facet replacement');
  assert(!values.implementation || values['storage-reviewed'],
    'A core change requires --storage-reviewed after deployed-old/new layout review and migration planning');

  const config = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../config/networks.json'), 'utf8'));
  const network = config.networks.find((entry) => entry.name === values.network);
  assert(network, `Unknown network ${values.network}`);
  const client = createPublicClient({ transport: http(values.rpc) });
  assert(await client.getChainId() === network.chainId, 'RPC chain ID does not match networks.json');
  const factory = address(network.PROXIES.REGISTRY_FACTORY, 'factory');
  const expectedOwner = address(values['expected-owner'], 'expected owner');
  await codeAt(client, factory, 'Factory');
  const strategy = values.family === 'strategy';
  const templateName = strategy ? 'strategyTemplate' : 'registryCommunityTemplate';
  const implementationName = strategy ? 'strategyImplementation' : 'communityImplementation';
  const facetsName = strategy ? 'getStrategyFacets' : 'getCommunityFacets';
  const releaseName = strategy ? 'setStrategyRelease' : 'setCommunityRelease';
  const proxies = strategy ? network.PROXIES.CV_STRATEGIES : network.PROXIES.REGISTRY_COMMUNITIES;
  assert(Array.isArray(proxies), 'Missing proxy inventory in networks.json');
  assert(same(await client.readContract({ address: factory, abi, functionName: 'owner' }), expectedOwner),
    'Factory effective owner differs from --expected-owner');
  const router = await client.readContract({ address: factory, abi, functionName: templateName });
  await codeAt(client, router, 'Router template');
  assert(same(await client.readContract({ address: router, abi, functionName: 'routingFactory' }), factory),
    'Template is not wired to this factory');
  assert(await client.readContract({ address: router, abi, functionName: 'routesStrategies' }) === strategy,
    'Template routes the wrong family');
  assert(same(await client.readContract({ address: router, abi, functionName: 'proxiableUUID' }), implementationSlot),
    'Template is not UUPS compatible');
  const unique = new Set();
  for (const rawProxy of proxies) {
    const proxy = address(rawProxy, 'proxy');
    assert(!unique.has(proxy), `Duplicate proxy: ${proxy}`);
    unique.add(proxy);
    await codeAt(client, proxy, 'Proxy');
    assert(same(await proxyImplementation(client, proxy), router),
      `Proxy ${proxy} is not routed through the current factory template`);
  }

  const currentImplementation = await client.readContract({ address: factory, abi, functionName: implementationName });
  await codeAt(client, currentImplementation, 'Current implementation');
  const nextImplementation = values.implementation
    ? address(values.implementation, 'implementation') : currentImplementation;
  await codeAt(client, nextImplementation, 'Next implementation');
  if (values.implementation) {
    assert(!same(currentImplementation, nextImplementation), 'Implementation is unchanged');
    assert(same(await client.readContract({ address: nextImplementation, abi, functionName: 'proxiableUUID' }), implementationSlot),
      'Next implementation is not UUPS compatible');
    await client.readContract({ address: nextImplementation, abi,
      functionName: strategy ? 'registryCommunity' : 'registryFactory' });
  }

  const [currentCuts] = await client.readContract({ address: factory, abi, functionName: facetsName });
  assert(currentCuts.length > 0, 'Factory facet set is empty');
  const used = new Set();
  const cuts = currentCuts.map((cut) => {
    const oldFacet = cut.facetAddress.toLowerCase();
    const replacement = replacements.get(oldFacet);
    if (replacement) used.add(oldFacet);
    return { facetAddress: replacement ?? cut.facetAddress, action: cut.action, functionSelectors: cut.functionSelectors };
  });
  for (const [oldFacet, newFacet] of replacements) {
    assert(used.has(oldFacet), `Old facet is absent from the current release: ${oldFacet}`);
    await codeAt(client, newFacet, 'New facet');
  }
  const payload = {
    version: '1.0', chainId: String(network.chainId), createdAt: Date.now(),
    meta: { name: `${network.name} ${values.family} shared release`,
      description: 'Full selector set. Review storage compatibility, linked libraries, and simulate before Safe submission.',
      txBuilderVersion: '1.18.0', createdFromSafeAddress: '', createdFromOwnerAddress: '', checksum: '' },
    transactions: [{ to: factory, value: '0', data: encodeFunctionData({ abi, functionName: releaseName,
      args: [cuts, nextImplementation] }) }],
  };
  const output = resolve(values.out);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(`Prepared one ${values.family} release transaction in ${output}; checked ${proxies.length} configured proxies. Reconcile inventory with live creation events.\n`);
}

main().catch((error) => {
  process.stderr.write(`Shared release preparation failed: ${error.shortMessage || error.message}\n`);
  process.exitCode = 1;
});
