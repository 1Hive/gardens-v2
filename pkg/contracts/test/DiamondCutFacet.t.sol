// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {DiamondCutFacet} from "../src/diamonds/facets/DiamondCutFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {
    LibDiamond,
    NotContractOwner
} from "../src/diamonds/libraries/LibDiamond.sol";

contract DiamondCutHarness {
    error FunctionDoesNotExist(bytes4 selector);

    uint256 public initValue;

    constructor(address _owner) {
        LibDiamond.setContractOwner(_owner);
    }

    function rawCut(IDiamond.FacetCut[] memory _diamondCut) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, address(0), "");
    }

    function owner() external view returns (address) {
        return LibDiamond.contractOwner();
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;

        if (facet == address(0)) {
            revert FunctionDoesNotExist(msg.sig);
        }

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}

contract SampleFacet {
    function ping() external pure returns (uint256) {
        return 7;
    }
}

contract InitFacet {
    uint256 public initValue;

    function record(uint256 value) external {
        initValue = value;
    }
}

contract DiamondCutFacetTest is Test {
    DiamondCutHarness private diamond;
    DiamondCutFacet private cutFacet;
    SampleFacet private sampleFacet;
    InitFacet private initFacet;

    address private owner;
    address private attacker;

    function setUp() public {
        owner = makeAddr("owner");
        attacker = makeAddr("attacker");

        diamond = new DiamondCutHarness(owner);
        cutFacet = new DiamondCutFacet();
        sampleFacet = new SampleFacet();
        initFacet = new InitFacet();

        vm.prank(owner);
        _installDiamondCutFacet();
    }

    function _installDiamondCutFacet() internal {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DiamondCutFacet.diamondCut.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(cutFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
        diamond.rawCut(cuts);
    }

    function _singleCut(address facetAddress, bytes4 selector) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facetAddress,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
    }

    function test_diamondCut_addsFacetAndRoutesCall() public {
        IDiamond.FacetCut[] memory cuts = _singleCut(address(sampleFacet), SampleFacet.ping.selector);

        vm.prank(owner);
        DiamondCutFacet(address(diamond)).diamondCut(cuts, address(0), "");

        assertEq(SampleFacet(address(diamond)).ping(), 7);
    }

    function test_diamondCut_revertsForNonOwner() public {
        IDiamond.FacetCut[] memory cuts = _singleCut(address(sampleFacet), SampleFacet.ping.selector);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, attacker, owner));
        DiamondCutFacet(address(diamond)).diamondCut(cuts, address(0), "");
    }

    function test_diamondCut_executesInitializerCall() public {
        IDiamond.FacetCut[] memory cuts = _singleCut(address(sampleFacet), SampleFacet.ping.selector);

        vm.prank(owner);
        DiamondCutFacet(address(diamond)).diamondCut(
            cuts,
            address(initFacet),
            abi.encodeWithSelector(InitFacet.record.selector, 42)
        );

        assertEq(diamond.initValue(), 42);
        assertEq(SampleFacet(address(diamond)).ping(), 7);
    }
}
