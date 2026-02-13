// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {OwnershipFacet} from "../src/diamonds/facets/OwnershipFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {LibDiamond, NotContractOwner} from "../src/diamonds/libraries/LibDiamond.sol";

contract TestDiamond {
    error FunctionDoesNotExist(bytes4 selector);

    constructor(address _owner) {
        LibDiamond.setContractOwner(_owner);
    }

    function diamondCut(IDiamond.FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
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

contract OwnershipFacetTest is Test {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    OwnershipFacet private ownershipFacet;
    TestDiamond private diamond;
    address private owner;
    address private newOwner;
    address private attacker;

    function setUp() public {
        owner = makeAddr("owner");
        newOwner = makeAddr("newOwner");
        attacker = makeAddr("attacker");

        ownershipFacet = new OwnershipFacet();
        diamond = new TestDiamond(owner);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = OwnershipFacet.transferOwnership.selector;
        selectors[1] = OwnershipFacet.owner.selector;

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(ownershipFacet), action: IDiamond.FacetCutAction.Add, functionSelectors: selectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_ownerReturnsContractOwner() public {
        assertEq(OwnershipFacet(address(diamond)).owner(), owner);
    }

    function test_transferOwnership_updatesOwnerAndEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, newOwner);

        vm.prank(owner);
        OwnershipFacet(address(diamond)).transferOwnership(newOwner);

        assertEq(OwnershipFacet(address(diamond)).owner(), newOwner);
    }

    function test_transferOwnership_revertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, attacker, owner));
        OwnershipFacet(address(diamond)).transferOwnership(newOwner);
    }

    function test_transferOwnership_updatesAccessControl() public {
        address thirdOwner = makeAddr("thirdOwner");

        vm.prank(owner);
        OwnershipFacet(address(diamond)).transferOwnership(newOwner);

        OwnershipFacet replacementFacet = new OwnershipFacet();
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = OwnershipFacet.owner.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(replacementFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, owner, newOwner));
        diamond.diamondCut(cuts, address(0), "");

        vm.prank(newOwner);
        diamond.diamondCut(cuts, address(0), "");

        vm.prank(newOwner);
        OwnershipFacet(address(diamond)).transferOwnership(thirdOwner);

        assertEq(OwnershipFacet(address(diamond)).owner(), thirdOwner);
    }
}
