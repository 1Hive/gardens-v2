#!/usr/bin/env python3
import argparse
import json
import subprocess
import time
from pathlib import Path
from eth_abi import encode
from eth_utils import keccak, to_checksum_address

ROOT = Path(__file__).resolve().parents[3]
CONFIG = ROOT / 'pkg/contracts/config/networks.json'
OUT = ROOT / 'pkg/contracts/transaction-builder'
SAFE = '0x9a17De1f0caD0c592F656410997E4B685d339029'
CREATE2 = '0x4e59b44847b379578588920cA78FbF26c0B4956C'
ZERO = '0x0000000000000000000000000000000000000000'
DEFAULT_SALT_VERSION = '98eb746'
ARBITRUM_STREAMING_DECIMAL_STRATEGY = '0x6f29c8e529df6ce316299e9df90bf3b11a65458b'

ARTIFACTS = {
    'CVStrategy': ROOT/'pkg/contracts/out/CVStrategy.sol/CVStrategy.json',
    'CVAdminFacet': ROOT/'pkg/contracts/out/CVAdminFacet.sol/CVAdminFacet.json',
    'CVAllocationFacet': ROOT/'pkg/contracts/out/CVAllocationFacet.sol/CVAllocationFacet.json',
    'CVStreamingFacet': ROOT/'pkg/contracts/out/CVStreamingFacet.sol/CVStreamingFacet.json',
}

def selector(sig: str) -> bytes:
    return keccak(text=sig)[:4]

def hex_selector(sig: str) -> str:
    return '0x' + selector(sig).hex()

def call(sig: str, types: list[str], values: list) -> str:
    return '0x' + (selector(sig) + encode(types, values)).hex()

def link_bytecode(artifact_path: Path, libraries: dict[str, str]) -> str:
    art = json.loads(artifact_path.read_text())
    bytecode = art['bytecode']['object']
    if not bytecode.startswith('0x'):
        bytecode = '0x' + bytecode
    chars = list(bytecode[2:])
    for file_refs in art['bytecode'].get('linkReferences', {}).values():
        for lib_name, refs in file_refs.items():
            if lib_name not in libraries:
                raise RuntimeError(f'missing link for {lib_name} in {artifact_path}')
            addr = libraries[lib_name].lower().removeprefix('0x')
            if len(addr) != 40:
                raise RuntimeError(f'bad address for {lib_name}: {libraries[lib_name]}')
            for ref in refs:
                start = ref['start'] * 2
                length = ref['length'] * 2
                chars[start:start+length] = list(addr)
    linked = '0x' + ''.join(chars)
    if '__' in linked:
        raise RuntimeError(f'unresolved link in {artifact_path}')
    return linked

def create2_addr(init_code_hex: str, salt: bytes) -> str:
    init_hash = keccak(bytes.fromhex(init_code_hex.removeprefix('0x')))
    raw = keccak(b'\xff' + bytes.fromhex(CREATE2[2:]) + salt + init_hash)[12:]
    return to_checksum_address(raw)

def deploy_data(init_code_hex: str, salt: bytes) -> str:
    return '0x' + salt.hex() + init_code_hex.removeprefix('0x')

def tx(to, data, name='', inputs=None):
    return {
        'to': to_checksum_address(to),
        'value': '0',
        'data': data,
        'operation': 0,
        'contractMethod': {'inputs': inputs or [], 'name': name, 'payable': False},
        'contractInputsValues': {},
    }

def cut(addr, sels):
    return (to_checksum_address(addr), 3, [bytes.fromhex(s.removeprefix('0x')) for s in sels])

def full_strategy_cuts(net, new_addrs):
    facets = net['FACETS']
    loupe = facets.get('STRATEGY_DIAMOND_LOUPE') or facets['DIAMOND_LOUPE']
    return [
        cut(loupe, [
            hex_selector('facets()'),
            hex_selector('facetFunctionSelectors(address)'),
            hex_selector('facetAddresses()'),
            hex_selector('facetAddress(bytes4)'),
            hex_selector('supportsInterface(bytes4)'),
        ]),
        cut(new_addrs['CVAdminFacet'], [
            hex_selector('setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)'),
            hex_selector('setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address,uint256)'),
            hex_selector('connectSuperfluidGDA(address)'),
            hex_selector('disconnectSuperfluidGDA(address)'),
            hex_selector('setVotingPowerRegistry(address)'),
        ]),
        cut(new_addrs['CVAllocationFacet'], [
            hex_selector('allocate(bytes,address)'),
            hex_selector('distribute(address[],bytes,address)'),
            hex_selector('getPoolAmount()'),
        ]),
        cut(facets['CV_DISPUTE'], [
            hex_selector('disputeProposal(uint256,string,bytes)'),
            hex_selector('rule(uint256,uint256)'),
        ]),
        cut(facets['CV_PAUSE'], [
            hex_selector('setPauseController(address)'),
            hex_selector('setPauseFacet(address)'),
            hex_selector('pauseFacet()'),
            hex_selector('pauseController()'),
            hex_selector('pause(uint256)'),
            hex_selector('pause(bytes4,uint256)'),
            hex_selector('unpause()'),
            hex_selector('unpause(bytes4)'),
            hex_selector('isPaused()'),
            hex_selector('isPaused(bytes4)'),
            hex_selector('pausedUntil()'),
            hex_selector('pausedSelectorUntil(bytes4)'),
        ]),
        cut(facets['CV_POWER'], [
            hex_selector('activatePoints()'),
            hex_selector('increasePower(address,uint256)'),
            hex_selector('decreasePower(address,uint256)'),
            hex_selector('deactivatePoints()'),
            hex_selector('deactivatePoints(address)'),
        ]),
        cut(facets['CV_PROPOSAL'], [
            hex_selector('registerRecipient(bytes,address)'),
            hex_selector('cancelProposal(uint256)'),
            hex_selector('editProposal(uint256,(uint256,string),address,uint256)'),
        ]),
        cut(facets['CV_SYNC_POWER'], [
            hex_selector('setAuthorizedSyncCaller(address,bool)'),
            hex_selector('isAuthorizedSyncCaller(address)'),
            hex_selector('syncPower(address)'),
            hex_selector('batchSyncPower(address[])'),
        ]),
        cut(new_addrs['CVStreamingFacet'], [
            hex_selector('rebalance()'),
            hex_selector('stopEscrowStream(address)'),
            hex_selector('setAuthorizedRebalanceCaller(address,bool)'),
            hex_selector('isAuthorizedRebalanceCaller(address)'),
            hex_selector('wrapIfNeeded()'),
        ]),
    ]

def changed_strategy_cuts(new_addrs):
    return [
        cut(new_addrs['CVAdminFacet'], [
            hex_selector('setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)'),
            hex_selector('setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address,uint256)'),
            hex_selector('connectSuperfluidGDA(address)'),
            hex_selector('disconnectSuperfluidGDA(address)'),
            hex_selector('setVotingPowerRegistry(address)'),
        ]),
        cut(new_addrs['CVAllocationFacet'], [
            hex_selector('allocate(bytes,address)'),
            hex_selector('distribute(address[],bytes,address)'),
            hex_selector('getPoolAmount()'),
        ]),
        cut(new_addrs['CVPowerFacet'], [
            hex_selector('activatePoints()'),
            hex_selector('increasePower(address,uint256)'),
            hex_selector('decreasePower(address,uint256)'),
            hex_selector('deactivatePoints()'),
            hex_selector('deactivatePoints(address)'),
        ]),
        cut(new_addrs['CVProposalFacet'], [
            hex_selector('registerRecipient(bytes,address)'),
            hex_selector('cancelProposal(uint256)'),
            hex_selector('editProposal(uint256,(uint256,string),address,uint256)'),
        ]),
        cut(new_addrs['CVStreamingFacet'], [
            hex_selector('rebalance()'),
            hex_selector('stopEscrowStream(address)'),
            hex_selector('setAuthorizedRebalanceCaller(address,bool)'),
            hex_selector('isAuthorizedRebalanceCaller(address)'),
            hex_selector('wrapIfNeeded()'),
        ]),
    ]

def bundled_transactions(service_name: str) -> list[dict]:
    if service_name not in {'arbitrum', 'optimism'}:
        return []

    path = OUT / f'{service_name}-streaming-escrow-upgrade-payload.json'
    if not path.exists():
        raise RuntimeError(f'missing bundled streaming escrow payload: {path}')

    payload = json.loads(path.read_text())
    return payload.get('transactions', [])

def main():
    parser = argparse.ArgumentParser(description='Generate Safe payloads for the CVStrategy decimal-scaling upgrade.')
    parser.add_argument('--salt-version', default=DEFAULT_SALT_VERSION, help='Deprecated: kept for manifest compatibility. Payloads use configured implementation/facet addresses from networks.json.')
    args = parser.parse_args()
    salt_version = args.salt_version
    cfg = json.loads(CONFIG.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'safe': SAFE, 'create2Factory': CREATE2, 'saltVersion': salt_version, 'chains': {}}
    for net in cfg['networks']:
        if net.get('no-safe') is True:
            continue
        name = net['name']
        service_name = 'mainnet' if name == 'ethereum' else name
        new_addrs = {
            'CVStrategy': to_checksum_address(net['IMPLEMENTATIONS']['CV_STRATEGY']),
            'CVAdminFacet': to_checksum_address(net['FACETS']['CV_ADMIN']),
            'CVAllocationFacet': to_checksum_address(net['FACETS']['CV_ALLOCATION']),
            'CVPowerFacet': to_checksum_address(net['FACETS']['CV_POWER']),
            'CVProposalFacet': to_checksum_address(net['FACETS']['CV_PROPOSAL']),
            'CVStreamingFacet': to_checksum_address(net['FACETS']['CV_STREAMING']),
        }
        full_cuts = full_strategy_cuts(net, new_addrs)
        changed_cuts = changed_strategy_cuts(new_addrs)
        strategy_init = to_checksum_address(net['INITS']['CV_STRATEGY_DIAMOND_INIT'])
        init_calldata = '0x' + selector('init()').hex()
        txs = bundled_transactions(service_name)
        factory = net['PROXIES']['REGISTRY_FACTORY']
        txs.append(tx(factory, call('setStrategyTemplate(address)', ['address'], [new_addrs['CVStrategy']]), 'setStrategyTemplate'))
        txs.append(tx(factory, call('setStrategyFacets((address,uint8,bytes4[])[],address,bytes)', ['(address,uint8,bytes4[])[]','address','bytes'], [full_cuts, strategy_init, bytes.fromhex(init_calldata[2:])]), 'setStrategyFacets'))
        diamond_cut_data = call('diamondCut((address,uint8,bytes4[])[],address,bytes)', ['(address,uint8,bytes4[])[]','address','bytes'], [changed_cuts, ZERO, b''])
        upgrade_data = call('upgradeTo(address)', ['address'], [new_addrs['CVStrategy']])
        live_strategy_upgrades = []
        for strategy in net['PROXIES'].get('CV_STRATEGIES', []):
            if service_name != 'arbitrum' or strategy.lower() != ARBITRUM_STREAMING_DECIMAL_STRATEGY:
                continue
            live_strategy_upgrades.append(to_checksum_address(strategy))
            txs.append(tx(strategy, upgrade_data, 'upgradeTo'))
            txs.append(tx(strategy, diamond_cut_data, 'diamondCut'))
        payload = {
            'version': '1.0',
            'chainId': str(net['chainId']),
            'createdAt': int(time.time()*1000),
            'meta': {
                'name': 'CVStrategy decimal scaling upgrade',
                'description': 'Uses the configured decimal-scaling CVStrategy implementation/facets and updates RegistryFactory strategy template/facet cuts for new strategies. Live strategy upgrades are limited to the eligible Arbitrum streaming pool when present.',
                'txBuilderVersion': '1.18.0',
                'createdFromSafeAddress': SAFE,
                'createdFromOwnerAddress': '0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD',
                'hash': net.get('hash',''),
            },
            'transactions': txs,
        }
        path = OUT / f'{service_name}-payload.json'
        path.write_text(json.dumps(payload, indent=2) + '\n')
        manifest['chains'][service_name] = {
            'chainId': net['chainId'],
            'sourceNetworkName': name,
            'payload': f'pkg/contracts/transaction-builder/{service_name}-payload.json',
            'configuredContracts': new_addrs,
            'txCount': len(txs),
            'bundledStreamingEscrowTxCount': len(bundled_transactions(service_name)),
            'liveStrategyUpgrades': live_strategy_upgrades,
            'strategyProxyCount': len(live_strategy_upgrades),
            'registryFactory': to_checksum_address(factory),
            'strategyInit': strategy_init,
        }
        print(service_name, 'txs', len(txs), new_addrs)
    (OUT/'decimal-scaling-upgrade-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
