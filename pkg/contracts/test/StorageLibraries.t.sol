// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {LibPauseStorage} from "../src/pausing/LibPauseStorage.sol";
import {CVSyncPowerStorage} from "../src/CVStrategy/CVSyncPowerStorage.sol";

contract PauseStorageHarness {
    function setPauseValues(address controller, address facet) external {
        LibPauseStorage.Layout storage l = LibPauseStorage.layout();
        l.pauseController = controller;
        l.pauseFacet = facet;
    }

    function getPauseValues() external view returns (address controller, address facet) {
        LibPauseStorage.Layout storage l = LibPauseStorage.layout();
        return (l.pauseController, l.pauseFacet);
    }
}

contract SyncPowerStorageHarness {
    function setAuth(address caller, bool authorized) external {
        CVSyncPowerStorage.layout().authorizedSyncCallers[caller] = authorized;
    }

    function getAuth(address caller) external view returns (bool) {
        return CVSyncPowerStorage.layout().authorizedSyncCallers[caller];
    }

    function setSynced(address member, uint256 power, bool hasSynced) external {
        CVSyncPowerStorage.Layout storage l = CVSyncPowerStorage.layout();
        l.syncedPower[member] = power;
        l.hasSyncedPower[member] = hasSynced;
    }

    function getSynced(address member) external view returns (uint256 power, bool hasSynced) {
        CVSyncPowerStorage.Layout storage l = CVSyncPowerStorage.layout();
        return (l.syncedPower[member], l.hasSyncedPower[member]);
    }
}

contract StorageLibrariesTest is Test {
    function test_libPauseStorage_layout_roundtrip() public {
        PauseStorageHarness harness = new PauseStorageHarness();

        harness.setPauseValues(address(0x1234), address(0x5678));
        (address controller, address facet) = harness.getPauseValues();
        assertEq(controller, address(0x1234));
        assertEq(facet, address(0x5678));
    }

    function test_cvSyncPowerStorage_layout_roundtrip() public {
        SyncPowerStorageHarness harness = new SyncPowerStorageHarness();
        address caller = makeAddr("caller");
        address member = makeAddr("member");

        assertFalse(harness.getAuth(caller));
        harness.setAuth(caller, true);
        assertTrue(harness.getAuth(caller));

        (uint256 initialPower, bool initialSynced) = harness.getSynced(member);
        assertEq(initialPower, 0);
        assertFalse(initialSynced);

        harness.setSynced(member, 77, true);
        (uint256 power, bool hasSynced) = harness.getSynced(member);
        assertEq(power, 77);
        assertTrue(hasSynced);
    }
}
