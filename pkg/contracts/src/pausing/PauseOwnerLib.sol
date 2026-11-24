// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

library PauseOwnerLib {
    function isMainOwner(address directOwner, address account) internal view returns (bool) {
        if (directOwner.code.length == 0) return false;
        (bool ok, bytes memory data) = directOwner.staticcall(abi.encodeWithSignature("mainOwner()"));
        return ok && data.length == 32 && abi.decode(data, (address)) == account;
    }
}
