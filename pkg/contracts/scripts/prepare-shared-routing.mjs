#!/usr/bin/env node
// Prepare, but never submit, the phased transactions for shared routing.
import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createPublicClient, encodeFunctionData, getAddress, http, isAddress, parseAbi, parseEventLogs } from 'viem';
import { getProxyEventInventory } from '../../subgraph/src/scripts/proxy-event-inventory.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function routingFactory() view returns (address)',
  'function routesStrategies() view returns (bool)',
  'function proxiableUUID() view returns (bytes32)',
  'function owner() view returns (address)',
  'function nonce() view returns (uint256)',
  'function getThreshold() view returns (uint256)',
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
  'event CommunityTemplateSet(address indexed template)',
  'event StrategyTemplateSet(address indexed template)',
]);

const { values } = parseArgs({ options: {
  network: { type: 'string' }, rpc: { type: 'string' },
  phase: { type: 'string' }, 'subgraph-url': { type: 'string' }, 'switch-tx': { type: 'string' },
  'inventory-source': { type: 'string', default: 'subgraph' },
  'strategy-router': { type: 'string' }, 'community-router': { type: 'string' },
  'strategy-logic': { type: 'string' }, 'community-logic': { type: 'string' },
  'community-pool-facet': { type: 'string' }, out: { type: 'string' },
  safe: { type: 'string' }, executor: { type: 'string' }, 'expected-owner': { type: 'string' },
  'batch-size': { type: 'string', default: '10' }, help: { type: 'boolean' },
}});

if (values.help) {
  process.stdout.write('Usage: node scripts/prepare-shared-routing.mjs --phase activate|communities|switch-strategy|strategies|verify --network <name> --rpc <url> (--executor <effective-owner-eoa> | --safe <effective-owner-safe>) --strategy-router <address> --community-router <address> --strategy-logic <address> --community-logic <address> --community-pool-facet <address> --out <empty-directory> [--subgraph-url <url> | --inventory-source events with ETHERSCAN_API_KEY] [--switch-tx <hash>] [--batch-size 10]\n');
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
function payload(network, executor, isSafe, name, transactions) {
  return {
    version: '1.0', chainId: String(network.chainId), createdAt: Date.now(),
    meta: { name: `${network.name} shared routing ${name}`, description: isSafe ? 'Review and simulate before Safe submission.' : 'Review and simulate before direct owner execution; this is not a Safe proposal.', txBuilderVersion: '1.18.0', createdFromSafeAddress: isSafe ? executor : '', createdFromOwnerAddress: isSafe ? '' : executor, checksum: '' },
    transactions,
  };
}
async function currentImplementation(client, proxy) {
  const word = await client.getStorageAt({ address: proxy, slot: implementationSlot });
  assert(word && word.length === 66, `Cannot read implementation slot for ${proxy}`);
  return getAddress(`0x${word.slice(-40)}`);
}
async function verifyInventory(client, factory, communities, strategies, eventName, router) {
  assert(values['switch-tx'], 'This phase requires --switch-tx for post-switch inventory verification');
  assert(/^0x[0-9a-fA-F]{64}$/.test(values['switch-tx']), 'Invalid --switch-tx');
  const receipt = await client.getTransactionReceipt({ hash: values['switch-tx'] });
  assert(receipt.status === 'success', 'Switch transaction did not succeed');
  const events = parseEventLogs({ abi, logs: receipt.logs, eventName, strict: true });
  assert(events.some((event) => same(event.address, factory) && same(event.args.template, router)),
    `Switch transaction did not emit ${eventName} for this factory and router`);
  if (values['inventory-source'] === 'events') {
    const toBlock = Number(await client.getBlockNumber());
    const inventory = await getProxyEventInventory({ chainId: await client.getChainId(), factory,
      toBlock, apiKey: process.env.ETHERSCAN_API_KEY, client, switchTx: values['switch-tx'],
      switchBlock: Number(receipt.blockNumber),
      switchFamily: eventName === 'CommunityTemplateSet' ? 'community' : 'strategy', router });
    for (const [kind, configured] of [['communities', communities], ['strategies', strategies]]) {
      const actual = new Set(inventory[kind].map((address) => address.toLowerCase()));
      const expected = new Set(configured.map((address) => address.toLowerCase()));
      assert(actual.size === expected.size && [...actual].every((address) => expected.has(address)),
        `${kind} differs between creation events and networks.json; run event-backed proxy sync`);
    }
    return { switchTx: values['switch-tx'], switchBlock: Number(receipt.blockNumber),
      queriedThroughBlock: toBlock, recentRpcFromBlock: inventory.recentRpcFromBlock,
      source: inventory.source };
  }
  assert(values['inventory-source'] === 'subgraph' && values['subgraph-url'],
    'This phase requires --subgraph-url or --inventory-source events');
  const response = await fetch(values['subgraph-url'], {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ _meta { block { number } hasIndexingErrors } registryFactories(first: 1000) { id } registryCommunities(first: 1000) { id } cvstrategies(first: 1000) { id } }' }),
  });
  assert(response.ok, `Subgraph returned HTTP ${response.status}`);
  const body = await response.json();
  assert(!body.errors && body.data, 'Subgraph returned errors or no data');
  const indexed = body.data;
  assert(!indexed._meta.hasIndexingErrors, 'Subgraph has indexing errors');
  assert(BigInt(indexed._meta.block.number) >= receipt.blockNumber,
    'Subgraph has not indexed the template switch transaction');
  assert(indexed.registryFactories.length === 1 && same(indexed.registryFactories[0].id, factory),
    'Subgraph indexes a different factory');
  for (const [kind, configured] of [['registryCommunities', communities], ['cvstrategies', strategies]]) {
    const entries = indexed[kind];
    assert(entries.length < 1000, `${kind} inventory may be truncated`);
    const actual = new Set(entries.map((item) => getAddress(item.id)));
    const expected = new Set(configured);
    assert(actual.size === expected.size && [...actual].every((item) => expected.has(item)),
      `${kind} differs between the indexed inventory and networks.json; run task sync-proxies`);
  }
  return { switchTx: values['switch-tx'], switchBlock: Number(receipt.blockNumber), indexedBlock: Number(indexed._meta.block.number) };
}
async function main() {
  const networkName = values.network;
  const phase = values.phase;
  assert(['activate', 'communities', 'switch-strategy', 'strategies', 'verify'].includes(phase),
    'Specify --phase activate|communities|switch-strategy|strategies|verify');
  assert(['subgraph', 'events'].includes(values['inventory-source']), 'Invalid --inventory-source');
  assert(networkName && values.rpc && values.out, 'Missing --network, --rpc or --out');
  assert(Boolean(values.safe) !== Boolean(values.executor), 'Specify exactly one of --safe or --executor');
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
  const isSafe = Boolean(values.safe);
  const expectedOwner = addressArg(isSafe ? 'safe' : 'executor');
  if (values['expected-owner']) {
    assert(same(getAddress(values['expected-owner']), expectedOwner),
      'Executor must be the effective owner to execute this payload');
  }
  for (const target of [factory, strategyRouter, communityRouter, strategyLogic, communityLogic, poolFacet]) {
    await assertCode(client, target, 'Routing target');
  }
  if (isSafe) {
    await assertCode(client, expectedOwner, 'Safe');
    assert((await client.readContract({ address: expectedOwner, abi, functionName: 'getThreshold' })) > 0n,
      'Safe threshold is zero');
  } else {
    const executorCode = await client.getCode({ address: expectedOwner });
    assert(!executorCode || executorCode === '0x', '--executor must be an EOA');
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
  const activeStrategyLogic = await client.readContract({ address: factory, abi, functionName: 'strategyImplementation' });
  const activeCommunityLogic = await client.readContract({ address: factory, abi, functionName: 'communityImplementation' });
  const [strategyCuts] = await client.readContract({ address: factory, abi, functionName: 'getStrategyFacets' });
  const [communityCuts] = await client.readContract({ address: factory, abi, functionName: 'getCommunityFacets' });
  assert(strategyCuts.length > 0 && communityCuts.length > 0, 'Factory facet sets are empty');
  assert(same(await client.readContract({ address: factory, abi, functionName: 'owner' }), expectedOwner),
    'Factory effective owner does not match executor');
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
  const communityNonce = await client.readContract({ address: factory, abi, functionName: 'nonce' });
  assert(communityNonce === BigInt(communityProxies.length),
    'Factory community nonce differs from networks.json; run task sync-proxies and reconcile creation events');
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
  const stages = [];
  let inventoryEvidence;
  const zero = '0x0000000000000000000000000000000000000000';
  if (phase === 'activate') {
    assert(!same(oldStrategyTemplate, strategyRouter), 'Strategy template already routed; choose a later phase');
    const transactions = [];
    if (same(activeCommunityLogic, zero)) transactions.push(tx(factory, 'setCommunityRelease', [nextCommunityCuts, communityLogic]));
    else {
      assert(same(activeCommunityLogic, communityLogic), 'Factory uses another community core');
      assert(communityCuts.some((cut) => same(cut.facetAddress, poolFacet)),
        'Active community release uses another CommunityPoolFacet');
    }
    if (same(activeStrategyLogic, zero)) transactions.push(tx(factory, 'setStrategyRelease', [strategyCuts, strategyLogic]));
    else assert(same(activeStrategyLogic, strategyLogic), 'Factory uses another strategy core');
    if (!same(oldCommunityTemplate, communityRouter)) transactions.push(tx(factory, 'setRegistryCommunityTemplate', [communityRouter]));
    assert(transactions.length > 0, 'Activation already complete; choose communities phase');
    stages.push(['01-activate-routing', transactions]);
  } else {
    assert(same(activeStrategyLogic, strategyLogic) && same(activeCommunityLogic, communityLogic),
      'Both factory releases must be active before this phase');
    assert(same(oldCommunityTemplate, communityRouter), 'Community template must point to the router');
    assert(communityCuts.some((cut) => same(cut.facetAddress, poolFacet)),
      'CommunityPoolFacet release is not active');
    if (phase === 'communities') {
      assert(!same(oldStrategyTemplate, strategyRouter), 'Strategy template already routed; choose strategies phase');
      inventoryEvidence = await verifyInventory(client, factory, communityProxies, strategyProxies,
        'CommunityTemplateSet', communityRouter);
      for (let i = 0; i < pendingCommunities.length; i += batchSize) {
        stages.push([`02-migrate-communities-${String(i / batchSize + 1).padStart(2, '0')}`,
          pendingCommunities.slice(i, i + batchSize).map((proxy) => tx(proxy, 'upgradeTo', [communityRouter]))]);
      }
    } else if (phase === 'switch-strategy') {
      assert(!same(oldStrategyTemplate, strategyRouter), 'Strategy template already routed');
      assert(pendingCommunities.length === 0, 'Unmigrated communities remain');
      stages.push(['03-switch-strategy-template', [tx(factory, 'setStrategyTemplate', [strategyRouter])]]);
    } else {
      assert(same(oldStrategyTemplate, strategyRouter), 'Strategy template must point to the router');
      assert(pendingCommunities.length === 0, 'Unmigrated communities remain');
      inventoryEvidence = await verifyInventory(client, factory, communityProxies, strategyProxies,
        'StrategyTemplateSet', strategyRouter);
      if (phase === 'verify') assert(pendingStrategies.length === 0, 'Unmigrated strategies remain');
      else for (let i = 0; i < pendingStrategies.length; i += batchSize) {
        stages.push([`04-migrate-strategies-${String(i / batchSize + 1).padStart(2, '0')}`,
          pendingStrategies.slice(i, i + batchSize).map((proxy) => tx(proxy, 'upgradeTo', [strategyRouter]))]);
      }
    }
  }

  const out = resolve(values.out);
  await mkdir(out, { recursive: true });
  assert((await readdir(out)).length === 0, `Output directory must be empty: ${out}`);
  for (const [name, transactions] of stages) {
    await writeFile(join(out, `${network.name}-${name}.json`), `${JSON.stringify(payload(network, expectedOwner, isSafe, name, transactions), null, 2)}\n`);
  }
  await writeFile(join(out, `${network.name}-manifest.json`), `${JSON.stringify({
    chainId: network.chainId, phase, factory, executor: expectedOwner, executionMode: isSafe ? 'safe' : 'direct-owner', oldCommunityTemplate, oldStrategyTemplate,
    strategyRouter, communityRouter, strategyLogic, communityLogic, poolFacet,
    inventoryEvidence,
    communities: communityProxies.length, pendingCommunities: pendingCommunities.length,
    strategies: strategyProxies.length, pendingStrategies: pendingStrategies.length,
    stages: stages.map(([name, transactions]) => ({ name, transactions: transactions.length })),
  }, null, 2)}\n`);
  process.stdout.write(`Prepared ${stages.length} ${phase} payload files in ${out}\n`);
}

main().catch((error) => {
  process.stderr.write(`Shared routing preparation failed: ${error.shortMessage || error.message}\n`);
  process.exitCode = 1;
});
