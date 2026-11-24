#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeFunctionResult, decodeFunctionData, getAddress, parseAbi, toFunctionSelector } from 'viem';

const root = fileURLToPath(new URL('..', import.meta.url));
const network = JSON.parse(await readFile(join(root, 'config/networks.json'), 'utf8'))
  .networks.find((entry) => entry.name === 'opsepolia');
const factory = getAddress(network.PROXIES.REGISTRY_FACTORY);
const safe = getAddress('0x1000000000000000000000000000000000000001');
const deployer = getAddress('0x1000000000000000000000000000000000000009');
const oldRouter = getAddress('0x1000000000000000000000000000000000000002');
const newRouter = getAddress('0x1000000000000000000000000000000000000003');
const oldCore = getAddress('0x1000000000000000000000000000000000000004');
const newCore = getAddress('0x1000000000000000000000000000000000000005');
const oldFacet = getAddress('0x1000000000000000000000000000000000000006');
const newFacet = getAddress('0x1000000000000000000000000000000000000007');
const communityRouter = getAddress('0x1000000000000000000000000000000000000008');
const slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function owner() view returns (address)',
  'function upgradeAccess() view returns (address)',
  'function getThreshold() view returns (uint256)',
  'function strategyTemplate() view returns (address)',
  'function registryCommunityTemplate() view returns (address)',
  'function routingFactory() view returns (address)',
  'function routesStrategies() view returns (bool)',
  'function proxiableUUID() view returns (bytes32)',
  'function strategyImplementation() view returns (address)',
  'function communityImplementation() view returns (address)',
  'function registryCommunity() view returns (address)',
  'function registryFactory() view returns (address)',
  'function getStrategyFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function getCommunityFacets() view returns ((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address init,bytes initCalldata)',
  'function setStrategyRelease((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address implementation)',
  'function setCommunityRelease((address facetAddress,uint8 action,bytes4[] functionSelectors)[] cuts,address implementation)',
  'function setStrategyTemplate(address template)',
  'function upgradeTo(address newImplementation)',
  'function runImplementationMigration(bytes data)',
]);
const selectors = new Map(abi.filter((entry) => entry.type === 'function')
  .map((entry) => [toFunctionSelector(entry), entry.name]));
let proxyOwner = safe;
let factoryOwner = safe;
let grantedAccess = deployer;
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const { method, params = [] } = input;
  let result;
  if (method === 'eth_chainId') result = `0x${network.chainId.toString(16)}`;
  else if (method === 'eth_getCode') result = getAddress(params[0]) === deployer ? '0x' : '0x6000';
  else if (method === 'eth_getStorageAt') {
    const proxy = getAddress(params[0]);
    const router = network.PROXIES.REGISTRY_COMMUNITIES.some((item) => item.toLowerCase() === proxy.toLowerCase())
      ? communityRouter : oldRouter;
    result = `0x${'0'.repeat(24)}${router.slice(2).toLowerCase()}`;
  }
  else if (method === 'eth_call') {
    const call = params[0];
    const name = selectors.get(call.data.slice(0, 10));
    assert(name, `Unexpected selector ${call.data}`);
    const target = getAddress(call.to);
    let value;
    switch (name) {
      case 'owner': value = target.toLowerCase() === factory.toLowerCase() ? factoryOwner : proxyOwner; break;
      case 'upgradeAccess': value = grantedAccess; break;
      case 'getThreshold': value = 2n; break;
      case 'strategyTemplate': value = oldRouter; break;
      case 'registryCommunityTemplate': value = communityRouter; break;
      case 'routingFactory': value = factory; break;
      case 'routesStrategies': value = target.toLowerCase() !== communityRouter.toLowerCase(); break;
      case 'proxiableUUID': value = slot; break;
      case 'strategyImplementation': value = oldCore; break;
      case 'communityImplementation': value = oldCore; break;
      case 'registryCommunity': value = getAddress(network.PROXIES.REGISTRY_COMMUNITIES[0]); break;
      case 'registryFactory': value = factory; break;
      case 'getStrategyFacets': value = [[{ facetAddress: oldFacet, action: 0, functionSelectors: ['0x12345678'] }],
        '0x0000000000000000000000000000000000000000', '0x']; break;
      case 'getCommunityFacets': value = [[{ facetAddress: oldFacet, action: 0, functionSelectors: ['0x12345678'] }],
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
const temp = await mkdtemp(join(tmpdir(), 'shared-release-'));
const script = join(root, 'scripts/prepare-shared-release.mjs');
const common = ['--network', network.name, '--rpc', rpc];
const run = (args, mode = 'safe') => new Promise((resolve, reject) => {
  const family = args.includes('--family') ? [] : ['--family', 'strategy'];
  const executor = mode === 'safe' ? ['--safe', safe]
    : ['--executor', mode === 'contract' ? safe : deployer];
  const child = spawn(process.execPath, [script, ...common, ...executor, ...family, ...args]);
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (status) => resolve({ status, stderr }));
});

try {
  const oneFile = join(temp, 'release.json');
  const one = await run(['--out', oneFile, '--implementation', newCore, '--storage-reviewed',
    '--facet', `${oldFacet}:${newFacet}`,
    '--selector', `${newFacet}:0x0e8daf2f`, '--selector', `${newFacet}:0xf4a95471`]);
  assert.equal(one.status, 0, one.stderr);
  const onePayload = JSON.parse(await readFile(oneFile, 'utf8'));
  assert.equal(onePayload.meta.createdFromSafeAddress, safe);
  assert.equal(onePayload.transactions.length, 1);
  const release = decodeFunctionData({ abi, data: onePayload.transactions[0].data });
  assert.equal(release.functionName, 'setStrategyRelease');
  assert.equal(release.args[0][0].facetAddress, newFacet);
  assert.deepEqual(release.args[0][0].functionSelectors,
    ['0x12345678', '0x0e8daf2f', '0xf4a95471']);
  assert.equal(release.args[1], newCore);
  const duplicateSelector = await run(['--out', join(temp, 'duplicate-selector.json'),
    '--facet', `${oldFacet}:${newFacet}`, '--selector', `${newFacet}:0x12345678`]);
  assert.notEqual(duplicateSelector.status, 0);
  assert.match(duplicateSelector.stderr, /already routed/);

  const communityFile = join(temp, 'community.json');
  const community = await run(['--family', 'community', '--out', communityFile,
    '--implementation', newCore, '--storage-reviewed', '--facet', `${oldFacet}:${newFacet}`]);
  assert.equal(community.status, 0, community.stderr);
  const communityPayload = JSON.parse(await readFile(communityFile, 'utf8'));
  const communityRelease = decodeFunctionData({ abi, data: communityPayload.transactions[0].data });
  assert.equal(communityRelease.functionName, 'setCommunityRelease');
  assert.equal(communityRelease.args[0][0].facetAddress, newFacet);

  const dir = join(temp, 'router');
  const routed = await run(['--out', dir, '--router', newRouter, '--storage-reviewed', '--batch-size', '3']);
  assert.equal(routed.status, 0, routed.stderr);
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json') && !file.endsWith('manifest.json')).sort();
  assert.equal(files.length, 4);
  const payloads = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8'))));
  assert(payloads.every((item) => item.meta.createdFromSafeAddress === safe));
  assert.equal(decodeFunctionData({ abi, data: payloads[0].transactions[0].data }).functionName, 'setStrategyTemplate');
  assert.deepEqual(payloads.slice(1).map((item) => item.transactions.length), [3, 3, 2]);
  const stale = await run(['--out', dir, '--router', newRouter, '--storage-reviewed']);
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /Output directory must be empty/);
  for (const item of payloads.slice(1)) {
    for (const tx of item.transactions) {
      const decoded = decodeFunctionData({ abi, data: tx.data });
      assert.equal(decoded.functionName, 'upgradeTo');
      assert.equal(decoded.args[0], newRouter);
    }
  }

  const migrationProxy = getAddress(network.PROXIES.CV_STRATEGIES[0]);
  const migrationDir = join(temp, 'migration');
  const migrated = await run(['--out', migrationDir, '--implementation', newCore,
    '--storage-reviewed', '--migration', `${migrationProxy}:0x12345678`]);
  assert.equal(migrated.status, 0, migrated.stderr);
  const migrationFiles = (await readdir(migrationDir))
    .filter((file) => file.endsWith('.json') && !file.endsWith('manifest.json')).sort();
  assert.equal(migrationFiles.length, 2);
  const migrationPayload = JSON.parse(await readFile(join(migrationDir, migrationFiles[1]), 'utf8'));
  assert.equal(migrationPayload.transactions[0].to, migrationProxy);
  const migrationCall = decodeFunctionData({ abi, data: migrationPayload.transactions[0].data });
  assert.equal(migrationCall.functionName, 'runImplementationMigration');
  assert.equal(migrationCall.args[0], '0x12345678');

  proxyOwner = oldRouter;
  const rejected = await run(['--out', join(temp, 'invalid'), '--router', newRouter, '--storage-reviewed']);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /effective owner differs from selected executor/);

  factoryOwner = deployer;
  proxyOwner = deployer;
  const directFile = join(temp, 'direct-release.json');
  const direct = await run(['--out', directFile, '--facet', `${oldFacet}:${newFacet}`], 'deployer');
  assert.equal(direct.status, 0, direct.stderr);
  const directPayload = JSON.parse(await readFile(directFile, 'utf8'));
  assert.equal(directPayload.meta.createdFromOwnerAddress, deployer);
  assert.equal(directPayload.meta.createdFromSafeAddress, '');
  assert.equal(decodeFunctionData({ abi, data: directPayload.transactions[0].data }).functionName,
    'setStrategyRelease');
  const directDir = join(temp, 'direct-router');
  const directRouter = await run(['--out', directDir, '--router', newRouter, '--storage-reviewed'], 'deployer');
  assert.equal(directRouter.status, 0, directRouter.stderr);
  const directFiles = (await readdir(directDir)).filter((file) => file.endsWith('.json') && !file.endsWith('manifest.json'));
  const directPayloads = await Promise.all(directFiles.map(async (file) => JSON.parse(await readFile(join(directDir, file), 'utf8'))));
  assert(directPayloads.every((item) => item.meta.createdFromOwnerAddress === deployer
    && item.meta.createdFromSafeAddress === ''));
  grantedAccess = safe;
  const revoked = await run(['--out', join(temp, 'revoked.json'),
    '--facet', `${oldFacet}:${newFacet}`], 'deployer');
  assert.notEqual(revoked.status, 0);
  assert.match(revoked.stderr, /ProxyOwner upgradeAccess differs from --executor/);
  grantedAccess = deployer;
  proxyOwner = safe;
  const unresolved = await run(['--out', join(temp, 'unresolved.json'),
    '--facet', `${oldFacet}:${newFacet}`], 'deployer');
  assert.notEqual(unresolved.status, 0);
  assert.match(unresolved.stderr, /ProxyOwner effective owner differs from --executor/);
  proxyOwner = deployer;
  const wrongPath = await run(['--out', join(temp, 'wrong-owner.json'), '--facet', `${oldFacet}:${newFacet}`]);
  assert.notEqual(wrongPath.status, 0);
  assert.match(wrongPath.stderr, /Factory effective owner differs from selected executor/);
  const bothPaths = await run(['--out', join(temp, 'both.json'), '--executor', deployer,
    '--facet', `${oldFacet}:${newFacet}`]);
  assert.notEqual(bothPaths.status, 0);
  assert.match(bothPaths.stderr, /Specify exactly one of --safe or --executor/);
  const contractExecutor = await run(['--out', join(temp, 'contract-executor.json'),
    '--facet', `${oldFacet}:${newFacet}`], 'contract');
  assert.notEqual(contractExecutor.status, 0);
  assert.match(contractExecutor.stderr, /--executor must be an EOA/);
  process.stdout.write('Shared release Safe and direct-owner payload tests passed\n');
} finally {
  await rm(temp, { recursive: true, force: true });
  server.close();
}
