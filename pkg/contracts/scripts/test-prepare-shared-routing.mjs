#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFunctionData, encodeEventTopics, encodeFunctionResult, getAddress, parseAbi, toFunctionSelector } from 'viem';

const root = fileURLToPath(new URL('..', import.meta.url));
const network = JSON.parse(await readFile(join(root, 'config/networks.json'), 'utf8'))
  .networks.find((entry) => entry.name === 'opsepolia');
const factory = getAddress(network.PROXIES.REGISTRY_FACTORY);
const executor = getAddress('0x1000000000000000000000000000000000000001');
const safe = getAddress('0x1000000000000000000000000000000000000002');
const strategyRouter = getAddress('0x1000000000000000000000000000000000000003');
const communityRouter = getAddress('0x1000000000000000000000000000000000000004');
const strategyLogic = getAddress('0x1000000000000000000000000000000000000005');
const communityLogic = getAddress('0x1000000000000000000000000000000000000006');
const oldFacet = getAddress('0x1000000000000000000000000000000000000007');
const poolFacet = getAddress('0x1000000000000000000000000000000000000008');
const oldTemplate = getAddress('0x1000000000000000000000000000000000000009');
const slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const zero = '0x0000000000000000000000000000000000000000';
const communitySwitchHash = `0x${'a'.repeat(64)}`;
const strategySwitchHash = `0x${'b'.repeat(64)}`;
const abi = parseAbi([
  'function owner() view returns (address)',
  'function nonce() view returns (uint256)',
  'function getThreshold() view returns (uint256)',
  'function routingFactory() view returns (address)',
  'function routesStrategies() view returns (bool)',
  'function proxiableUUID() view returns (bytes32)',
  'function strategyImplementation() view returns (address)',
  'function communityImplementation() view returns (address)',
  'function getStrategyFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function getCommunityFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function registryFactory() view returns (address)',
  'function registryCommunity() view returns (address)',
  'function registryCommunityTemplate() view returns (address)',
  'function strategyTemplate() view returns (address)',
  'function setCommunityRelease((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address implementation)',
  'function setStrategyRelease((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address implementation)',
  'function setRegistryCommunityTemplate(address template)',
  'function setStrategyTemplate(address template)',
  'function upgradeTo(address implementation)',
  'event CommunityTemplateSet(address indexed template)',
  'event StrategyTemplateSet(address indexed template)',
]);
const selectors = new Map(abi.filter((item) => item.type === 'function')
  .map((item) => [toFunctionSelector(item), item.name]));
let effectiveOwner = executor;
let communityNonce = BigInt(network.PROXIES.REGISTRY_COMMUNITIES.length);
let activeCommunityLogic = zero;
let activeStrategyLogic = zero;
let currentCommunityTemplate = oldTemplate;
let currentStrategyTemplate = oldTemplate;
let poolCutFacet = oldFacet;
let indexedBlock = 99;
let extraIndexedStrategy = false;
const communitySlots = new Set();
const strategySlots = new Set();
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString());
  if (request.url === '/graphql') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ data: {
      _meta: { block: { number: indexedBlock }, hasIndexingErrors: false },
      registryFactories: [{ id: factory }],
      registryCommunities: network.PROXIES.REGISTRY_COMMUNITIES.map((id) => ({ id })),
      cvstrategies: [...network.PROXIES.CV_STRATEGIES.map((id) => ({ id })),
        ...(extraIndexedStrategy ? [{ id: '0x1000000000000000000000000000000000000010' }] : [])],
    } }));
    return;
  }
  const { method, params = [] } = input;
  let result;
  if (method === 'eth_chainId') result = `0x${network.chainId.toString(16)}`;
  else if (method === 'eth_getCode') result = getAddress(params[0]) === executor ? '0x' : '0x6000';
  else if (method === 'eth_getStorageAt') {
    const address = getAddress(params[0]);
    const routed = communitySlots.has(address) ? communityRouter : strategySlots.has(address) ? strategyRouter : oldTemplate;
    result = `0x${'0'.repeat(24)}${routed.slice(2).toLowerCase()}`;
  }
  else if (method === 'eth_getTransactionReceipt') {
    const isCommunity = params[0] === communitySwitchHash;
    const eventName = isCommunity ? 'CommunityTemplateSet' : 'StrategyTemplateSet';
    const template = isCommunity ? communityRouter : strategyRouter;
    const topics = encodeEventTopics({ abi, eventName, args: { template } });
    const transactionHash = params[0];
    result = {
      transactionHash, transactionIndex: '0x0', blockHash: `0x${'c'.repeat(64)}`,
      blockNumber: isCommunity ? '0x64' : '0xc8', from: executor, to: factory,
      cumulativeGasUsed: '0x5208', gasUsed: '0x5208', effectiveGasPrice: '0x1',
      logsBloom: `0x${'0'.repeat(512)}`, status: '0x1', type: '0x2',
      logs: [{ address: factory, topics, data: '0x', blockNumber: isCommunity ? '0x64' : '0xc8',
        transactionHash, transactionIndex: '0x0', blockHash: `0x${'c'.repeat(64)}`, logIndex: '0x0', removed: false }],
    };
  }
  else if (method === 'eth_call') {
    const call = params[0];
    const name = selectors.get(call.data.slice(0, 10));
    assert(name, `Unexpected selector ${call.data}`);
    const target = getAddress(call.to);
    let value;
    switch (name) {
      case 'owner': value = effectiveOwner; break;
      case 'nonce': value = communityNonce; break;
      case 'getThreshold': value = 2n; break;
      case 'routingFactory':
      case 'registryFactory': value = factory; break;
      case 'routesStrategies': value = target === strategyRouter; break;
      case 'proxiableUUID': value = slot; break;
      case 'strategyImplementation': value = activeStrategyLogic; break;
      case 'communityImplementation': value = activeCommunityLogic; break;
      case 'registryCommunityTemplate': value = currentCommunityTemplate; break;
      case 'strategyTemplate': value = currentStrategyTemplate; break;
      case 'registryCommunity': value = getAddress(network.PROXIES.REGISTRY_COMMUNITIES[0]); break;
      case 'getStrategyFacets': value = [[{ facetAddress: oldFacet, action: 0, functionSelectors: ['0x12345678'] }],
        '0x0000000000000000000000000000000000000000', '0x']; break;
      case 'getCommunityFacets': value = [[{ facetAddress: poolCutFacet, action: 0, functionSelectors: ['0xce7e2cd3', '0x82b18ef4'] }],
        '0x0000000000000000000000000000000000000000', '0x']; break;
      default: throw new Error(`Unexpected call ${name}`);
    }
    result = encodeFunctionResult({ abi, functionName: name, result: value });
  } else throw new Error(`Unexpected RPC method ${method}`);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ jsonrpc: '2.0', id: input.id, result }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const rpc = `http://127.0.0.1:${server.address().port}`;
const temp = await mkdtemp(join(tmpdir(), 'shared-routing-'));
const script = join(root, 'scripts/prepare-shared-routing.mjs');
const common = ['--network', network.name, '--rpc', rpc,
  '--strategy-router', strategyRouter, '--community-router', communityRouter,
  '--strategy-logic', strategyLogic, '--community-logic', communityLogic,
  '--community-pool-facet', poolFacet, '--batch-size', '3'];
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...common, ...args]);
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (status) => resolve({ status, stderr }));
});

try {
  const directDir = join(temp, 'direct');
  const direct = await run(['--phase', 'activate', '--executor', executor, '--out', directDir]);
  assert.equal(direct.status, 0, direct.stderr);
  const files = (await readdir(directDir)).filter((name) => !name.endsWith('manifest.json')).sort();
  assert.equal(files.length, 1);
  const payloads = await Promise.all(files.map(async (name) => JSON.parse(await readFile(join(directDir, name), 'utf8'))));
  assert(payloads.every((item) => item.meta.createdFromOwnerAddress === executor && item.meta.createdFromSafeAddress === ''));
  assert.deepEqual(payloads[0].transactions.map((item) => decodeFunctionData({ abi, data: item.data }).functionName),
    ['setCommunityRelease', 'setStrategyRelease', 'setRegistryCommunityTemplate']);
  assert.equal(decodeFunctionData({ abi, data: payloads[0].transactions[0].data }).functionName, 'setCommunityRelease');
  assert.equal(decodeFunctionData({ abi, data: payloads[0].transactions[0].data }).args[0][0].facetAddress, poolFacet);
  const manifest = JSON.parse(await readFile(join(directDir, `${network.name}-manifest.json`), 'utf8'));
  assert.equal(manifest.executionMode, 'direct-owner');
  assert.equal(manifest.executor, executor);

  const wrongSafe = await run(['--phase', 'activate', '--safe', safe, '--out', join(temp, 'wrong-safe')]);
  assert.notEqual(wrongSafe.status, 0);
  assert.match(wrongSafe.stderr, /effective owner/);

  effectiveOwner = safe;
  const safeDir = join(temp, 'safe');
  const safeResult = await run(['--phase', 'activate', '--safe', safe, '--out', safeDir]);
  assert.equal(safeResult.status, 0, safeResult.stderr);
  const safePayload = JSON.parse(await readFile(join(safeDir, `${network.name}-01-activate-routing.json`), 'utf8'));
  assert.equal(safePayload.meta.createdFromSafeAddress, safe);
  assert.equal(safePayload.meta.createdFromOwnerAddress, '');

  effectiveOwner = executor;
  activeCommunityLogic = communityLogic;
  activeStrategyLogic = strategyLogic;
  poolCutFacet = poolFacet;
  currentCommunityTemplate = communityRouter;
  const inventoryArgs = ['--subgraph-url', `${rpc}/graphql`, '--switch-tx', communitySwitchHash];
  const staleIndex = await run(['--phase', 'communities', '--executor', executor,
    '--out', join(temp, 'stale-index'), ...inventoryArgs]);
  assert.notEqual(staleIndex.status, 0);
  assert.match(staleIndex.stderr, /has not indexed/);

  indexedBlock = 100;
  const communitiesDir = join(temp, 'communities');
  const communities = await run(['--phase', 'communities', '--executor', executor,
    '--out', communitiesDir, ...inventoryArgs]);
  assert.equal(communities.status, 0, communities.stderr);
  const communityFiles = (await readdir(communitiesDir)).filter((name) => !name.endsWith('manifest.json')).sort();
  assert(communityFiles.length === 2 && communityFiles.every((name) => name.includes('-02-migrate-communities-')));

  const tooEarly = await run(['--phase', 'switch-strategy', '--executor', executor,
    '--out', join(temp, 'too-early')]);
  assert.notEqual(tooEarly.status, 0);
  assert.match(tooEarly.stderr, /Unmigrated communities/);
  for (const address of network.PROXIES.REGISTRY_COMMUNITIES) communitySlots.add(getAddress(address));
  const switchDir = join(temp, 'switch-strategy');
  const switched = await run(['--phase', 'switch-strategy', '--executor', executor, '--out', switchDir]);
  assert.equal(switched.status, 0, switched.stderr);
  const switchPayload = JSON.parse(await readFile(join(switchDir, `${network.name}-03-switch-strategy-template.json`), 'utf8'));
  assert.equal(decodeFunctionData({ abi, data: switchPayload.transactions[0].data }).functionName, 'setStrategyTemplate');

  currentStrategyTemplate = strategyRouter;
  indexedBlock = 200;
  extraIndexedStrategy = true;
  const strategyArgs = ['--subgraph-url', `${rpc}/graphql`, '--switch-tx', strategySwitchHash];
  const missingStrategy = await run(['--phase', 'strategies', '--executor', executor,
    '--out', join(temp, 'missing-strategy'), ...strategyArgs]);
  assert.notEqual(missingStrategy.status, 0);
  assert.match(missingStrategy.stderr, /cvstrategies differs/);

  extraIndexedStrategy = false;
  const strategiesDir = join(temp, 'strategies');
  const strategies = await run(['--phase', 'strategies', '--executor', executor,
    '--out', strategiesDir, ...strategyArgs]);
  assert.equal(strategies.status, 0, strategies.stderr);
  const strategyFiles = (await readdir(strategiesDir)).filter((name) => !name.endsWith('manifest.json')).sort();
  assert(strategyFiles.length === 3 && strategyFiles.every((name) => name.includes('-04-migrate-strategies-')));

  const incomplete = await run(['--phase', 'verify', '--executor', executor,
    '--out', join(temp, 'incomplete'), ...strategyArgs]);
  assert.notEqual(incomplete.status, 0);
  assert.match(incomplete.stderr, /Unmigrated strategies/);
  for (const address of network.PROXIES.CV_STRATEGIES) strategySlots.add(getAddress(address));
  const verifiedDir = join(temp, 'verified');
  const verified = await run(['--phase', 'verify', '--executor', executor,
    '--out', verifiedDir, ...strategyArgs]);
  assert.equal(verified.status, 0, verified.stderr);
  const verifiedManifest = JSON.parse(await readFile(join(verifiedDir, `${network.name}-manifest.json`), 'utf8'));
  assert.equal(verifiedManifest.stages.length, 0);
  assert.equal(verifiedManifest.pendingStrategies, 0);
  process.stdout.write('Shared routing phased migration and inventory tests passed\n');
} finally {
  await rm(temp, { recursive: true, force: true });
  server.close();
}
