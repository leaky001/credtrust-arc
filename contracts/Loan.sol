// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICreditScore {
    function recordRepayment(address user, uint256 principal, bool onTime) external;
    function recordDefault(address user, uint256 principal) external;
}

interface ILoanPool {
    function settleLoan(uint256 amount) external;
}

/**
 * @title Loan
 * @notice Single loan agreement: Requested → Funded → Active → Repaid / Defaulted
 */
contract Loan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Requested,
        Funded,
        Active,
        Repaid,
        Defaulted
    }

    address public borrower;
    uint256 public principal;
    uint256 public interestRateBps; // basis points, e.g. 500 = 5%
    uint256 public durationDays;
    uint256 public fundedAt;
    uint256 public repaymentDeadline;
    uint256 public totalFunded;

    address[] public lenders;
    mapping(address => uint256) public contributions;

    Status public status;
    address public factory;
    ICreditScore public creditScore;
    IERC20 public immutable usdc;
    address public immutable lendingPool;

    event LoanFunded(address indexed lender, uint256 amount);
    event LoanPartiallyFunded(address indexed lender, uint256 amount, uint256 remaining);
    event LoanRepaid(address indexed borrower, uint256 principal, uint256 interest);
    event LoanDefaulted(address indexed borrower);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyBorrower() {
        require(msg.sender == borrower, "Only borrower");
        _;
    }

    constructor(
        address _borrower,
        uint256 _principal,
        uint256 _interestRateBps,
        uint256 _durationDays,
        address _factory,
        address _creditScore,
        address _usdc,
        address _lendingPool
    ) {
        borrower = _borrower;
        principal = _principal;
        interestRateBps = _interestRateBps;
        durationDays = _durationDays;
        factory = _factory;
        creditScore = ICreditScore(_creditScore);
        usdc = IERC20(_usdc);
        lendingPool = _lendingPool;
        status = Status.Requested;
    }

    function fund(uint256 amount) external nonReentrant {
        require(status == Status.Requested, "Invalid status");
        require(msg.sender != borrower, "Borrower cannot fund own loan");
        require(amount > 0, "No value sent");

        uint256 remaining = principal - totalFunded;
        uint256 amountToAccept = amount > remaining ? remaining : amount;
        usdc.safeTransferFrom(msg.sender, address(this), amountToAccept);
        _recordFunding(msg.sender, amountToAccept);
    }

    function fundFromPool(uint256 amount) external nonReentrant {
        require(msg.sender == lendingPool, "Only lending pool");
        require(status == Status.Requested && totalFunded == 0, "Invalid status");
        require(amount == principal, "Incorrect funding amount");
        _recordFunding(msg.sender, amount);
    }

    function _recordFunding(address funder, uint256 amount) internal {
        require(status == Status.Requested, "Invalid status");

        if (contributions[funder] == 0) {
            lenders.push(funder);
        }
        contributions[funder] += amount;
        totalFunded += amount;

        if (totalFunded == principal) {
            status = Status.Active;
            fundedAt = block.timestamp;
            repaymentDeadline = block.timestamp + (durationDays * 1 days);
            usdc.safeTransfer(borrower, principal);
            emit LoanFunded(funder, amount);
        } else {
            emit LoanPartiallyFunded(funder, amount, principal - totalFunded);
        }
    }

    function repay() external onlyBorrower nonReentrant {
        require(status == Status.Active, "Invalid status");

        uint256 interest = (principal * interestRateBps) / 10000;
        uint256 total = principal + interest;
        usdc.safeTransferFrom(msg.sender, address(this), total);

        status = Status.Repaid;
        bool onTime = block.timestamp <= repaymentDeadline;

        creditScore.recordRepayment(borrower, principal, onTime);

        uint256 distributed;
        for (uint256 i = 0; i < lenders.length; i++) {
            address lender = lenders[i];
            uint256 share = contributions[lender];
            uint256 lenderTotal = i == lenders.length - 1
                ? total - distributed
                : share + (interest * share) / principal;
            distributed += lenderTotal;
            usdc.safeTransfer(lender, lenderTotal);
        }

        if (contributions[lendingPool] > 0) {
            ILoanPool(lendingPool).settleLoan(principal);
        }

        emit LoanRepaid(borrower, principal, interest);
    }

    uint256 public constant GRACE_PERIOD = 3 days;

    function markDefaulted() external nonReentrant {
        require(status == Status.Active, "Invalid status");
        
        if (msg.sender != factory) {
            require(block.timestamp > repaymentDeadline + GRACE_PERIOD, "Grace period active");
        } else {
            require(block.timestamp > repaymentDeadline, "Not yet overdue");
        }

        status = Status.Defaulted;
        creditScore.recordDefault(borrower, principal);

        uint256 balance = usdc.balanceOf(address(this));
        uint256 distributed;
        if (balance > 0) {
            for (uint256 i = 0; i < lenders.length; i++) {
                address lender = lenders[i];
                uint256 share = i == lenders.length - 1
                    ? balance - distributed
                    : (contributions[lender] * balance) / principal;
                if (share > 0) {
                    distributed += share;
                    usdc.safeTransfer(lender, share);
                }
            }
        }

        if (contributions[lendingPool] > 0) {
            ILoanPool(lendingPool).settleLoan(principal);
        }

        emit LoanDefaulted(borrower);
    }

    function getTotalRepayment() public view returns (uint256) {
        uint256 interest = (principal * interestRateBps) / 10000;
        return principal + interest;
    }

    function getLendersCount() external view returns (uint256) {
        return lenders.length;
    }
}
