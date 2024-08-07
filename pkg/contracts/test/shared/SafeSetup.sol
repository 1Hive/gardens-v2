//SPDX-License-Identifier: AGPL-3.0-only

pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {ISafe} from "./interfaces/ISafe.sol";
import "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";

contract SafeSetup is Test {
    Safe public councilSafe;
    Safe public councilSafeOwner;

    address public councilMember1;
    uint256 public councilMemberPK = 1;

    function _councilSafeWithOwner(address _owner) public returns (Safe) {
        return
            _councilSafeWithOwner(
                _owner,
                SafeProxyFactory(
                    address(0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67)
                )
            );
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function _councilSafeWithOwner(
        address _owner,
        SafeProxyFactory _safeProxyFactory
    ) public returns (Safe) {
        console.log(
            "isContract 1",
            isContract(address(0x41675C099F32341bf84BFc5382aF534df5C7461a))
        );
        if (address(councilSafeOwner) == address(0)) {
            _safeProxyFactory = SafeProxyFactory(
                address(0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67)
            ); // SafeProxyFactory
            SafeProxy sp = _safeProxyFactory.createProxyWithNonce(
                address(0x41675C099F32341bf84BFc5382aF534df5C7461a),
                "",
                0
            );
            councilSafeOwner = Safe(payable(address(sp)));
            vm.label(address(councilSafeOwner), "councilSafeAddr");
            vm.label(address(_owner), "councilSafeOwner");
            address[] memory owners = new address[](1);
            owners[0] = address(_owner);
            councilSafeOwner.setup(
                owners,
                1,
                address(0),
                "",
                address(0),
                address(0),
                0,
                payable(address(0))
            );
        }
        return councilSafeOwner;
    }

    function _councilSafe() internal returns (Safe) {
        console.log(
            "isContract 2",
            isContract(address(0x41675C099F32341bf84BFc5382aF534df5C7461a))
        );
        councilMember1 = vm.addr(councilMemberPK);
        vm.label(councilMember1, "councilMember1");

        if (address(councilSafe) == address(0)) {
            SafeProxyFactory spf = SafeProxyFactory(
                address(0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67)
            );
            SafeProxy sp = spf.createProxyWithNonce(
                address(0x41675C099F32341bf84BFc5382aF534df5C7461a),
                "",
                0
            );
            console.log("###1");
            councilSafe = Safe(payable(address(sp)));
            console.log("###2");
            console.log("councilSafe address: %s", address(councilSafe));
            console.log("###3");
            vm.label(address(councilSafe), "councilSafe");
            console.log("###4");
            address[] memory owners = new address[](3);
            console.log("###5");
            owners[0] = address(councilMember1);
            owners[1] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
            owners[2] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
            console.log("###6");
            councilSafe.setup(
                owners,
                1,
                address(0),
                "",
                address(0),
                address(0),
                0,
                payable(address(0))
            );
            console.log("###7");
        }
        return councilSafe;
    }

    function getHash(
        address to_,
        bytes memory data_,
        Safe councilSafe_
    ) private view returns (bytes32 txData) {
        txData = keccak256(
            councilSafe_.encodeTransactionData(
                address(to_),
                0,
                data_,
                Enum.Operation.Call,
                0,
                0,
                0,
                address(0),
                payable(address(0)),
                councilSafe_.nonce()
            )
        );
    }

    function getSignature(
        address to_,
        bytes memory data_,
        Safe councilSafe_,
        uint256 councilMemberPK_
    ) private view returns (bytes memory signature) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            councilMemberPK_,
            getHash(to_, data_, councilSafe_)
        );
        signature = abi.encodePacked(r, s, v);
    }

    function safeHelper(
        address to_,
        uint256 value_,
        bytes memory data_
    ) public {
        safeHelper(councilSafe, councilMemberPK, to_, data_, value_);
    }

    function safeHelper(
        Safe councilSafe_,
        uint256 councilMemberPK_,
        address to_,
        bytes memory data_
    ) public {
        safeHelper(councilSafe_, councilMemberPK_, to_, data_, 0);
    }

    function safeHelper(
        Safe councilSafe_,
        uint256 councilMemberPK_,
        address to_,
        bytes memory data_,
        uint256 value_
    ) public {
        bytes memory sign;
        {
            sign = getSignature(to_, data_, councilSafe_, councilMemberPK_);
        }

        assertTrue(
            councilSafe_.execTransaction(
                to_,
                value_,
                data_,
                Enum.Operation.Call,
                0,
                0,
                0,
                address(0),
                payable(address(0)),
                sign
            ),
            "execTransaction failed"
        );
    }
}
