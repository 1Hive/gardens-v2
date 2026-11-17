#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const contractsDirectory = fileURLToPath(new URL('..', import.meta.url));
const candidate = '0x1111111111111111111111111111111111111111';
const current = '0x2222222222222222222222222222222222222222';
const factory = '0x3333333333333333333333333333333333333333';
const release = '0x4444444444444444444444444444444444444444';
const directory = await mkdtemp(join(tmpdir(), 'gardens-facet-sync-'));
const configPath = join(directory, 'networks.json');
const broadcastPath = join(directory, 'run-latest.json');
let mode = 'routed';
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const call = JSON.parse(Buffer.concat(chunks).toString());
  let result;
  if (call.method === 'eth_chainId') {
    result = { result: '0x2105' };
  } else if (call.method === 'eth_getTransactionCount') {
    result = { result: '0x0' };
  } else if (call.method === 'eth_getCode') {
    result = { result: '0x6001' };
  } else if (call.method === 'eth_call' && mode === 'legacy') {
    result = { error: { code: 3, message: 'execution reverted' } };
  } else if (call.method === 'eth_call' && mode === 'rpc-failure') {
    result = { error: { code: -32000, message: 'upstream unavailable' } };
  } else if (call.method === 'eth_call') {
    const address = call.params[0].data === '0xbd922b1c' ? release : current;
    result = { result: `0x${'0'.repeat(24)}${address.slice(2)}` };
  } else {
    result = { error: { code: -32601, message: `unexpected method ${call.method}` } };
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ jsonrpc: '2.0', id: call.id, ...result }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const original = { networks: [{ name: 'base', chainId: 8453, PROXIES: { REGISTRY_FACTORY: factory },
  FACETS: { COMMUNITY_POOL: current } }] };
await writeFile(broadcastPath, JSON.stringify({ transactions: [
  { contractName: 'CommunityPoolFacet', contractAddress: candidate },
] }));
const rpc = `http://127.0.0.1:${server.address().port}`;
const args = ['scripts/sync-refreshed-facets.js', '--network', 'base', '--chain-id', '8453',
  '--rpc-url', rpc, '--networks-json', configPath, '--broadcast-path', broadcastPath];
const guardArgs = ['scripts/assert-unrouted-factory.sh', 'base', rpc];
try {
  for (const scenario of [
    { mode: 'routed', expected: current },
    { mode: 'legacy', expected: candidate },
    { mode: 'rpc-failure', expected: current, fails: true },
  ]) {
    mode = scenario.mode;
    await writeFile(configPath, `${JSON.stringify(original)}\n`);
    if (scenario.fails) {
      await assert.rejects(run(process.execPath, args, { cwd: contractsDirectory }));
    } else {
      await run(process.execPath, args, { cwd: contractsDirectory });
    }
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    assert.equal(config.networks[0].FACETS.COMMUNITY_POOL, scenario.expected, scenario.mode);
    if (scenario.mode === 'legacy') {
      await run('bash', guardArgs, { cwd: contractsDirectory });
    } else {
      await assert.rejects(run('bash', guardArgs, { cwd: contractsDirectory }));
    }
  }
  process.stdout.write('Facet sync and legacy upgrade guard respect shared releases and RPC errors.\n');
} finally {
  server.close();
  await rm(directory, { recursive: true, force: true });
}
