//SPDX-License-Identifier: AGPL-3.0-only

pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import "safe-contracts/contracts/Safe.sol";
import "safe-contracts/contracts/proxies/SafeProxyFactory.sol";

contract SafeSetup is Test {
    Safe public councilSafe;
    Safe public councilSafeOwner;

    address public councilMember1;
    uint256 public councilMemberPK = 1;

    function _councilSafeWithOwner(address _owner) public returns (Safe) {
        if (address(councilSafeOwner) == address(0)) {
            SafeProxyFactory spf = new SafeProxyFactory();
            SafeProxy sp = spf.createProxyWithNonce(address(new Safe()), "", 0);
            councilSafeOwner = Safe(payable(address(sp)));
            vm.label(address(councilSafeOwner), "councilSafeAddr");
            vm.label(address(_owner), "councilSafeOwner");
            address[] memory owners = new address[](1);
            owners[0] = address(_owner);
            councilSafeOwner.setup(owners, 1, address(0), "", address(0), address(0), 0, payable(address(0)));
        }
        return councilSafeOwner;
    }

    function _councilSafe() internal returns (Safe) {
        councilMember1 = vm.addr(councilMemberPK);
        vm.label(councilMember1, "councilMember1");

        if (address(councilSafe) == address(0)) {
            SafeProxyFactory spf = new SafeProxyFactory();
            SafeProxy sp = spf.createProxyWithNonce(address(new Safe()), "", 0);
            councilSafe = Safe(payable(address(sp)));
            console.log("councilSafe address: %s", address(councilSafe));
            vm.label(address(councilSafe), "councilSafe");
            address[] memory owners = new address[](1);
            owners[0] = address(councilMember1);
            councilSafe.setup(owners, 1, address(0), "", address(0), address(0), 0, payable(address(0)));
        }
        return councilSafe;
    }

    function safeHelper(address to_, uint256 value_, bytes memory data_) public {
        bytes memory txData = councilSafe.encodeTransactionData(
            address(to_),
            value_,
            data_,
            Enum.Operation.Call,
            0,
            0,
            0,
            address(0),
            payable(address(0)),
            councilSafe.nonce()
        );

        bytes32 txDataHash = keccak256(txData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(councilMemberPK, txDataHash);

        bytes memory signature = abi.encodePacked(r, s, v);
        // vm.star
        councilSafe.execTransaction(
            address(to_), value_, data_, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signature
        );
    }
}
