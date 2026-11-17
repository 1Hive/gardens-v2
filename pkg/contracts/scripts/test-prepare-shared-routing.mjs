#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFunctionData, encodeFunctionResult, getAddress, parseAbi, toFunctionSelector } from 'viem';

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
const abi = parseAbi([
  'function owner() view returns (address)',
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
  'function upgradeTo(address implementation)',
]);
const selectors = new Map(abi.filter((item) => item.type === 'function')
  .map((item) => [toFunctionSelector(item), item.name]));
let effectiveOwner = executor;
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const { method, params = [] } = input;
  let result;
  if (method === 'eth_chainId') result = `0x${network.chainId.toString(16)}`;
  else if (method === 'eth_getCode') result = getAddress(params[0]) === executor ? '0x' : '0x6000';
  else if (method === 'eth_getStorageAt') result = `0x${'0'.repeat(24)}${oldTemplate.slice(2).toLowerCase()}`;
  else if (method === 'eth_call') {
    const call = params[0];
    const name = selectors.get(call.data.slice(0, 10));
    assert(name, `Unexpected selector ${call.data}`);
    const target = getAddress(call.to);
    let value;
    switch (name) {
      case 'owner': value = effectiveOwner; break;
      case 'getThreshold': value = 2n; break;
      case 'routingFactory':
      case 'registryFactory': value = factory; break;
      case 'routesStrategies': value = target === strategyRouter; break;
      case 'proxiableUUID': value = slot; break;
      case 'strategyImplementation':
      case 'communityImplementation':
      case 'registryCommunityTemplate':
      case 'strategyTemplate': value = oldTemplate; break;
      case 'registryCommunity': value = getAddress(network.PROXIES.REGISTRY_COMMUNITIES[0]); break;
      case 'getStrategyFacets': value = [[{ facetAddress: oldFacet, action: 0, functionSelectors: ['0x12345678'] }],
        '0x0000000000000000000000000000000000000000', '0x']; break;
      case 'getCommunityFacets': value = [[{ facetAddress: oldFacet, action: 0, functionSelectors: ['0xce7e2cd3', '0x82b18ef4'] }],
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
  const direct = await run(['--executor', executor, '--out', directDir]);
  assert.equal(direct.status, 0, direct.stderr);
  const files = (await readdir(directDir)).filter((name) => !name.endsWith('manifest.json')).sort();
  const payloads = await Promise.all(files.map(async (name) => JSON.parse(await readFile(join(directDir, name), 'utf8'))));
  assert(payloads.every((item) => item.meta.createdFromOwnerAddress === executor && item.meta.createdFromSafeAddress === ''));
  assert.equal(decodeFunctionData({ abi, data: payloads[0].transactions[0].data }).functionName, 'setCommunityRelease');
  assert.equal(decodeFunctionData({ abi, data: payloads[0].transactions[0].data }).args[0][0].facetAddress, poolFacet);
  const manifest = JSON.parse(await readFile(join(directDir, `${network.name}-manifest.json`), 'utf8'));
  assert.equal(manifest.executionMode, 'direct-owner');
  assert.equal(manifest.executor, executor);

  const wrongSafe = await run(['--safe', safe, '--out', join(temp, 'wrong-safe')]);
  assert.notEqual(wrongSafe.status, 0);
  assert.match(wrongSafe.stderr, /effective owner/);

  effectiveOwner = safe;
  const safeDir = join(temp, 'safe');
  const safeResult = await run(['--safe', safe, '--out', safeDir]);
  assert.equal(safeResult.status, 0, safeResult.stderr);
  const safePayload = JSON.parse(await readFile(join(safeDir, `${network.name}-01-activate-routing.json`), 'utf8'));
  assert.equal(safePayload.meta.createdFromSafeAddress, safe);
  assert.equal(safePayload.meta.createdFromOwnerAddress, '');
  process.stdout.write('Shared routing direct owner and Safe payload tests passed\n');
} finally {
  await rm(temp, { recursive: true, force: true });
  server.close();
}
