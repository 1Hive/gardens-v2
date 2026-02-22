// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "./ProxyOwnableUpgrader.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {IArbitrable} from "./interfaces/IArbitrable.sol";
import {IArbitrator} from "./interfaces/IArbitrator.sol";

/// @title Safe Arbitrator
/// @dev This is an arbitrator middleware that will allow a safe to decide on the result of disputes.
contract SafeArbitrator is IArbitrator, ProxyOwnableUpgrader, ReentrancyGuardUpgradeable {
    event ArbitrationFeeUpdated(uint256 _newArbitrationFee);
    event SafeRegistered(address indexed _arbitrable, address _safe);
    event SafeArbitratorInitialized(uint256 _arbitrationFee);

    enum DisputeStatus {
        Waiting, // The dispute is waiting for the ruling or not created.
        Solved // The dispute is resolved.
    }

    struct DisputeStruct {
        IArbitrable arbitrated; // The address of the arbitrable contract.
        bytes arbitratorExtraData; // Extra data for the arbitrator.
        uint256 choices; // The number of choices the arbitrator can choose from.
        uint256 arbitrationFee; // Fee paid by the arbitrable for the arbitration. Must be equal or higher than arbitration cost.
        uint256 ruling; // Ruling given by the arbitrator.
        DisputeStatus status; // A current status of the dispute.
        address tribunalSafe; // The address of the safe that will rule on the dispute.
    }

    uint256 private arbitrationFee; // The cost to create a dispute. Made private because of the arbitrationCost() getter.

    DisputeStruct[] public disputes; // Stores the dispute info. disputes[disputeID].
    uint256 lastDisputeID; // The ID of the last dispute.
    mapping(address arbitrable => address safe) public arbitrableTribunalSafe; //Map arbitrable address to tribunal safe address
    uint256[50] private __gap;

    error OnlySafe(address sender, address safe);
    error NotEnoughArbitrationFees();
    error InvalidRuling();
    error DisputeAlreadySolved();
    error NotSupported();

    modifier onlySafe(uint256 _disputeID) {
        address tribunalSafe = disputes[_disputeID - 1].tribunalSafe;
        if (msg.sender == tribunalSafe) {
            _;
        } else {
            revert OnlySafe(msg.sender, tribunalSafe);
        }
    }

    // slither-disable-next-line unprotected-upgrade
    function initialize(uint256 _arbitrationFee, address _owner) public initializer {
        super.initialize(_owner);
        __Ownable_init();
        arbitrationFee = _arbitrationFee;
        emit SafeArbitratorInitialized(_arbitrationFee);
    }

    /// @dev Set the arbitration fee. Only callable by the owner.
    /// @param _arbitrationFee Amount to be paid for arbitration.
    function setArbitrationFee(uint256 _arbitrationFee) external onlyOwner {
        arbitrationFee = _arbitrationFee;
        emit ArbitrationFeeUpdated(_arbitrationFee);
    }

    function registerSafe(address _safe) external {
        arbitrableTribunalSafe[msg.sender] = _safe;
        emit SafeRegistered(msg.sender, _safe);
    }

    /// @inheritdoc IArbitrator
    function createDispute(uint256 _choices, bytes calldata _extraData)
        external
        payable
        override
        nonReentrant
        returns (uint256 disputeID)
    {
        if (msg.value < arbitrationCost(_extraData)) {
            revert NotEnoughArbitrationFees();
        }
        lastDisputeID++;
        disputeID = lastDisputeID;
        disputes.push(
            DisputeStruct({
                arbitrated: IArbitrable(msg.sender),
                arbitratorExtraData: _extraData,
                choices: _choices,
                arbitrationFee: msg.value,
                ruling: 0,
                status: DisputeStatus.Waiting,
                tribunalSafe: arbitrableTribunalSafe[msg.sender] // we snapshot the safe address at the time of dispute creation
            })
        );

        emit DisputeCreation(disputeID, IArbitrable(msg.sender));
    }

    /// @inheritdoc IArbitrator
    function createDispute(
        uint256, /*_choices*/
        bytes calldata, /*_extraData*/
        IERC20, /*_feeToken*/
        uint256 /*_feeAmount*/
    )
        external
        pure
        override
        returns (uint256)
    {
        revert NotSupported();
    }

    /// @dev Give a ruling to a dispute.
    /// @param _disputeID ID of the dispute to rule.
    /// @param _ruling Ruling given by the arbitrator. Note that 0 means that arbitrator chose "Refused to rule". 1 is allow and 2 is deny.
    /// @param _arbitrable Address of the arbitrable that the safe rules for".
    function executeRuling(uint256 _disputeID, uint256 _ruling, address _arbitrable) external onlySafe(_disputeID) {
        DisputeStruct storage dispute = disputes[_disputeID - 1]; // Dispute IDs start from 1, but the array is 0-indexed.

        if (_ruling > dispute.choices) {
            revert InvalidRuling();
        }
        if (dispute.status == DisputeStatus.Solved) {
            revert DisputeAlreadySolved();
        }

        dispute.ruling = _ruling;
        dispute.status = DisputeStatus.Solved;

        (bool success,) = payable(msg.sender).call{value: dispute.arbitrationFee}("");
        require(success, "Transfer failed");
        dispute.arbitrated.rule(_disputeID, dispute.ruling);
        emit Ruling(IArbitrable(_arbitrable), _disputeID, _ruling);
    }

    /// @inheritdoc IArbitrator
    function arbitrationCost(
        bytes calldata /*_extraData*/
    )
        public
        view
        override
        returns (uint256 fee)
    {
        return arbitrationFee;
    }

    /// @inheritdoc IArbitrator
    function arbitrationCost(
        bytes calldata,
        /*_extraData*/
        IERC20 /*_feeToken*/
    )
        public
        view
        override
        returns (
            uint256 /*cost*/
        )
    {
        revert NotSupported();
    }

    function currentRuling(uint256 _disputeID) public view returns (uint256 ruling, bool tied, bool overridden) {
        DisputeStruct storage dispute = disputes[_disputeID];
        ruling = dispute.ruling;
        tied = false;
        overridden = false;
    }

}
