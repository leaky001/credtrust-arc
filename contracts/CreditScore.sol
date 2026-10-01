// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CreditScore
 * @notice Stores and computes on-chain credit scores based on repayment behaviour
 */
contract CreditScore {
    struct UserRecord {
        uint256 totalLoans;
        uint256 completedLoans;
        uint256 onTimeRepayments;
        uint256 defaults;
        uint256 totalBorrowed;
        uint256 score;
    }

    mapping(address => UserRecord) public records;

    uint256 public constant BASE_SCORE = 500;
    uint256 public constant COMPLETED_WEIGHT = 20;
    uint256 public constant ON_TIME_MULTIPLIER = 2;
    uint256 public constant DEFAULT_PENALTY = 50;

    address public loanFactory;
    mapping(address => bool) public approvedLoans;

    modifier onlyLoanFactoryOrLoan() {
        require(
            msg.sender == loanFactory || approvedLoans[msg.sender],
            "Only LoanFactory or Loan"
        );
        _;
    }

    modifier onlyLoanFactory() {
        require(msg.sender == loanFactory, "Only LoanFactory");
        _;
    }

    function addApprovedLoan(address loan) external onlyLoanFactory {
        approvedLoans[loan] = true;
    }

    constructor(address _loanFactory) {
        loanFactory = _loanFactory;
    }

    function getScore(address user) external view returns (uint256) {
        UserRecord storage record = records[user];
        if (record.completedLoans == 0 && record.defaults == 0) {
            return BASE_SCORE;
        }
        return record.score;
    }

    function recordRepayment(
        address user,
        uint256 principal,
        bool onTime
    ) external onlyLoanFactoryOrLoan {
        UserRecord storage r = records[user];
        r.completedLoans += 1;
        if (onTime) r.onTimeRepayments += 1;
        r.totalBorrowed += principal;
        _updateScore(user);
    }

    function recordDefault(address user, uint256 principal) external onlyLoanFactoryOrLoan {
        UserRecord storage r = records[user];
        r.defaults += 1;
        r.totalBorrowed += principal;
        _updateScore(user);
    }

    function recordLoanRequest(address user, uint256) external onlyLoanFactory {
        records[user].totalLoans += 1;
    }

    function _updateScore(address user) internal {
        UserRecord storage r = records[user];
        uint256 onTimeRate = r.completedLoans > 0
            ? (r.onTimeRepayments * 100) / r.completedLoans
            : 0;
        uint256 score = BASE_SCORE;
        score += r.completedLoans * COMPLETED_WEIGHT;
        score += (onTimeRate * ON_TIME_MULTIPLIER) / 10;
        uint256 penalty = r.defaults * DEFAULT_PENALTY;
        r.score = penalty >= score ? 0 : score - penalty;
    }

    /**
     * @notice Calculates the interest rate in BPS based on user credit score
     * @param user The address of the borrower
     * @return interestRateBps The calculated interest rate in basis points
     */
    function calculateInterestRate(address user) external view returns (uint256 interestRateBps) {
        uint256 score = this.getScore(user);
        
        if (score >= 800) {
            return 400; // 4%
        } else if (score >= 600) {
            return 800; // 8%
        } else if (score >= 400) {
            return 1200; // 12%
        } else {
            return 2000; // 20%
        }
    }
}
