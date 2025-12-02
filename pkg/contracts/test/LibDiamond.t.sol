// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {LibDiamond, NotContractOwner, NoSelectorsProvidedForFacetForCut, CannotAddSelectorsToZeroAddress, CannotAddFunctionToDiamondThatAlreadyExists, CannotReplaceFunctionsFromFacetWithZeroAddress, CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet, CannotReplaceFunctionThatDoesNotExists, CannotReplaceImmutableFunction, CannotRemoveImmutableFunction, RemoveFacetAddressMustBeZeroAddress, CannotRemoveFunctionThatDoesNotExist, NoBytecodeAtAddress} from "../src/diamonds/libraries/LibDiamond.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";

contract LibDiamondHarness {
    error FunctionDoesNotExist(bytes4 selector);

    constructor(address _owner) {
        LibDiamond.setContractOwner(_owner);
    }

    function diamondCut(
        IDiamond.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }

    // Receives a well-typed FacetCut array, then force-writes an arbitrary action value before executing.
    function diamondCutForceInvalidAction(
        IDiamond.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata,
        uint8 rawAction
    ) external {
        LibDiamond.enforceIsContractOwner();
        address facet = _diamondCut[0].facetAddress;
        bytes4[] memory selectors = _diamondCut[0].functionSelectors;
        assembly {
            let base := add(_diamondCut, 0x20) // first element
            mstore(add(base, 0x20), rawAction)
        }
        // Restore other fields in case assembly clobbered them.
        _diamondCut[0].facetAddress = facet;
        _diamondCut[0].functionSelectors = selectors;
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }

    // Allows injecting a raw action value without enum decoding guardrails to hit error paths.
    function diamondCutRaw(
        FacetCutInput[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) external {
        LibDiamond.enforceIsContractOwner();
        IDiamond.FacetCut[] memory castCuts;
        assembly {
            castCuts := _diamondCut
        }
        LibDiamond.diamondCut(castCuts, _init, _calldata);
    }

    function setOwnerRaw(address _newOwner) external {
        LibDiamond.setContractOwner(_newOwner);
    }

    function enforceOwner() external view {
        LibDiamond.enforceIsContractOwner();
    }

    function owner() external view returns (address) {
        return LibDiamond.contractOwner();
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet = ds
            .facetAddressAndSelectorPosition[msg.sig]
            .facetAddress;

        if (facet == address(0)) {
            revert FunctionDoesNotExist(msg.sig);
        }

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}
}

contract TestFacetV1 {
    function foo() external pure returns (uint256) {
        return 1;
    }

    function bar() external pure returns (uint256) {
        return 11;
    }
}

contract TestFacetV2 {
    function foo() external pure returns (uint256) {
        return 2;
    }
}

struct FacetCutInput {
    address facetAddress;
    uint8 action;
    bytes4[] functionSelectors;
}

contract InitReverter {
    error Boom();

    function fail() external pure {
        revert Boom();
    }
}

contract InitNoop {
    event Called();

    function run() external {
        emit Called();
    }
}

contract LibDiamondTest is Test {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    LibDiamondHarness private diamond;
    address private owner = address(0xA11CE);
    address private newOwner = address(0xB0B);
    address private attacker = address(0xDEAD);

    TestFacetV1 private facetV1;
    TestFacetV2 private facetV2;

    function setUp() public {
        facetV1 = new TestFacetV1();
        facetV2 = new TestFacetV2();
        diamond = new LibDiamondHarness(owner);
    }

    function _addFacet(address facet, bytes4[] memory selectors) internal {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_setContractOwner_emitsAndUpdates() public {
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, newOwner);

        vm.prank(owner);
        diamond.setOwnerRaw(newOwner);

        assertEq(diamond.owner(), newOwner);
    }

    function test_enforceIsContractOwner_revertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(NotContractOwner.selector, attacker, owner)
        );
        diamond.enforceOwner();
    }

    function test_diamondCut_addAndRouteCall() public {
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = TestFacetV1.foo.selector;
        selectors[1] = TestFacetV1.bar.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        uint256 fooResult = TestFacetV1(address(diamond)).foo();
        uint256 barResult = TestFacetV1(address(diamond)).bar();

        assertEq(fooResult, 1);
        assertEq(barResult, 11);
    }

    function test_diamondCut_rejectsAddingExistingSelector() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotAddFunctionToDiamondThatAlreadyExists.selector,
                selectors[0]
            )
        );
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);
    }

    function test_diamondCut_rejectsEmptySelectors() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: new bytes4[](0)
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                NoSelectorsProvidedForFacetForCut.selector,
                address(facetV1)
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_diamondCut_replaceFacet() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");

        assertEq(TestFacetV1(address(diamond)).foo(), 2);
    }

    function test_diamondCut_replaceSameFacetReverts() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV1),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.startPrank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet
                    .selector,
                selectors[0]
            )
        );
        diamond.diamondCut(cuts, address(0), "");
        vm.stopPrank();
    }

    function test_diamondCut_removeFunctions() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.bar.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");

        vm.expectRevert(
            abi.encodeWithSelector(
                LibDiamondHarness.FunctionDoesNotExist.selector,
                selectors[0]
            )
        );
        TestFacetV1(address(diamond)).bar();
    }

    function test_diamondCut_removeWithNonZeroAddressReverts() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.bar.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV1),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                RemoveFacetAddressMustBeZeroAddress.selector,
                address(facetV1)
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_diamondCut_removeMissingSelectorReverts() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.bar.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotRemoveFunctionThatDoesNotExist.selector,
                selectors[0]
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_addFunctions_revertsZeroFacet() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotAddSelectorsToZeroAddress.selector,
                selectors
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_autoAddOrReplace_revertsZeroFacet() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotAddSelectorsToZeroAddress.selector,
                selectors
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_autoAddOrReplace_addsAndReplaces() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors); // initial add

        // Auto should replace foo with facetV2 and add bar
        bytes4[] memory autoSelectors = new bytes4[](2);
        autoSelectors[0] = TestFacetV1.foo.selector; // will be replaced
        autoSelectors[1] = TestFacetV1.bar.selector; // will be added

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV2),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: autoSelectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");

        // foo now points to facetV2
        assertEq(TestFacetV1(address(diamond)).foo(), 2);
        // bar added from facetV2 (fallback delegates to facetV2)
        vm.expectRevert(); // bar not present in facetV2, so call should revert
        TestFacetV1(address(diamond)).bar();
    }

    function test_removeFunctions_swapsSelectors() public {
        // add two selectors so removal triggers swap branch
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = TestFacetV1.foo.selector;
        selectors[1] = TestFacetV1.bar.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        // remove the first selector (foo) so bar should move into slot 0
        bytes4[] memory removeSelectors = new bytes4[](1);
        removeSelectors[0] = TestFacetV1.foo.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: removeSelectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");

        // foo should be gone
        vm.expectRevert();
        TestFacetV1(address(diamond)).foo();
        // bar should still be callable (moved to position 0)
        assertEq(TestFacetV1(address(diamond)).bar(), 11);
    }

    function test_removeFunctions_revertsImmutable() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("immutableFunc()"));

        // add selector pointing to the diamond itself to simulate immutable
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(diamond),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotRemoveImmutableFunction.selector,
                selectors[0]
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_initializeDiamondCut_revertsWhenInitHasNoCode() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](0);
        address init = address(0xBEEF); // EOA-like address, no code

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                NoBytecodeAtAddress.selector,
                init,
                "LibDiamondCut: _init address has no code"
            )
        );
        diamond.diamondCut(
            cuts,
            init,
            abi.encodeWithSignature("doesntMatter()")
        );
    }

    function test_initializeDiamondCut_bubblesRevertData() public {
        InitReverter reverter = new InitReverter();
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](0);

        vm.prank(owner);
        vm.expectRevert(InitReverter.Boom.selector);
        diamond.diamondCut(
            cuts,
            address(reverter),
            abi.encodeWithSignature("fail()")
        );
    }

    function test_initializeDiamondCut_succeeds() public {
        InitNoop init = new InitNoop();
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](0);

        vm.prank(owner);
        diamond.diamondCut(
            cuts,
            address(init),
            abi.encodeWithSignature("run()")
        );
    }

    function test_addFunctions_revertsNoBytecode() public {
        address eoa = makeAddr("eoa");
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: eoa,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                NoBytecodeAtAddress.selector,
                eoa,
                "LibDiamondCut: Add facet has no code"
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_autoAddOrReplace_revertsNoBytecode() public {
        address eoa = makeAddr("eoa2");
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: eoa,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                NoBytecodeAtAddress.selector,
                eoa,
                "LibDiamondCut: Auto facet has no code"
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_replaceFunctions_revertsNoBytecode() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        address eoa = makeAddr("eoa3");
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: eoa,
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                NoBytecodeAtAddress.selector,
                eoa,
                "LibDiamondCut: Replace facet has no code"
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_replaceFunctions_revertsMissingSelector() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV1),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionThatDoesNotExists.selector,
                selectors[0]
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_replaceFunctions_revertsImmutable() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("immutableFunc()"));

        // add selector pointing to the diamond itself to simulate immutable
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(diamond),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        diamond.diamondCut(cuts, address(0), "");

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facetV1),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceImmutableFunction.selector,
                selectors[0]
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }

    function test_replaceFunctions_revertsZeroFacetAddress() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TestFacetV1.foo.selector;
        vm.prank(owner);
        _addFacet(address(facetV1), selectors);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionsFromFacetWithZeroAddress.selector,
                selectors
            )
        );
        diamond.diamondCut(cuts, address(0), "");
    }
}
