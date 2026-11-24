#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFunctionData, encodeFunctionResult, getAddress, parseAbi, toFunctionSelector } from 'viem';

const root = fileURLToPath(new URL('..', import.meta.url));
const network = JSON.parse(await readFile(join(root, 'config/networks.json'), 'utf8'))
  .networks.find((entry) => entry.name === 'opsepolia');
const script = join(root, 'scripts/prepare-streaming-escrow-release.mjs');
const factory = getAddress(network.ENVS.STREAMING_ESCROW_FACTORY);
const proxyOwner = getAddress(network.ENVS.PROXY_OWNER);
const candidate = getAddress('0x1000000000000000000000000000000000000001');
const current = getAddress('0x1000000000000000000000000000000000000002');
const escrowA = getAddress('0x1000000000000000000000000000000000000003');
const escrowB = getAddress('0x1000000000000000000000000000000000000004');
const executor = getAddress('0x1000000000000000000000000000000000000005');
const other = getAddress('0x1000000000000000000000000000000000000006');
const strategyA = getAddress('0x1000000000000000000000000000000000000007');
const strategyB = getAddress('0x1000000000000000000000000000000000000008');
const slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function owner() view returns (address)',
  'function upgradeAccess() view returns (address)',
  'function proxiableUUID() view returns (bytes32)',
  'function escrowImplementation() view returns (address)',
  'function escrowsLength() view returns (uint256)',
  'function escrows(uint256) view returns (address)',
  'function strategy() view returns (address)',
  'function setEscrowImplementation(address implementation)',
  'function upgradeTo(address implementation)',
  'function reinitializeV2Migrate()',
]);
const names = new Map(abi.filter((entry) => entry.type === 'function')
  .map((entry) => [toFunctionSelector(entry), entry.name]));
let wrongEscrowOwner = false;
let wrongChain = false;
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const { id, method, params = [] } = JSON.parse(Buffer.concat(chunks).toString());
  let result;
  if (method === 'eth_chainId') result = `0x${(wrongChain ? 1 : network.chainId).toString(16)}`;
  else if (method === 'eth_getCode') result = getAddress(params[0]) === executor ? '0x' : '0x6000';
  else if (method === 'eth_getStorageAt') {
    const target = getAddress(params[0]);
    const position = BigInt(params[1]);
    const value = position === BigInt(slot) ? current
      : target === escrowA && position === 105n ? strategyA
      : target === escrowB && position === 155n ? strategyB
      : getAddress('0x0000000000000000000000000000000000000000');
    result = `0x${'0'.repeat(24)}${value.slice(2).toLowerCase()}`;
  }
  else if (method === 'eth_call') {
    const name = names.get(params[0].data.slice(0, 10));
    const target = getAddress(params[0].to);
    let value;
    if (name === 'owner') value = target === escrowB && wrongEscrowOwner ? other : executor;
    else if (name === 'upgradeAccess') value = executor;
    else if (name === 'proxiableUUID') value = slot;
    else if (name === 'escrowImplementation') value = current;
    else if (name === 'strategy') value = target === escrowA ? strategyA : strategyB;
    else if (name === 'escrowsLength') value = 2n;
    else if (name === 'escrows') {
      const index = decodeFunctionData({ abi, data: params[0].data }).args[0];
      value = index === 0n ? escrowA : escrowB;
    } else throw new Error(`Unexpected call ${name} to ${target}`);
    result = encodeFunctionResult({ abi, functionName: name, result: value });
  } else throw new Error(`Unexpected RPC method ${method}`);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const rpc = `http://127.0.0.1:${server.address().port}`;
const directory = await mkdtemp(join(tmpdir(), 'gardens-escrow-payload-test-'));

function run(output) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, '--network', network.name,
      '--rpc', rpc, '--implementation', candidate, '--executor', executor, '--out', output],
    { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stderr }));
  });
}

try {
  const output = join(directory, 'payload.json');
  const success = await run(output);
  assert.equal(success.status, 0, success.stderr);
  const payload = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(payload.meta.createdFromOwnerAddress, executor);
  assert.equal(payload.meta.createdFromSafeAddress, '');
  assert.deepEqual(payload.transactions.map((item) => item.to), [factory, escrowA, escrowA, escrowB]);
  assert.deepEqual(payload.transactions.map((item) => decodeFunctionData({ abi, data: item.data }).functionName),
    ['setEscrowImplementation', 'upgradeTo', 'reinitializeV2Migrate', 'upgradeTo']);
  assert(payload.transactions.filter((item) => decodeFunctionData({ abi, data: item.data }).functionName !== 'reinitializeV2Migrate')
    .every((item) => decodeFunctionData({ abi, data: item.data }).args[0] === candidate));

  wrongEscrowOwner = true;
  const ownerMismatch = await run(join(directory, 'owner-mismatch.json'));
  assert.notEqual(ownerMismatch.status, 0);
  assert.match(ownerMismatch.stderr, /effective owner differs/);
  wrongEscrowOwner = false;

  wrongChain = true;
  const chainMismatch = await run(join(directory, 'chain-mismatch.json'));
  assert.notEqual(chainMismatch.status, 0);
  assert.match(chainMismatch.stderr, /chain ID differs/);
  console.log('Escrow release generator checked template, instance order, owner, and chain');
} finally {
  server.close();
  await rm(directory, { recursive: true, force: true });
}
