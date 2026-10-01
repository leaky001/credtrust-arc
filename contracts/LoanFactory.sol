// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Loan.sol";
import "./CreditScore.sol";
import "./LendingPool.sol";

/**
 * @title LoanFactory
 * @notice Creates loan instances and maintains registry
 */
contract LoanFactory {
    Loan[] public loans;
    CreditScore public creditScore;
    LendingPool public lendingPool;
    IERC20 public immutable usdc;

    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 principal, uint256 interestRateBps, uint256 durationDays);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "Invalid USDC address");
        usdc = IERC20(usdcAddress);
        creditScore = new CreditScore(address(this));
        lendingPool = new LendingPool(address(this), usdcAddress);
    }

    function createLoan(
        uint256 principal,
        uint256 durationDays
    ) external returns (uint256 loanId) {
        return _createLoan(msg.sender, principal, durationDays);
    }

    function _createLoan(
        address borrower,
        uint256 principal,
        uint256 durationDays
    ) internal returns (uint256 loanId) {
        require(principal > 0, "Zero principal");
        require(durationDays >= 1 && durationDays <= 365, "Invalid duration");

        uint256 interestRateBps = creditScore.calculateInterestRate(borrower);

        Loan loan = new Loan(
            borrower,
            principal,
            interestRateBps,
            durationDays,
            address(this),
            address(creditScore),
            address(usdc),
            address(lendingPool)
        );

        loanId = loans.length;
        loans.push(loan);

        creditScore.addApprovedLoan(address(loan));
        creditScore.recordLoanRequest(borrower, principal);

        emit LoanCreated(loanId, borrower, principal, interestRateBps, durationDays);
    }

    function getLoan(uint256 loanId) external view returns (address) {
        require(loanId < loans.length, "Invalid loan");
        return address(loans[loanId]);
    }

    function getCreditScore() external view returns (address) {
        return address(creditScore);
    }

    function listLoans() external view returns (address[] memory) {
        address[] memory addrs = new address[](loans.length);
        for (uint256 i = 0; i < loans.length; i++) {
            addrs[i] = address(loans[i]);
        }
        return addrs;
    }

    function loanCount() external view returns (uint256) {
        return loans.length;
    }

    function markLoanDefaulted(uint256 loanId) external {
        require(loanId < loans.length, "Invalid loan");
        loans[loanId].markDefaulted();
    }

    /**
     * @notice Creates a loan and funds it instantly from the protocol pool
     */
    function borrowFromPool(
        uint256 principal,
        uint256 durationDays
    ) external returns (uint256 loanId) {
        loanId = _createLoan(msg.sender, principal, durationDays);
        address loanAddr = address(loans[loanId]);

        lendingPool.fundLoan(loanAddr);
    }

    function getLendingPool() external view returns (address) {
        return address(lendingPool);
    }
}
