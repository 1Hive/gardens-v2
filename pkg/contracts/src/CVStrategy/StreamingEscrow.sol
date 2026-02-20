// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGeneralDistributionAgreementV1.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface ICFAv1ForwarderLike {
    function getBufferAmountByFlowrate(ISuperToken token, int96 flowrate) external view returns (uint256);
}

/**
 * @title StreamingEscrow
 * @notice Receives Superfluid GDA pool distributions and forwards them to the beneficiary unless disputed.
 */
contract StreamingEscrow is ProxyOwnableUpgrader, SuperAppBase {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error OnlyStrategy(address sender); // 0x6c24a9f7
    error Disputed(); // 0x51f82c3a
    error ConnectPoolFailed(address pool, address superToken); // 0x7df25d8e
    error InvalidAddress(); // 0x9f1f3e28
    error OnlyHost(address sender); // 0x1cb0a1d5
    error SuperTokenTransferFailed(address to, uint256 amount);

    /*|--------------------------------------------|*/
    /*|              STORAGE                       |*/
    /*|--------------------------------------------|*/
    ISuperToken public superToken;
    ISuperfluidPool public pool;
    ISuperfluid public host;
    IGeneralDistributionAgreementV1 public gda;
    address public strategy;
    address public constant CFA_V1_FORWARDER = 0xcfA132E353cB4E398080B9700609bb008eceB125;

    address public beneficiary;
    bool public disputed;
    uint256[46] private __gap;

    /*|--------------------------------------------|*/
    /*|              INITIALIZER                   |*/
    /*|--------------------------------------------|*/
    function initialize(
        ISuperToken _superToken,
        ISuperfluidPool _pool,
        address _beneficiary,
        address _initialOwner,
        address _strategy
    ) external initializer {
        if (address(_superToken) == address(0) || address(_pool) == address(0) || _beneficiary == address(0)) {
            revert InvalidAddress();
        }
        if (_initialOwner == address(0) || _strategy == address(0)) {
            revert InvalidAddress();
        }

        ProxyOwnableUpgrader.initialize(_initialOwner);

        superToken = _superToken;
        pool = _pool;
        beneficiary = _beneficiary;
        strategy = _strategy;

        host = ISuperfluid(_superToken.getHost());
        gda = IGeneralDistributionAgreementV1(
            address(
                host.getAgreementClass(keccak256("org.superfluid-finance.agreements.GeneralDistributionAgreement.v1"))
            )
        );

        bool success = _superToken.connectPool(_pool);
        if (!success) {
            revert ConnectPoolFailed(address(_pool), address(_superToken));
        }
    }

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    modifier onlyStrategy() {
        if (msg.sender != strategy) {
            revert OnlyStrategy(msg.sender);
        }
        _;
    }

    modifier onlyStrategyOrOwner() {
        if (msg.sender != strategy && msg.sender != owner()) {
            revert OnlyStrategy(msg.sender);
        }
        _;
    }

    modifier onlyHost() {
        if (msg.sender != address(host)) {
            revert OnlyHost(msg.sender);
        }
        _;
    }

    /*|--------------------------------------------|*/
    /*|              EXTERNAL                      |*/
    /*|--------------------------------------------|*/
    function setBeneficiary(address _beneficiary) external onlyStrategy {
        if (_beneficiary == address(0)) {
            revert InvalidAddress();
        }
        address previous = beneficiary;
        beneficiary = _beneficiary;

        if (!disputed) {
            _setOutflow(0, previous);
            _setOutflow(_currentGDAFlowRate(), _beneficiary);
        }
    }

    function setDisputed(bool _disputed) external onlyStrategy {
        disputed = _disputed;
        if (disputed) {
            _setOutflow(0, beneficiary);
        } else {
            _setOutflow(_currentGDAFlowRate(), beneficiary);
        }
    }

    function syncOutflow() external onlyStrategyOrOwner {
        _drainExcessToBeneficiary();
        _setOutflow(disputed ? int96(0) : _currentGDAFlowRate(), beneficiary);
    }

    function drainToBeneficiary() external onlyStrategy {
        _drainTo(beneficiary);
    }

    function drainToStrategy() external onlyStrategy {
        _drainTo(strategy);
    }

    function claim() external {
        if (disputed) {
            revert Disputed();
        }
        _drainExcessToBeneficiary();
    }

    function depositAmount() public view returns (uint256) {
        int96 flowRate = _currentGDAFlowRate();
        if (flowRate <= 0) {
            return 0;
        }

        // Keep compatibility with older forwarder ABI shape requested by strategy integration.
        (bool ok, bytes memory data) = CFA_V1_FORWARDER.staticcall(
            abi.encodeWithSignature("getDepositRequiredForFlowRate(address,int96)", address(this), flowRate)
        );
        if (ok && data.length >= 32) {
            return abi.decode(data, (uint256));
        }

        return ICFAv1ForwarderLike(CFA_V1_FORWARDER).getBufferAmountByFlowrate(superToken, flowRate);
    }

    /*|--------------------------------------------|*/
    /*|              SUPER APP                     |*/
    /*|--------------------------------------------|*/
    function afterAgreementCreated(
        ISuperToken token,
        address agreementClass,
        bytes32,
        bytes calldata,
        bytes calldata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        return _afterAgreementChanged(token, agreementClass, ctx);
    }

    function afterAgreementUpdated(
        ISuperToken token,
        address agreementClass,
        bytes32,
        bytes calldata,
        bytes calldata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        return _afterAgreementChanged(token, agreementClass, ctx);
    }

    function afterAgreementTerminated(
        ISuperToken token,
        address agreementClass,
        bytes32,
        bytes calldata,
        bytes calldata,
        bytes calldata ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        return _afterAgreementChanged(token, agreementClass, ctx);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL                      |*/
    /*|--------------------------------------------|*/
    function _drainTo(address to) internal {
        uint256 balance = superToken.balanceOf(address(this));
        if (balance != 0) {
            if (!superToken.transfer(to, balance)) {
                revert SuperTokenTransferFailed(to, balance);
            }
        }
    }

    function _drainExcessToBeneficiary() internal {
        uint256 balance = superToken.balanceOf(address(this));
        uint256 reservedDeposit = depositAmount();
        if (balance > reservedDeposit) {
            uint256 amount = balance - reservedDeposit;
            if (!superToken.transfer(beneficiary, amount)) {
                revert SuperTokenTransferFailed(beneficiary, amount);
            }
        }
    }

    function _afterAgreementChanged(ISuperToken token, address agreementClass, bytes calldata ctx)
        internal
        returns (bytes memory newCtx)
    {
        if (address(token) != address(superToken) || agreementClass != address(gda)) {
            return ctx;
        }

        int96 flowRate = disputed ? int96(0) : _currentGDAFlowRate();
        return token.flowWithCtx(beneficiary, flowRate, ctx);
    }

    function _currentGDAFlowRate() internal view returns (int96) {
        int96 memberFlowRate = pool.getMemberFlowRate(address(this));
        return memberFlowRate > 0 ? memberFlowRate : int96(0);
    }

    function _setOutflow(int96 flowRate, address receiver) internal {
        if (receiver == address(0)) {
            return;
        }
        superToken.flow(receiver, flowRate);
    }
}
