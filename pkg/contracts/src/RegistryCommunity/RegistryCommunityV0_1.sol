// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./RegistryCommunityV0_0.sol";
import "../interfaces/IArbitrable.sol";
import {ICollateralVault} from "../interfaces/ICollateralVault.sol";

contract RegistryCommunityV0_1 is RegistryCommunityV0_0, IArbitrable {
    error ChangeRequestNotInList(uint256 _requestId);
    error ChangeRequestNotActive(uint256 _requestId);
    error InsufficientCollateral(uint256 _sentAmount, uint256 _requiredAmount);
    error ChangeAlreadyExecuted(uint256 _requestId);
    error StillInDelayPeriod(uint256 _requestId);
    error OnlyArbitratorCanRule();
    error UnknownParameter(string _parameterName);

    event TribunaSafeRegistered(address strategy, address arbitrator, address tribunalSafe);
    event ArbitrableConfigUpdated(
        uint256 currentArbitrableConfigVersion,
        IArbitrator arbitrator,
        address tribunalSafe,
        uint256 submitterCollateralAmount,
        uint256 challengerCollateralAmount,
        uint256 defaultRuling,
        uint256 defaultRulingTimeout
    );
    event ParameterChangeRequested(uint256 indexed requestId, string parameter, uint256 version, uint256 timestamp);
    event ParameterChangeFinalized(uint256 indexed requestId, string parameter, uint256 version);
    event ChangeRequestDisputed(
        IArbitrator arbitrator,
        uint256 changeRequestId,
        uint256 disputeId,
        address challenger,
        string context,
        uint256 timestamp
    );

    enum ChangeRequestlStatus {
        Active,
        Cancelled, // need to implement the cancel function
        Executed,
        Disputed,
        Rejected
    }

    struct ArbitrableDispute {
        IArbitrator arbitrator;
        uint256 externalDisputeID;
        uint256 templateId;
        string templateUri;
    }

    struct ArbitrableConfig {
        IArbitrator arbitrator;
        address tribunalSafe;
        uint256 submitterCollateralAmount;
        uint256 challengerCollateralAmount;
        uint256 defaultRuling;
        uint256 defaultRulingTimeout;
        uint256 delay;
    }

    struct ConfigParameters {
        uint256 registerStakeAmount;
        uint256 communityFee;
        bool isKickEnabled;
        address feeReceiver;
        ISafe councilSafe;
        string communityName;
        string covenantIpfsHash;
    }

    struct DisputeInfo {
        uint256 disputeId;
        uint256 disputeTimestamp;
        address challenger;
    }

    struct ConfigChangeRequest {
        uint256 requestId;
        string parameterName;
        uint256 newUintValue;
        address newAddressValue;
        string newStringValue;
        bool newBoolValue;
        uint256 timestamp;
        ChangeRequestlStatus status;
        DisputeInfo disputeInfo;
        uint256 arbitrableConfigVersion;
        address submitter;
    }

    struct InitializeV2Params {
        ArbitrableConfig arbitrableConfig;
    }

    uint256 public constant RULING_OPTIONS = 3;

    uint256 public currentArbitrableConfigVersion;
    uint256 public currentConfigVersion;
    uint256 public changeRequestCounter;
    ICollateralVault public collateralVault;

    mapping(uint256 => ArbitrableConfig) public arbitrableConfigs;
    mapping(uint256 => ConfigParameters) public configurations;
    mapping(uint256 => ConfigChangeRequest) public configChangeRequests;
    mapping(uint256 => uint256) public disputeIdToRequestId;

    mapping(uint256 => ArbitrableDispute) public disputes;

    uint256 public disputeCounter;

    /// @notice Initialize the new version (v2) of the contract.
    function initializeV2(bytes memory _data) external reinitializer(2) {
        InitializeV2Params memory ip = abi.decode(_data, (InitializeV2Params));

        collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
        collateralVault.initialize();

        //Need to migrate the existing configs to the configurations[0]

        _setArbitrableParams(ip.arbitrableConfig);
    }

    /// @notice Function to create a change request for a parameter
    /// @param parameterName The name of the parameter to change
    /// @param newUintValue New value if it's a uint type
    /// @param newAddressValue New value if it's an address type
    /// @param newStringValue New value if it's a string type
    /// @param newBoolValue New value if it's a bool type
    function createChangeRequest(
        string memory parameterName,
        uint256 newUintValue,
        address newAddressValue,
        string memory newStringValue,
        bool newBoolValue
    ) external payable {
        onlyCouncilSafe();

        if (
            address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) != address(0)
                && msg.value < arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
        ) {
            revert InsufficientCollateral(
                msg.value, arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
            );
        }

        changeRequestCounter++;
        collateralVault.depositCollateral{value: msg.value}(changeRequestCounter, msg.sender);

        configChangeRequests[changeRequestCounter] = ConfigChangeRequest({
            requestId: changeRequestCounter,
            parameterName: parameterName,
            newUintValue: newUintValue,
            newAddressValue: newAddressValue,
            newStringValue: newStringValue,
            newBoolValue: newBoolValue,
            timestamp: block.timestamp,
            status: ChangeRequestlStatus.Active,
            disputeInfo: DisputeInfo({disputeId: 0, disputeTimestamp: 0, challenger: address(0)}),
            arbitrableConfigVersion: currentArbitrableConfigVersion,
            submitter: msg.sender
        });

        emit ParameterChangeRequested(changeRequestCounter, parameterName, currentConfigVersion, block.timestamp);
    }

    /// @notice Finalize the parameter change after the delay period has passed
    /// @param _requestId The ID of the change request
    function finalizeChangeRequest(uint256 _requestId) external virtual {
        if (
            block.timestamp
                < configChangeRequests[_requestId].timestamp
                    + arbitrableConfigs[configChangeRequests[_requestId].arbitrableConfigVersion].delay
        ) {
            revert StillInDelayPeriod(_requestId);
        }

        _finalizeChangeRequest(_requestId);
    }

    function _finalizeChangeRequest(uint256 _requestId) internal virtual {
        ConfigChangeRequest storage request = configChangeRequests[_requestId];
        if (request.status != ChangeRequestlStatus.Active || request.status != ChangeRequestlStatus.Disputed) {
            revert ChangeAlreadyExecuted(_requestId);
        }

        uint256 currentConfigId = currentConfigVersion;
        currentConfigVersion++;
        configurations[currentConfigVersion] = configurations[currentConfigId];

        ConfigParameters storage newConfig = configurations[currentConfigVersion];

        bytes32 parameterNameHash = keccak256(abi.encodePacked(request.parameterName));

        // here we can add or remove the ones that we want to be able to change or not
        // Every time that we change a parameter we need to override the functions that are using it to start using the configurations[currentConfigVersion]
        if (parameterNameHash == keccak256("registerStakeAmount")) {
            newConfig.registerStakeAmount = request.newUintValue;
        } else if (parameterNameHash == keccak256("communityFee")) {
            newConfig.communityFee = request.newUintValue;
        } else if (parameterNameHash == keccak256("isKickEnabled")) {
            newConfig.isKickEnabled = request.newBoolValue;
        } else if (parameterNameHash == keccak256("feeReceiver")) {
            newConfig.feeReceiver = request.newAddressValue;
        } else if (parameterNameHash == keccak256("councilSafe")) {
            newConfig.councilSafe = ISafe(request.newAddressValue);
        } else if (parameterNameHash == keccak256("communityName")) {
            newConfig.communityName = request.newStringValue;
        } else if (parameterNameHash == keccak256("covenantIpfsHash")) {
            newConfig.covenantIpfsHash = request.newStringValue;
        } else {
            revert UnknownParameter(request.parameterName);
        }

        request.status = ChangeRequestlStatus.Executed;

        emit ParameterChangeFinalized(_requestId, request.parameterName, currentConfigVersion);
    }

    /// @dev Allows a user to request a dispute with a specific arbitrator.
    /// @param _changeRequestId The id of the change request.
    /// @param _context The context for the dispute.
    /// @param _extraData Extra data for the aribtrator.
    function disputeChangeRequest(uint256 _changeRequestId, string calldata _context, bytes calldata _extraData)
        external
        payable
        virtual
        returns (uint256 disputeId)
    {
        ConfigChangeRequest storage changeRequest = configChangeRequests[_changeRequestId];
        ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[changeRequest.arbitrableConfigVersion];

        if (changeRequest.requestId != _changeRequestId) {
            revert ChangeRequestNotInList(_changeRequestId);
        }
        if (changeRequest.status != ChangeRequestlStatus.Active) {
            revert ChangeRequestNotActive(_changeRequestId);
        }
        if (msg.value < arbitrableConfig.challengerCollateralAmount) {
            revert InsufficientCollateral(msg.value, arbitrableConfig.challengerCollateralAmount);
        }

        uint256 arbitrationFee = msg.value - arbitrableConfig.challengerCollateralAmount;
        collateralVault.depositCollateral{value: arbitrableConfig.challengerCollateralAmount}(
            changeRequest.requestId, msg.sender
        );

        changeRequest.status = ChangeRequestlStatus.Disputed;
        disputeId = arbitrableConfig.arbitrator.createDispute{value: arbitrationFee}(RULING_OPTIONS, _extraData);

        changeRequest.disputeInfo.disputeId = disputeId;
        changeRequest.disputeInfo.disputeTimestamp = block.timestamp;
        changeRequest.disputeInfo.challenger = msg.sender;

        disputeIdToRequestId[disputeId] = _changeRequestId;

        disputeCounter++;

        emit ChangeRequestDisputed(
            arbitrableConfig.arbitrator,
            _changeRequestId,
            disputeId,
            msg.sender,
            _context,
            changeRequest.disputeInfo.disputeTimestamp
        );
    }

    /// @dev Function to give a ruling for a dispute. Only callable by the arbitrator.
    /// @param _disputeID The identifier of the dispute in this contract.
    /// @param _ruling The ruling given by the arbitrator.
    function rule(uint256 _disputeID, uint256 _ruling) external virtual override {
        uint256 changeRequestId = disputeIdToRequestId[_disputeID];

        ConfigChangeRequest storage changeRequest = configChangeRequests[changeRequestId];
        if (msg.sender != address(arbitrableConfigs[changeRequest.arbitrableConfigVersion].arbitrator)) {
            revert OnlyArbitratorCanRule();
        }

        if (_ruling == 0) {
            changeRequest.status = ChangeRequestlStatus.Active;
            collateralVault.withdrawCollateral(
                changeRequestId,
                changeRequest.disputeInfo.challenger,
                arbitrableConfigs[changeRequest.arbitrableConfigVersion].challengerCollateralAmount
            );
        } else if (_ruling == 1) {
            _finalizeChangeRequest(changeRequestId);
            collateralVault.withdrawCollateralFor(
                changeRequestId,
                changeRequest.disputeInfo.challenger,
                changeRequest.submitter,
                arbitrableConfigs[changeRequest.arbitrableConfigVersion].challengerCollateralAmount
            );
            collateralVault.withdrawCollateral(
                changeRequestId,
                changeRequest.submitter,
                arbitrableConfigs[changeRequest.arbitrableConfigVersion].submitterCollateralAmount
            );
        } else if (_ruling == 2) {
            changeRequest.status = ChangeRequestlStatus.Rejected;
            collateralVault.withdrawCollateral(
                changeRequestId,
                changeRequest.disputeInfo.challenger,
                arbitrableConfigs[changeRequest.arbitrableConfigVersion].challengerCollateralAmount
            );
            collateralVault.withdrawCollateralFor(
                changeRequestId,
                changeRequest.submitter,
                changeRequest.disputeInfo.challenger,
                arbitrableConfigs[changeRequest.arbitrableConfigVersion].submitterCollateralAmount
            );
        }

        emit Ruling(arbitrableConfigs[changeRequest.arbitrableConfigVersion].arbitrator, _disputeID, _ruling);
    }

    function _setArbitrableParams(ArbitrableConfig memory _arbitrableConfig) internal virtual {
        if (
            _arbitrableConfig.tribunalSafe != address(0) && address(_arbitrableConfig.arbitrator) != address(0)
                && (
                    _arbitrableConfig.tribunalSafe != arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe
                        || _arbitrableConfig.arbitrator != arbitrableConfigs[currentArbitrableConfigVersion].arbitrator
                        || _arbitrableConfig.submitterCollateralAmount
                            != arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
                        || _arbitrableConfig.challengerCollateralAmount
                            != arbitrableConfigs[currentArbitrableConfigVersion].challengerCollateralAmount
                        || _arbitrableConfig.defaultRuling != arbitrableConfigs[currentArbitrableConfigVersion].defaultRuling
                        || _arbitrableConfig.defaultRulingTimeout
                            != arbitrableConfigs[currentArbitrableConfigVersion].defaultRulingTimeout
                        || _arbitrableConfig.delay != arbitrableConfigs[currentArbitrableConfigVersion].delay
                )
        ) {
            if (
                arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe != _arbitrableConfig.tribunalSafe
                    || arbitrableConfigs[currentArbitrableConfigVersion].arbitrator != _arbitrableConfig.arbitrator
            ) {
                _arbitrableConfig.arbitrator.registerSafe(_arbitrableConfig.tribunalSafe);
                emit TribunaSafeRegistered(
                    address(this), address(_arbitrableConfig.arbitrator), _arbitrableConfig.tribunalSafe
                );
            }

            currentArbitrableConfigVersion++;
            arbitrableConfigs[currentArbitrableConfigVersion] = _arbitrableConfig;

            emit ArbitrableConfigUpdated(
                currentArbitrableConfigVersion,
                _arbitrableConfig.arbitrator,
                _arbitrableConfig.tribunalSafe,
                _arbitrableConfig.submitterCollateralAmount,
                _arbitrableConfig.challengerCollateralAmount,
                _arbitrableConfig.defaultRuling,
                _arbitrableConfig.defaultRulingTimeout
            );
        }
    }
}
