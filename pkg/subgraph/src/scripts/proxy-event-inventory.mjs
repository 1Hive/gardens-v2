import { getAddress, keccak256, stringToBytes, toHex } from 'viem';

const signatures = {
  community: 'CommunityCreated(address)',
  pool: 'PoolCreated(uint256,address,address,address,(uint256,string))',
  communitySwitch: 'CommunityTemplateSet(address)',
  strategySwitch: 'StrategyTemplateSet(address)',
};

function topic(signature) { return keccak256(stringToBytes(signature)); }
function addressWord(word) { return getAddress(`0x${word.slice(-40)}`); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function etherscan(chainId, apiKey, params) {
  assert(apiKey, 'ETHERSCAN_API_KEY is required for event-backed proxy inventory');
  const url = new URL('https://api.etherscan.io/v2/api');
  for (const [key, value] of Object.entries({ chainid: chainId, apikey: apiKey, ...params })) {
    url.searchParams.set(key, String(value));
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url);
    assert(response.ok, `Etherscan HTTP ${response.status}`);
    const body = await response.json();
    if (body.status === '1') return body.result;
    if (body.message === 'No records found') return [];
    if (String(body.result).includes('rate limit') && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      continue;
    }
    throw new Error(`Etherscan ${body.message}: ${body.result}`);
  }
  throw new Error('Etherscan event query retries exhausted');
}

async function logs(chainId, apiKey, address, eventTopic, fromBlock, toBlock) {
  const result = [];
  for (let page = 1; ; page++) {
    const batch = await etherscan(chainId, apiKey, {
      module: 'logs', action: 'getLogs', address, topic0: eventTopic,
      fromBlock, toBlock, page, offset: 1000,
    });
    assert(Array.isArray(batch), 'Etherscan returned invalid logs');
    result.push(...batch);
    if (batch.length < 1000) return result;
  }
}

export async function getProxyEventInventory({ chainId, factory, toBlock, apiKey, client, switchTx, switchBlock, switchFamily, router }) {
  assert(client, 'A chain RPC client is required for recent event reconciliation');
  const creation = await etherscan(chainId, apiKey, {
    module: 'contract', action: 'getcontractcreation', contractaddresses: factory,
  });
  assert(Array.isArray(creation) && creation.length === 1 && creation[0].blockNumber,
    'Cannot determine factory creation block');
  const fromBlock = Number(creation[0].blockNumber);
  assert(fromBlock <= toBlock, 'Factory creation block is above inventory block');
  const created = await logs(chainId, apiKey, factory, topic(signatures.community), fromBlock, toBlock);
  const communities = created.map((log) => addressWord(log.data));
  assert(new Set(communities).size === communities.length, 'Duplicate CommunityCreated event');
  const strategies = [];
  for (const community of communities) {
    const pools = await logs(chainId, apiKey, community, topic(signatures.pool), fromBlock, toBlock);
    for (const log of pools) {
      assert(log.data.length >= 130, `Invalid PoolCreated data at ${community}`);
      strategies.push(addressWord(log.data.slice(66, 130)));
    }
  }
  assert(new Set(strategies).size === strategies.length, 'Duplicate PoolCreated strategy');
  const recentFrom = Math.max(fromBlock, toBlock - 100);
  const recentLogs = async (address, eventTopic) => client.request({ method: 'eth_getLogs', params: [{
    address, fromBlock: toHex(recentFrom), toBlock: toHex(toBlock), topics: [eventTopic],
  }] });
  const communitySet = new Set(communities.map((address) => address.toLowerCase()));
  for (const log of await recentLogs(factory, topic(signatures.community))) {
    assert(communitySet.has(addressWord(log.data).toLowerCase()),
      'Etherscan is missing a recent CommunityCreated event');
  }
  const strategySet = new Set(strategies.map((address) => address.toLowerCase()));
  for (const community of communities) {
    for (const log of await recentLogs(community, topic(signatures.pool))) {
      assert(strategySet.has(addressWord(log.data.slice(66, 130)).toLowerCase()),
        `Etherscan is missing a recent PoolCreated event for ${community}`);
    }
  }
  if (switchTx) {
    assert(switchFamily === 'community' || switchFamily === 'strategy', 'Invalid switch family');
    assert(Number.isSafeInteger(switchBlock) && switchBlock <= toBlock, 'Invalid switch block');
    const eventTopic = topic(signatures[switchFamily === 'community' ? 'communitySwitch' : 'strategySwitch']);
    const switchLogs = await logs(chainId, apiKey, factory, eventTopic, switchBlock, switchBlock);
    assert(switchLogs.some((log) => log.transactionHash.toLowerCase() === switchTx.toLowerCase()
      && log.topics.length > 1 && addressWord(log.topics[1]).toLowerCase() === router.toLowerCase()),
    'Etherscan has not indexed the template switch at the requested block');
  }
  return { factory: getAddress(factory), communities, strategies, fromBlock, queriedThroughBlock: toBlock,
    recentRpcFromBlock: recentFrom, source: 'Etherscan creation and pool logs reconciled with recent RPC logs' };
}
