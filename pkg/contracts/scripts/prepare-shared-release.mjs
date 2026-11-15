#!/usr/bin/env node
// Read-only Safe payload generator for releases after the shared-router migration.
import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
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
  'function setStrategyTemplate(address template)',
  'function setRegistryCommunityTemplate(address template)',
  'function upgradeTo(address newImplementation)',
  'function runImplementationMigration(bytes data)',
  'function getThreshold() view returns (uint256)',
]);

const { values } = parseArgs({ options: {
  network: { type: 'string' }, rpc: { type: 'string' }, family: { type: 'string' },
  implementation: { type: 'string' }, facet: { type: 'string', multiple: true },
  migration: { type: 'string', multiple: true },
  router: { type: 'string' }, 'batch-size': { type: 'string', default: '10' },
  out: { type: 'string' }, safe: { type: 'string' }, 'expected-owner': { type: 'string' },
  'storage-reviewed': { type: 'boolean' }, help: { type: 'boolean' },
} });

if (values.help) {
  process.stdout.write('Usage: node scripts/prepare-shared-release.mjs --network <name> --rpc <url> --family strategy|community --safe <effective-owner-safe> --out <file-or-directory> [--implementation <new-core> --storage-reviewed] [--facet <old-address>:<new-address> ...] [--migration <proxy>:<initializer-calldata> ...] [--router <new-router> --batch-size 10]\n');
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
  assert(values.network && values.rpc && values.family && values.out && values.safe,
    'Missing required network, rpc, family, out or safe');
  assert(['strategy', 'community'].includes(values.family), 'Family must be strategy or community');
  const batchSize = Number(values['batch-size']);
  assert(Number.isSafeInteger(batchSize) && batchSize > 0 && batchSize <= 30, 'Batch size must be 1..30');
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
  assert(values.implementation || replacements.size || values.router || values.migration?.length,
    'Specify a new implementation, facet replacement, migration, and/or router');
  assert((!values.implementation && !values.router && !values.migration?.length) || values['storage-reviewed'],
    'A core, router, or state migration requires --storage-reviewed after layout review and migration planning');

  const config = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../config/networks.json'), 'utf8'));
  const network = config.networks.find((entry) => entry.name === values.network);
  assert(network, `Unknown network ${values.network}`);
  const client = createPublicClient({ transport: http(values.rpc) });
  assert(await client.getChainId() === network.chainId, 'RPC chain ID does not match networks.json');
  const factory = address(network.PROXIES.REGISTRY_FACTORY, 'factory');
  const safe = address(values.safe, 'Safe');
  if (values['expected-owner']) {
    assert(same(address(values['expected-owner'], 'expected owner'), safe),
      'Safe must be the factory effective owner to execute this payload');
  }
  await codeAt(client, safe, 'Safe');
  assert((await client.readContract({ address: safe, abi, functionName: 'getThreshold' })) > 0n,
    'Safe threshold is zero');
  await codeAt(client, factory, 'Factory');
  const strategy = values.family === 'strategy';
  const templateName = strategy ? 'strategyTemplate' : 'registryCommunityTemplate';
  const implementationName = strategy ? 'strategyImplementation' : 'communityImplementation';
  const facetsName = strategy ? 'getStrategyFacets' : 'getCommunityFacets';
  const releaseName = strategy ? 'setStrategyRelease' : 'setCommunityRelease';
  const proxies = strategy ? network.PROXIES.CV_STRATEGIES : network.PROXIES.REGISTRY_COMMUNITIES;
  assert(Array.isArray(proxies), 'Missing proxy inventory in networks.json');
  assert(same(await client.readContract({ address: factory, abi, functionName: 'owner' }), safe),
    'Factory effective owner differs from --safe');
  const router = await client.readContract({ address: factory, abi, functionName: templateName });
  await codeAt(client, router, 'Router template');
  assert(same(await client.readContract({ address: router, abi, functionName: 'routingFactory' }), factory),
    'Template is not wired to this factory');
  assert(await client.readContract({ address: router, abi, functionName: 'routesStrategies' }) === strategy,
    'Template routes the wrong family');
  assert(same(await client.readContract({ address: router, abi, functionName: 'proxiableUUID' }), implementationSlot),
    'Template is not UUPS compatible');
  const unique = new Set();
  const migrations = new Map();
  for (const entry of values.migration ?? []) {
    const split = entry.indexOf(':');
    assert(split > 0, `Migration must be proxy:calldata: ${entry}`);
    const proxy = address(entry.slice(0, split), 'migration proxy');
    const data = entry.slice(split + 1);
    assert(/^0x(?:[0-9a-fA-F]{2})+$/.test(data) && data.length >= 10,
      `Invalid migration calldata for ${proxy}`);
    assert(!migrations.has(proxy.toLowerCase()), `Duplicate migration proxy: ${proxy}`);
    migrations.set(proxy.toLowerCase(), { proxy, data });
  }
  for (const rawProxy of proxies) {
    const proxy = address(rawProxy, 'proxy');
    assert(!unique.has(proxy.toLowerCase()), `Duplicate proxy: ${proxy}`);
    unique.add(proxy.toLowerCase());
    await codeAt(client, proxy, 'Proxy');
    assert(same(await proxyImplementation(client, proxy), router),
      `Proxy ${proxy} is not routed through the current factory template`);
    if (values.router || migrations.has(proxy.toLowerCase())) {
      assert(same(await client.readContract({ address: proxy, abi, functionName: 'owner' }), safe),
        `Proxy ${proxy} effective owner differs from --safe`);
    }
  }
  for (const proxy of migrations.keys()) {
    assert(unique.has(proxy), `Migration proxy is absent from configured inventory: ${proxy}`);
  }

  const nextRouter = values.router ? address(values.router, 'new router') : router;
  if (values.router) {
    assert(!same(router, nextRouter), 'Router is unchanged');
    await codeAt(client, nextRouter, 'New router');
    assert(same(await client.readContract({ address: nextRouter, abi, functionName: 'routingFactory' }), factory),
      'New router points to another factory');
    assert(await client.readContract({ address: nextRouter, abi, functionName: 'routesStrategies' }) === strategy,
      'New router routes the wrong family');
    assert(same(await client.readContract({ address: nextRouter, abi, functionName: 'proxiableUUID' }), implementationSlot),
      'New router is not UUPS compatible');
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
  const payload = (name, transactions) => ({
    version: '1.0', chainId: String(network.chainId), createdAt: Date.now(),
    meta: { name: `${network.name} ${values.family} ${name}`,
      description: 'Review storage compatibility, linked libraries, proxy inventory, and simulate before Safe submission.',
      txBuilderVersion: '1.18.0', createdFromSafeAddress: safe, createdFromOwnerAddress: '', checksum: '' },
    transactions,
  });
  const transaction = (to, functionName, args) => ({
    to, value: '0', data: encodeFunctionData({ abi, functionName, args }),
  });
  const output = resolve(values.out);
  if (!values.router && migrations.size === 0) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(payload('shared release', [
      transaction(factory, releaseName, [cuts, nextImplementation]),
    ]), null, 2)}\n`);
    process.stdout.write(`Prepared one ${values.family} release transaction in ${output}; checked ${proxies.length} configured proxies. Reconcile inventory with live creation events.\n`);
    return;
  }

  const stages = [];
  if (values.implementation || replacements.size) {
    stages.push(['01-factory-release', [transaction(factory, releaseName, [cuts, nextImplementation])]]);
  }
  const migrationCalls = [...migrations.values()];
  for (let i = 0; i < migrationCalls.length; i += batchSize) {
    const index = String(i / batchSize + 1).padStart(2, '0');
    stages.push([`02-migrate-state-${index}`,
      migrationCalls.slice(i, i + batchSize).map(({ proxy, data }) =>
        transaction(proxy, 'runImplementationMigration', [data]))]);
  }
  if (values.router) {
    stages.push(['03-switch-template', [transaction(factory,
      strategy ? 'setStrategyTemplate' : 'setRegistryCommunityTemplate', [nextRouter])]]);
    for (let i = 0; i < proxies.length; i += batchSize) {
      const index = String(i / batchSize + 1).padStart(2, '0');
      stages.push([`04-upgrade-proxies-${index}`,
        proxies.slice(i, i + batchSize).map((proxy) =>
          transaction(address(proxy, 'proxy'), 'upgradeTo', [nextRouter]))]);
    }
  }
  await mkdir(output, { recursive: true });
  assert((await readdir(output)).length === 0, `Output directory must be empty: ${output}`);
  for (const [name, transactions] of stages) {
    await writeFile(join(output, `${network.name}-${values.family}-${name}.json`),
      `${JSON.stringify(payload(name, transactions), null, 2)}\n`);
  }
  await writeFile(join(output, `${network.name}-${values.family}-manifest.json`),
    `${JSON.stringify({ chainId: network.chainId, safe, factory, family: values.family,
      oldRouter: router, newRouter: nextRouter, oldImplementation: currentImplementation,
      newImplementation: nextImplementation, proxies: proxies.length, migrations: migrations.size,
      stages: stages.map(([name, transactions]) => ({ name, transactions: transactions.length })),
    }, null, 2)}\n`);
  process.stdout.write(`Prepared ${stages.length} ordered ${values.family} Safe payloads in ${output}; checked ${proxies.length} configured proxies. Reconcile inventory with live creation events.\n`);
}

main().catch((error) => {
  process.stderr.write(`Shared release preparation failed: ${error.shortMessage || error.message}\n`);
  process.exitCode = 1;
});
