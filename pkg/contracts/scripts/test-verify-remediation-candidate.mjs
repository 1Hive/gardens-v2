#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const contractsRoot = fileURLToPath(new URL('..', import.meta.url));
const verifier = join(contractsRoot, 'scripts/verify-remediation-candidate.mjs');
const library = '0x1f86D4D26b36423750653Bc903c3Ffb207981450';
const strategy = '0x1000000000000000000000000000000000000002';
const oldStrategy = '0x1000000000000000000000000000000000000003';
const power = '0x1000000000000000000000000000000000000005';
const powerLibrary = '0xB07d76F6001Cc62739d39cb0C5E9c58E08230486';
const tx = `0x${'a'.repeat(64)}`;
const powerTx = `0x${'c'.repeat(64)}`;

function splice(bytecode, start, length, value) {
  const at = 2 + start * 2;
  return bytecode.slice(0, at) + value.slice(2).toLowerCase() + bytecode.slice(at + length * 2);
}

async function deployedCode(contract, address) {
  const artifact = JSON.parse(await readFile(
    join(contractsRoot, 'out', `${contract}.sol`, `${contract}.json`), 'utf8',
  ));
  let code = artifact.deployedBytecode.object.toLowerCase();
  for (const libraries of Object.values(artifact.deployedBytecode.linkReferences ?? {})) {
    for (const [name, refs] of Object.entries(libraries)) {
      for (const ref of refs) code = splice(code, ref.start, ref.length,
        name === 'PowerManagementUtils' ? powerLibrary : library);
    }
  }
  if (contract === 'ConvictionsUtils' && code.startsWith(`0x73${'0'.repeat(40)}`)) {
    code = splice(code, 1, 20, address);
  }
  return code;
}

const libraryCode = await deployedCode('ConvictionsUtils', library);
const strategyCode = await deployedCode('CVStrategy', strategy);
const powerCode = await deployedCode('CVPowerFacet', power);
let chainId = 11155420;
let receiptStatus = '0x1';
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const { id, method, params = [] } = JSON.parse(Buffer.concat(chunks).toString());
  let result;
  if (method === 'eth_chainId') result = `0x${chainId.toString(16)}`;
  else if (method === 'eth_getTransactionReceipt') result = {
    status: receiptStatus,
    contractAddress: params[0] === tx ? strategy : params[0] === powerTx ? power : library,
    blockNumber: '0x64',
  };
  else if (method === 'eth_getCode') {
    const address = params[0].toLowerCase();
    result = address === library.toLowerCase() ? libraryCode
      : address === strategy.toLowerCase() ? strategyCode
        : address === power.toLowerCase() ? powerCode
          : address === powerLibrary.toLowerCase() ? '0x6000' : '0x';
  } else throw new Error(`Unexpected RPC method ${method}`);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const rpc = `http://127.0.0.1:${server.address().port}`;
const directory = await mkdtemp(join(tmpdir(), 'gardens-candidate-test-'));
const config = join(directory, 'networks.json');
const manifestDir = join(directory, 'manifest');
await writeFile(config, JSON.stringify({ networks: [{
  name: 'opsepolia', chainId,
  IMPLEMENTATIONS: { CV_STRATEGY: oldStrategy }, FACETS: {},
}] }));

function invoke(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

function run(extra = []) {
  return invoke([verifier, '--network', 'opsepolia', '--rpc', rpc,
    '--contract', 'CVStrategy', '--address', strategy, '--tx', tx,
    '--library', library, '--config', config, '--manifest-dir', manifestDir, ...extra]);
}

try {
  const success = await run(['--record', 'true']);
  assert.equal(success.status, 0, success.stderr);
  const updated = JSON.parse(await readFile(config, 'utf8')).networks[0];
  assert.equal(updated.CANDIDATES.CV_STRATEGY, strategy);
  assert.equal(updated.IMPLEMENTATIONS.CV_STRATEGY, oldStrategy);
  const manifest = JSON.parse(await readFile(join(manifestDir, 'opsepolia.json'), 'utf8'));
  assert.equal(manifest.candidates.CV_STRATEGY.linkedLibrary, library);
  assert.equal(manifest.candidates.CV_STRATEGY.linkCount > 0, true);

  const wrongLibrary = await run(['--library', '0x1000000000000000000000000000000000000004']);
  assert.notEqual(wrongLibrary.status, 0);
  assert.match(wrongLibrary.stderr, /Linked library .* has no code|links .* expected/);

  const verifiedPower = await invoke([verifier, '--network', 'opsepolia', '--rpc', rpc,
    '--contract', 'CVPowerFacet', '--address', power, '--tx', powerTx,
    '--library', library, '--power-library', powerLibrary, '--config', config]);
  assert.equal(verifiedPower.status, 0, verifiedPower.stderr);
  assert.equal(JSON.parse(verifiedPower.stdout).linkedPowerLibrary, powerLibrary);
  const wrongPower = await invoke([verifier, '--network', 'opsepolia', '--rpc', rpc,
    '--contract', 'CVPowerFacet', '--address', power, '--tx', powerTx,
    '--library', library, '--power-library', library, '--config', config]);
  assert.notEqual(wrongPower.status, 0);
  assert.match(wrongPower.stderr, /links .* expected|does not embed/);

  chainId = 1;
  const wrongChain = await run();
  assert.notEqual(wrongChain.status, 0);
  assert.match(wrongChain.stderr, /RPC chain ID/);
  chainId = 11155420;

  receiptStatus = '0x0';
  const failedReceipt = await run();
  assert.notEqual(failedReceipt.status, 0);
  assert.match(failedReceipt.stderr, /unsuccessful/);
  receiptStatus = '0x1';

  const libraryReceipt = `0x${'b'.repeat(64)}`;
  const libraryResult = await invoke([verifier, '--network', 'opsepolia',
    '--rpc', rpc, '--contract', 'ConvictionsUtils', '--address', library,
    '--tx', libraryReceipt, '--config', config]);
  assert.equal(libraryResult.status, 0, libraryResult.stderr);
  console.log('Candidate receipt, chain, runtime, library link, and active-config checks passed');
} finally {
  server.close();
  await rm(directory, { recursive: true, force: true });
}
