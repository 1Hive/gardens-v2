#!/usr/bin/env node
// Compare a fork after applying the ordered remediation payloads with live pre-release state.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createPublicClient, getAddress, http, parseAbi, zeroAddress } from 'viem';

const { values } = parseArgs({ options: {
  network: { type: 'string' }, 'baseline-rpc': { type: 'string' }, 'fork-rpc': { type: 'string' },
} });
const configPath = fileURLToPath(new URL('../config/networks.json', import.meta.url));
const slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const abi = parseAbi([
  'function owner() view returns (address)',
  'function registryCommunity() view returns (address)',
  'function profileId() view returns (bytes32)',
  'function strategy() view returns (address)',
  'function superToken() view returns (address)',
  'function pool() view returns (address)',
  'function host() view returns (address)',
  'function gda() view returns (address)',
  'function beneficiary() view returns (address)',
  'function disputed() view returns (bool)',
  'function storageSchemaVersion() view returns (uint8)',
  'function strategyImplementation() view returns (address)',
  'function communityImplementation() view returns (address)',
  'function getStrategyFacets() view returns ((address facetAddress, uint8 action, bytes4[] functionSelectors)[] facetCuts, address init, bytes initCalldata)',
  'function getCommunityFacets() view returns ((address facetAddress, uint8 action, bytes4[] functionSelectors)[] facetCuts, address init, bytes initCalldata)',
  'function strategyFacet(bytes4 selector) view returns (address)',
  'function pendingCollateralClaim(uint256 proposalId, address fromUser, address toUser) view returns (uint256)',
  'function escrowImplementation() view returns (address)',
  'function escrowsLength() view returns (uint256)',
  'function escrows(uint256) view returns (address)',
]);

function assert(ok, message) { if (!ok) throw new Error(message); }
function same(a, b) { return String(a).toLowerCase() === String(b).toLowerCase(); }
function address(value) { return getAddress(value); }
async function read(client, target, functionName, args = []) {
  return client.readContract({ address: target, abi, functionName, args });
}
function cutsMap(cuts) {
  const selectors = new Map();
  for (const cut of cuts) {
    for (const selector of cut.functionSelectors) {
      assert(!selectors.has(selector), `Duplicate selector ${selector}`);
      selectors.set(selector, address(cut.facetAddress));
    }
  }
  return selectors;
}
async function compareProxy(live, fork, proxy, kind, expectedSlot) {
  const field = kind === 'strategy' ? 'registryCommunity' : kind === 'community' ? 'profileId' : 'strategy';
  const [liveOwner, forkOwner, liveValue, forkValue, forkSlot] = await Promise.all([
    read(live, proxy, 'owner'), read(fork, proxy, 'owner'),
    read(live, proxy, field), read(fork, proxy, field), fork.getStorageAt({ address: proxy, slot }),
  ]);
  assert(same(liveOwner, forkOwner), `${kind} ${proxy} owner changed`);
  assert(same(liveValue, forkValue), `${kind} ${proxy} ${field} changed`);
  assert(same(`0x${forkSlot.slice(-40)}`, expectedSlot), `${kind} ${proxy} implementation slot mismatch`);
}

async function main() {
  assert(values.network && values['baseline-rpc'] && values['fork-rpc'], 'Set --network, --baseline-rpc, --fork-rpc');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const network = config.networks.find((item) => item.name === values.network);
  assert(network, `Unknown network ${values.network}`);
  const live = createPublicClient({ transport: http(values['baseline-rpc']) });
  const fork = createPublicClient({ transport: http(values['fork-rpc']) });
  assert(await live.getChainId() === network.chainId, 'Baseline RPC chain mismatch');
  assert(await fork.getChainId() === network.chainId, 'Fork RPC chain mismatch');
  const factory = address(network.PROXIES.REGISTRY_FACTORY);
  const candidates = network.CANDIDATES;
  assert(candidates?.CV_STRATEGY && candidates?.REGISTRY_COMMUNITY && candidates?.CV_DISPUTE,
    'Missing required candidate core or dispute facet');
  assert(same(await read(fork, factory, 'strategyImplementation'), candidates.CV_STRATEGY), 'Strategy core not activated');
  assert(same(await read(fork, factory, 'communityImplementation'), candidates.REGISTRY_COMMUNITY), 'Community core not activated');

  const [oldStrategyCuts] = await read(live, factory, 'getStrategyFacets');
  const [newStrategyCuts] = await read(fork, factory, 'getStrategyFacets');
  const oldStrategy = cutsMap(oldStrategyCuts);
  const newStrategy = cutsMap(newStrategyCuts);
  for (const [selector, oldFacet] of oldStrategy) {
    const key = Object.keys(network.FACETS).find((item) => same(network.FACETS[item], oldFacet));
    const expected = key && candidates[key] ? candidates[key] : oldFacet;
    assert(same(newStrategy.get(selector), expected), `Strategy selector ${selector} routes incorrectly`);
  }
  for (const selector of ['0x0e8daf2f', '0xf4a95471']) {
    assert(!oldStrategy.has(selector), `New selector ${selector} was already live`);
    assert(same(newStrategy.get(selector), candidates.CV_DISPUTE), `New selector ${selector} is not routed`);
    assert(same(await read(fork, factory, 'strategyFacet', [selector]), candidates.CV_DISPUTE),
      `Factory does not route ${selector}`);
  }
  assert(newStrategy.size === oldStrategy.size + 2, 'Unexpected strategy selector set change');
  const [oldCommunityCuts] = await read(live, factory, 'getCommunityFacets');
  const [newCommunityCuts] = await read(fork, factory, 'getCommunityFacets');
  const oldCommunity = cutsMap(oldCommunityCuts);
  const newCommunity = cutsMap(newCommunityCuts);
  assert(newCommunity.size === oldCommunity.size, 'Community selector count changed');
  for (const [selector, oldFacet] of oldCommunity) {
    assert(same(newCommunity.get(selector), oldFacet), `Community selector ${selector} changed`);
  }

  for (const [kind, proxies] of [
    ['strategy', network.PROXIES.CV_STRATEGIES], ['community', network.PROXIES.REGISTRY_COMMUNITIES],
  ]) {
    assert(proxies.length > 0, `No ${kind} proxies configured`);
    const samples = [...new Set([proxies[0], proxies.at(-1)])].map(address);
    for (const proxy of samples) {
      const liveSlot = await live.getStorageAt({ address: proxy, slot });
      await compareProxy(live, fork, proxy, kind, `0x${liveSlot.slice(-40)}`);
    }
    console.log(`${kind}: ${samples.length} representative proxies retained owner, state, and router slot`);
  }
  const firstStrategy = address(network.PROXIES.CV_STRATEGIES[0]);
  const pending = await read(fork, firstStrategy, 'pendingCollateralClaim', [0n, zeroAddress, zeroAddress]);
  assert(pending === 0n, 'New pendingCollateralClaim did not return an empty claim');

  const escrowFactory = network.ENVS.STREAMING_ESCROW_FACTORY;
  if (candidates.STREAMING_ESCROW && escrowFactory && escrowFactory !== zeroAddress) {
    const escrowAddress = address(escrowFactory);
    assert(same(await read(fork, escrowAddress, 'escrowImplementation'), candidates.STREAMING_ESCROW),
      'Escrow template was not switched');
    const beforeCount = await read(live, escrowAddress, 'escrowsLength');
    const afterCount = await read(fork, escrowAddress, 'escrowsLength');
    assert(beforeCount === afterCount, 'Escrow inventory changed in fork rehearsal');
    for (let index = 0n; index < beforeCount; index++) {
      const proxy = await read(live, escrowAddress, 'escrows', [index]);
      assert(same(await read(fork, escrowAddress, 'escrows', [index]), proxy), `Escrow ${index} changed`);
      await compareProxy(live, fork, proxy, 'escrow', candidates.STREAMING_ESCROW);
      for (const field of ['superToken', 'pool', 'host', 'gda', 'beneficiary', 'disputed']) {
        assert(same(await read(live, proxy, field), await read(fork, proxy, field)),
          `Escrow ${proxy} ${field} changed`);
      }
      assert(await read(fork, proxy, 'storageSchemaVersion') === 2, `Escrow ${proxy} is not schema v2`);
    }
    console.log(`escrow: template and ${beforeCount} existing instances match candidate; owner and strategy retained`);
  }
  console.log(`${network.name}: candidate cores, selector routing, proxy state, and escrow checks passed`);
}

main().catch((error) => {
  console.error(String(error.shortMessage ?? error.message).replaceAll(/https?:\/\/\S+/g, '<RPC_URL>'));
  process.exitCode = 1;
});
