// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IArbitrable} from "./interfaces/IArbitrable.sol";
import {IArbitrator} from "./interfaces/IArbitrator.sol";

/// @title Safe Arbitrator
/// @dev This is an arbitrator middleware that will allow a safe to decide on the result of disputes.
contract SafeArbitrator is IArbitrator {

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
    }

    address public owner = msg.sender; // Owner of the contract.
    uint256 private arbitrationFee; // The cost to create a dispute. Made private because of the arbitrationCost() getter.


    DisputeStruct[] public disputes; // Stores the dispute info. disputes[disputeID].

    modifier onlyOwner() {
        require(msg.sender == owner, "Can only be called by the owner.");
        _;
    }

    /// @dev Constructor.
    /// @param _arbitrationFee Amount to be paid for arbitration.
    constructor(uint256 _arbitrationFee) {
        arbitrationFee = _arbitrationFee;

    }


    /// @dev Set the arbitration fee. Only callable by the owner.
    /// @param _arbitrationFee Amount to be paid for arbitration.
    function setArbitrationFee(uint256 _arbitrationFee) external onlyOwner {
        arbitrationFee = _arbitrationFee;
    }


    /// @inheritdoc IArbitrator
    function createDispute(
        uint256 _choices,
        bytes calldata _extraData
    ) external payable override returns (uint256 disputeID) {
        require(msg.value >= arbitrationCost(_extraData), "Arbitration fees: not enough.");
        disputeID = disputes.length;
        disputes.push(
            DisputeStruct({
                arbitrated: IArbitrable(msg.sender),
                arbitratorExtraData: _extraData,
                choices: _choices,
                arbitrationFee: msg.value,
                ruling: 0,
                status: DisputeStatus.Waiting
            })
        );

        emit DisputeCreation(disputeID, IArbitrable(msg.sender));
    }

    /// @inheritdoc IArbitrator
    function createDispute(
        uint256 /*_choices*/,
        bytes calldata /*_extraData*/,
        IERC20 /*_feeToken*/,
        uint256 /*_feeAmount*/
    ) external pure override returns (uint256) {
        revert("Not supported");
    }


    /// @dev Give a ruling to a dispute.
    /// @param _disputeID ID of the dispute to rule.
    /// @param _ruling Ruling given by the arbitrator. Note that 0 means that arbitrator chose "Refused to rule".
    function executeRuling(uint256 _disputeID, uint256 _ruling) external onlyOwner {
        DisputeStruct storage dispute = disputes[_disputeID];
        require(_ruling <= dispute.choices, "Invalid ruling.");
        require(dispute.status != DisputeStatus.Solved, "The dispute must not be solved.");

        dispute.ruling = _ruling;
        dispute.status = DisputeStatus.Solved;

        payable(msg.sender).send(dispute.arbitrationFee); // Avoid blocking.
        dispute.arbitrated.rule(_disputeID, dispute.ruling);
        
    }


    /// @inheritdoc IArbitrator
    function arbitrationCost(bytes calldata /*_extraData*/) public view override returns (uint256 fee) {
        return arbitrationFee;
    }

    /// @inheritdoc IArbitrator
    function arbitrationCost(
        bytes calldata /*_extraData*/,
        IERC20 /*_feeToken*/
    ) public pure override returns (uint256 /*cost*/) {
        revert("Not supported");
    }


    function currentRuling(
        uint256 _disputeID
    ) public view returns (uint256 ruling, bool tied, bool overridden) {
        DisputeStruct storage dispute = disputes[_disputeID];
        ruling = dispute.ruling;
        tied = false;
        overridden = false;
    }
}
