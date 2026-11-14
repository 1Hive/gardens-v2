#!/usr/bin/env node
// Prepare, but never submit, the phased Safe transactions for shared routing.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createPublicClient, encodeFunctionData, getAddress, http, isAddress, parseAbi } from 'viem';

const here = dirname(fileURLToPath(import.meta.url));
const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function routingFactory() view returns (address)',
  'function routesStrategies() view returns (bool)',
  'function proxiableUUID() view returns (bytes32)',
  'function owner() view returns (address)',
  'function registryFactory() view returns (address)',
  'function registryCommunity() view returns (address)',
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
]);

const { values } = parseArgs({ options: {
  network: { type: 'string' }, rpc: { type: 'string' },
  'strategy-router': { type: 'string' }, 'community-router': { type: 'string' },
  'strategy-logic': { type: 'string' }, 'community-logic': { type: 'string' },
  'community-pool-facet': { type: 'string' }, out: { type: 'string' },
  'expected-owner': { type: 'string' },
  'batch-size': { type: 'string', default: '10' }, help: { type: 'boolean' },
}});

if (values.help) {
  process.stdout.write('Usage: node scripts/prepare-shared-routing.mjs --network <name> --rpc <url> --expected-owner <Safe-or-upgrade-wallet> --strategy-router <address> --community-router <address> --strategy-logic <address> --community-logic <address> --community-pool-facet <address> --out <directory> [--batch-size 10]\n');
  process.exit(0);
}

function addressArg(name) {
  const raw = values[name];
  if (!raw || !isAddress(raw)) throw new Error(`Missing or invalid --${name}`);
  return getAddress(raw);
}

function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }
function assert(condition, message) { if (!condition) throw new Error(message); }
async function assertCode(client, target, label) {
  const code = await client.getCode({ address: target });
  assert(code && code !== '0x', `${label} has no code: ${target}`);
}
function tx(to, functionName, args) {
  return { to, value: '0', data: encodeFunctionData({ abi, functionName, args }) };
}
function payload(network, name, transactions) {
  return {
    version: '1.0', chainId: String(network.chainId), createdAt: Date.now(),
    meta: { name: `${network.name} shared routing ${name}`, description: 'Review and simulate before Safe submission.', txBuilderVersion: '1.18.0', createdFromSafeAddress: '', createdFromOwnerAddress: '', checksum: '' },
    transactions,
  };
}
async function currentImplementation(client, proxy) {
  const word = await client.getStorageAt({ address: proxy, slot: implementationSlot });
  assert(word && word.length === 66, `Cannot read implementation slot for ${proxy}`);
  return getAddress(`0x${word.slice(-40)}`);
}
async function main() {
  const networkName = values.network;
  assert(networkName && values.rpc && values.out, 'Missing --network, --rpc or --out');
  const batchSize = Number(values['batch-size']);
  assert(Number.isSafeInteger(batchSize) && batchSize > 0 && batchSize <= 30, 'Batch size must be 1..30');
  const config = JSON.parse(await readFile(resolve(here, '../config/networks.json'), 'utf8'));
  const network = config.networks.find((entry) => entry.name === networkName);
  assert(network, `Unknown network ${networkName}`);
  const client = createPublicClient({ transport: http(values.rpc) });
  assert(await client.getChainId() === network.chainId, 'RPC chain ID does not match networks.json');

  const factory = getAddress(network.PROXIES.REGISTRY_FACTORY);
  const strategyRouter = addressArg('strategy-router');
  const communityRouter = addressArg('community-router');
  const strategyLogic = addressArg('strategy-logic');
  const communityLogic = addressArg('community-logic');
  const poolFacet = addressArg('community-pool-facet');
  const expectedOwner = addressArg('expected-owner');
  for (const target of [factory, strategyRouter, communityRouter, strategyLogic, communityLogic, poolFacet]) {
    await assertCode(client, target, 'Routing target');
  }
  for (const [router, label] of [[strategyRouter, 'strategy'], [communityRouter, 'community']]) {
    const wired = await client.readContract({ address: router, abi, functionName: 'routingFactory' });
    assert(same(wired, factory), `${label} router points to a different factory`);
    const routesStrategies = await client.readContract({ address: router, abi, functionName: 'routesStrategies' });
    assert(routesStrategies === (label === 'strategy'), `${label} router dispatches the wrong release family`);
    const slot = await client.readContract({ address: router, abi, functionName: 'proxiableUUID' });
    assert(same(slot, implementationSlot), `${label} router is not UUPS compatible`);
  }
  for (const [logic, label] of [[strategyLogic, 'strategy'], [communityLogic, 'community']]) {
    const slot = await client.readContract({ address: logic, abi, functionName: 'proxiableUUID' });
    assert(same(slot, implementationSlot), `${label} logic is not UUPS compatible`);
  }

  // The factory must already be upgraded through its existing governed upgrade flow.
  await client.readContract({ address: factory, abi, functionName: 'strategyImplementation' });
  await client.readContract({ address: factory, abi, functionName: 'communityImplementation' });
  const [strategyCuts] = await client.readContract({ address: factory, abi, functionName: 'getStrategyFacets' });
  const [communityCuts] = await client.readContract({ address: factory, abi, functionName: 'getCommunityFacets' });
  assert(strategyCuts.length > 0 && communityCuts.length > 0, 'Factory facet sets are empty');
  assert(same(await client.readContract({ address: factory, abi, functionName: 'owner' }), expectedOwner),
    'Factory effective owner does not match --expected-owner');
  let replacedPoolFacet = 0;
  const nextCommunityCuts = communityCuts.map((cut) => {
    const poolSelectors = cut.functionSelectors.filter((selector) =>
      same(selector, '0xce7e2cd3') || same(selector, '0x82b18ef4'));
    if (poolSelectors.length) {
      assert(poolSelectors.length === 2, 'CommunityPoolFacet cut must contain both createPool selectors');
      replacedPoolFacet++;
      return { facetAddress: poolFacet, action: cut.action, functionSelectors: cut.functionSelectors };
    }
    return cut;
  });
  assert(replacedPoolFacet === 1, 'Expected exactly one CommunityPoolFacet cut in the live factory set');
  for (const cut of [...strategyCuts, ...nextCommunityCuts]) {
    await assertCode(client, cut.facetAddress, 'Facet');
  }

  const communityProxies = network.PROXIES.REGISTRY_COMMUNITIES.map((address) => getAddress(address));
  const strategyProxies = network.PROXIES.CV_STRATEGIES.map((address) => getAddress(address));
  assert(new Set(communityProxies).size === communityProxies.length, 'Duplicate community in networks.json');
  assert(new Set(strategyProxies).size === strategyProxies.length, 'Duplicate strategy in networks.json');
  for (const proxy of communityProxies) {
    await assertCode(client, proxy, 'Community proxy');
    const wired = await client.readContract({ address: proxy, abi, functionName: 'registryFactory' });
    assert(same(wired, factory), `Community ${proxy} belongs to another factory`);
    const owner = await client.readContract({ address: proxy, abi, functionName: 'owner' });
    assert(same(owner, expectedOwner), `Community ${proxy} has a different effective owner`);
  }
  for (const proxy of strategyProxies) {
    await assertCode(client, proxy, 'Strategy proxy');
    const community = await client.readContract({ address: proxy, abi, functionName: 'registryCommunity' });
    const wired = await client.readContract({ address: community, abi, functionName: 'registryFactory' });
    assert(same(wired, factory), `Strategy ${proxy} belongs to another factory`);
    const owner = await client.readContract({ address: proxy, abi, functionName: 'owner' });
    assert(same(owner, expectedOwner), `Strategy ${proxy} has a different effective owner`);
  }

  const oldCommunityTemplate = await client.readContract({ address: factory, abi, functionName: 'registryCommunityTemplate' });
  const oldStrategyTemplate = await client.readContract({ address: factory, abi, functionName: 'strategyTemplate' });
  const pendingCommunities = [];
  for (const proxy of communityProxies) {
    if (!same(await currentImplementation(client, proxy), communityRouter)) pendingCommunities.push(proxy);
  }
  const pendingStrategies = [];
  for (const proxy of strategyProxies) {
    if (!same(await currentImplementation(client, proxy), strategyRouter)) pendingStrategies.push(proxy);
  }
  assert(!same(oldStrategyTemplate, strategyRouter) || pendingCommunities.length === 0,
    'Strategy template already points to router while some communities still use old pool creation code');

  const stages = [];
  stages.push(['01-activate-routing', [
    tx(factory, 'setCommunityRelease', [nextCommunityCuts, communityLogic]),
    tx(factory, 'setStrategyRelease', [strategyCuts, strategyLogic]),
  ]]);
  for (let i = 0; i < pendingCommunities.length; i += batchSize) {
    stages.push([`02-migrate-communities-${String(i / batchSize + 1).padStart(2, '0')}`,
      pendingCommunities.slice(i, i + batchSize).map((proxy) => tx(proxy, 'upgradeTo', [communityRouter]))]);
  }
  stages.push(['03-switch-templates', [
    tx(factory, 'setRegistryCommunityTemplate', [communityRouter]),
    tx(factory, 'setStrategyTemplate', [strategyRouter]),
  ]]);
  for (let i = 0; i < pendingStrategies.length; i += batchSize) {
    stages.push([`04-migrate-strategies-${String(i / batchSize + 1).padStart(2, '0')}`,
      pendingStrategies.slice(i, i + batchSize).map((proxy) => tx(proxy, 'upgradeTo', [strategyRouter]))]);
  }

  const out = resolve(values.out);
  await mkdir(out, { recursive: true });
  for (const [name, transactions] of stages) {
    await writeFile(join(out, `${network.name}-${name}.json`), `${JSON.stringify(payload(network, name, transactions), null, 2)}\n`);
  }
  await writeFile(join(out, `${network.name}-manifest.json`), `${JSON.stringify({
    chainId: network.chainId, factory, oldCommunityTemplate, oldStrategyTemplate,
    strategyRouter, communityRouter, strategyLogic, communityLogic, poolFacet,
    communities: communityProxies.length, pendingCommunities: pendingCommunities.length,
    strategies: strategyProxies.length, pendingStrategies: pendingStrategies.length,
    stages: stages.map(([name, transactions]) => ({ name, transactions: transactions.length })),
  }, null, 2)}\n`);
  process.stdout.write(`Prepared ${stages.length} payload files in ${out}\n`);
}

main().catch((error) => {
  process.stderr.write(`Shared routing preparation failed: ${error.shortMessage || error.message}\n`);
  process.exitCode = 1;
});
