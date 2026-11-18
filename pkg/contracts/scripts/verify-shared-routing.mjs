#!/usr/bin/env node
// Read-only live verification for a fully migrated factory and its configured proxies.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createPublicClient, getAddress, http, parseAbi, toFunctionSelector } from 'viem';

const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function routingFactory() view returns (address)',
  'function routesStrategies() view returns (bool)',
  'function proxiableUUID() view returns (bytes32)',
  'function registryCommunity() view returns (address)',
  'function registryFactory() view returns (address)',
  'function strategyTemplate() view returns (address)',
  'function registryCommunityTemplate() view returns (address)',
  'function strategyImplementation() view returns (address)',
  'function communityImplementation() view returns (address)',
  'function strategyFacet(bytes4 selector) view returns (address)',
  'function communityFacet(bytes4 selector) view returns (address)',
  'function facetAddress(bytes4 selector) view returns (address)',
  'function getStrategyFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function getCommunityFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
]);
const loupeSelectors = new Set([
  'facets()', 'facetFunctionSelectors(address)', 'facetAddresses()',
  'facetAddress(bytes4)', 'supportsInterface(bytes4)',
].map(toFunctionSelector));
const { values } = parseArgs({ options: {
  network: { type: 'string' }, rpc: { type: 'string' },
  family: { type: 'string' }, help: { type: 'boolean' },
} });
if (values.help) {
  process.stdout.write('Usage: node scripts/verify-shared-routing.mjs --network <name> --rpc <url> [--family strategy|community|both]\n');
  process.exit(0);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }
async function main() {
  assert(values.network && values.rpc, 'Missing --network or --rpc');
  const family = values.family ?? 'both';
  assert(['strategy', 'community', 'both'].includes(family), 'Invalid family');
  const config = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../config/networks.json'), 'utf8'));
  const network = config.networks.find((entry) => entry.name === values.network);
  assert(network, `Unknown network ${values.network}`);
  const client = createPublicClient({ transport: http(values.rpc) });
  assert(await client.getChainId() === network.chainId, 'RPC chain ID does not match networks.json');
  const factory = getAddress(network.PROXIES.REGISTRY_FACTORY);
  for (const strategy of family === 'both' ? [false, true] : [family === 'strategy']) {
    const label = strategy ? 'strategy' : 'community';
    const templateName = strategy ? 'strategyTemplate' : 'registryCommunityTemplate';
    const implementationName = strategy ? 'strategyImplementation' : 'communityImplementation';
    const facetsName = strategy ? 'getStrategyFacets' : 'getCommunityFacets';
    const facetName = strategy ? 'strategyFacet' : 'communityFacet';
    const rawProxies = strategy ? network.PROXIES.CV_STRATEGIES : network.PROXIES.REGISTRY_COMMUNITIES;
    assert(Array.isArray(rawProxies), `Missing ${label} proxy inventory`);
    const router = await client.readContract({ address: factory, abi, functionName: templateName });
    const implementation = await client.readContract({ address: factory, abi, functionName: implementationName });
    for (const [address, name] of [[factory, 'factory'], [router, 'router'], [implementation, 'core']]) {
      const code = await client.getCode({ address });
      assert(code && code !== '0x', `${label} ${name} has no code: ${address}`);
    }
    assert(same(await client.readContract({ address: router, abi, functionName: 'routingFactory' }), factory),
      `${label} router points to another factory`);
    assert(await client.readContract({ address: router, abi, functionName: 'routesStrategies' }) === strategy,
      `${label} router has wrong family`);
    assert(same(await client.readContract({ address: router, abi, functionName: 'proxiableUUID' }), implementationSlot),
      `${label} router has wrong UUPS slot`);
    assert(same(await client.readContract({ address: implementation, abi, functionName: 'proxiableUUID' }), implementationSlot),
      `${label} core has wrong UUPS slot`);
    await client.readContract({ address: implementation, abi,
      functionName: strategy ? 'registryCommunity' : 'registryFactory' });
    const [cuts] = await client.readContract({ address: factory, abi, functionName: facetsName });
    assert(cuts.length > 0, `${label} facet set is empty`);
    const selectors = new Set();
    for (const cut of cuts) {
      const code = await client.getCode({ address: cut.facetAddress });
      assert(code && code !== '0x', `${label} facet has no code: ${cut.facetAddress}`);
      for (const selector of cut.functionSelectors) {
        assert(!selectors.has(selector), `${label} duplicate selector: ${selector}`);
        selectors.add(selector);
        const target = await client.readContract({ address: factory, abi, functionName: facetName, args: [selector] });
        if (loupeSelectors.has(selector)) {
          assert(same(target, '0x0000000000000000000000000000000000000000'),
            `${label} loupe selector unexpectedly routes through a facet: ${selector}`);
          if (rawProxies.length) {
            const proxy = getAddress(rawProxies[0]);
            const loupeTarget = await client.readContract({ address: proxy, abi,
              functionName: 'facetAddress', args: [selector] });
            assert(same(loupeTarget, proxy), `${label} router does not serve loupe selector: ${selector}`);
          }
        } else {
          assert(same(target, cut.facetAddress), `${label} selector routing mismatch: ${selector}`);
        }
      }
    }
    const seen = new Set();
    for (const rawProxy of rawProxies) {
      const proxy = getAddress(rawProxy);
      assert(!seen.has(proxy), `${label} duplicate proxy: ${proxy}`);
      seen.add(proxy);
      const word = await client.getStorageAt({ address: proxy, slot: implementationSlot });
      assert(word?.length === 66 && same(`0x${word.slice(-40)}`, router),
        `${label} proxy is not routed: ${proxy}`);
    }
    process.stdout.write(`${network.name}: ${label} router, core, ${cuts.length} cuts, ${selectors.size} selectors, ${seen.size} configured proxies verified\n`);
  }
  process.stdout.write('Reconcile configured proxies with live creation events separately.\n');
}
main().catch((error) => {
  process.stderr.write(`Shared routing verification failed: ${error.shortMessage || error.message}\n`);
  process.exitCode = 1;
});
