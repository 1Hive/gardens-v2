// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";

contract DiamondLoupeHarness {
    error FunctionDoesNotExist(bytes4 selector);

    constructor(address _owner) {
        LibDiamond.setContractOwner(_owner);
    }

    function diamondCut(IDiamond.FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }

    function setInterface(bytes4 interfaceId, bool supported) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondStorage().supportedInterfaces[interfaceId] = supported;
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

contract TestFacetOne {
    function foo() external pure returns (uint256) {
        return 1;
    }

    function baz() external pure returns (uint256) {
        return 2;
    }
}

contract TestFacetTwo {
    function qux() external pure returns (uint256) {
        return 3;
    }

    function bar() external pure returns (uint256) {
        return 4;
    }
}

contract DiamondLoupeFacetTest is Test {
    DiamondLoupeHarness private diamond;
    DiamondLoupeFacet private loupeFacet;
    TestFacetOne private facetOne;
    TestFacetTwo private facetTwo;
    address private owner;
    address private unknownFacet;

    function setUp() public {
        owner = makeAddr("owner");
        diamond = new DiamondLoupeHarness(owner);
        loupeFacet = new DiamondLoupeFacet();
        facetOne = new TestFacetOne();
        facetTwo = new TestFacetTwo();
        unknownFacet = makeAddr("unknownFacet");

        vm.startPrank(owner);
        _addLoupeFacet();
        _addFacet(address(facetOne), _selectorsForFacetOne());
        _addFacet(address(facetTwo), _selectorsForFacetTwo());
        vm.stopPrank();
    }

    function _addLoupeFacet() internal {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = DiamondLoupeFacet.facets.selector;
        selectors[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        selectors[2] = DiamondLoupeFacet.facetAddresses.selector;
        selectors[3] = DiamondLoupeFacet.facetAddress.selector;
        selectors[4] = DiamondLoupeFacet.supportsInterface.selector;
        cuts[0] =
            IDiamond.FacetCut({facetAddress: address(loupeFacet), action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
        diamond.diamondCut(cuts, address(0), "");
    }

    function _selectorsForFacetOne() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = TestFacetOne.foo.selector;
        selectors[1] = TestFacetOne.baz.selector;
    }

    function _selectorsForFacetTwo() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = TestFacetTwo.qux.selector;
        selectors[1] = TestFacetTwo.bar.selector;
    }

    function _addFacet(address facetAddress, bytes4[] memory selectors) internal {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facetAddress, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_facets_returnsAllFacetsAndSelectors() public view {
        IDiamondLoupe.Facet[] memory response = DiamondLoupeFacet(address(diamond)).facets();

        assertEq(response.length, 3);

        assertEq(response[0].facetAddress, address(loupeFacet));
        assertEq(response[0].functionSelectors.length, 5);
        assertEq(response[0].functionSelectors[0], DiamondLoupeFacet.facets.selector);
        assertEq(response[0].functionSelectors[1], DiamondLoupeFacet.facetFunctionSelectors.selector);
        assertEq(response[0].functionSelectors[2], DiamondLoupeFacet.facetAddresses.selector);
        assertEq(response[0].functionSelectors[3], DiamondLoupeFacet.facetAddress.selector);
        assertEq(response[0].functionSelectors[4], DiamondLoupeFacet.supportsInterface.selector);

        assertEq(response[1].facetAddress, address(facetOne));
        assertEq(response[1].functionSelectors.length, 2);
        assertEq(response[1].functionSelectors[0], TestFacetOne.foo.selector);
        assertEq(response[1].functionSelectors[1], TestFacetOne.baz.selector);

        assertEq(response[2].facetAddress, address(facetTwo));
        assertEq(response[2].functionSelectors.length, 2);
        assertEq(response[2].functionSelectors[0], TestFacetTwo.qux.selector);
        assertEq(response[2].functionSelectors[1], TestFacetTwo.bar.selector);
    }

    function test_facetFunctionSelectors_filtersByFacet() public view {
        bytes4[] memory loupeSelectors = DiamondLoupeFacet(address(diamond)).facetFunctionSelectors(address(loupeFacet));
        assertEq(loupeSelectors.length, 5);
        assertEq(loupeSelectors[0], DiamondLoupeFacet.facets.selector);
        assertEq(loupeSelectors[4], DiamondLoupeFacet.supportsInterface.selector);

        bytes4[] memory selectorsOne = DiamondLoupeFacet(address(diamond)).facetFunctionSelectors(address(facetOne));
        assertEq(selectorsOne.length, 2);
        assertEq(selectorsOne[0], TestFacetOne.foo.selector);
        assertEq(selectorsOne[1], TestFacetOne.baz.selector);

        bytes4[] memory selectorsTwo = DiamondLoupeFacet(address(diamond)).facetFunctionSelectors(address(facetTwo));
        assertEq(selectorsTwo.length, 2);
        assertEq(selectorsTwo[0], TestFacetTwo.qux.selector);
        assertEq(selectorsTwo[1], TestFacetTwo.bar.selector);

        bytes4[] memory emptySelectors = DiamondLoupeFacet(address(diamond)).facetFunctionSelectors(unknownFacet);
        assertEq(emptySelectors.length, 0);
    }

    function test_facetAddresses_listsUniqueAddresses() public view {
        address[] memory addresses = DiamondLoupeFacet(address(diamond)).facetAddresses();

        assertEq(addresses.length, 3);
        assertEq(addresses[0], address(loupeFacet));
        assertEq(addresses[1], address(facetOne));
        assertEq(addresses[2], address(facetTwo));
    }

    function test_facetAddress_returnsCorrectFacet() public view {
        assertEq(DiamondLoupeFacet(address(diamond)).facetAddress(TestFacetOne.foo.selector), address(facetOne));
        assertEq(DiamondLoupeFacet(address(diamond)).facetAddress(TestFacetTwo.bar.selector), address(facetTwo));
        assertEq(DiamondLoupeFacet(address(diamond)).facetAddress(bytes4(0)), address(0));
    }

    function test_supportsInterface_readsStoredMapping() public {
        bytes4 interfaceId = type(IDiamondLoupe).interfaceId;
        bytes4 anotherInterface = bytes4(keccak256("randomInterface()"));

        vm.prank(owner);
        diamond.setInterface(interfaceId, true);

        assertTrue(DiamondLoupeFacet(address(diamond)).supportsInterface(interfaceId));
        assertFalse(DiamondLoupeFacet(address(diamond)).supportsInterface(anotherInterface));
    }
}
