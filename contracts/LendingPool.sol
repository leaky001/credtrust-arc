// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Loan.sol";

/**
 * @title LendingPool
 * @notice A USDC liquidity pool where lenders deposit to earn interest
 * and borrowers draw instant liquidity.
 */
contract LendingPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    string public constant name = "CredTrust Liquidity Vault";

    IERC20 public immutable usdc;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    uint256 public totalReceivables;
    mapping(address => uint256) public loanReceivables;

    address public factory;

    event Deposited(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdrawn(address indexed user, uint256 amount, uint256 sharesBurned);
    event LoanFunded(address indexed loan, uint256 amount);
    event LoanSettled(address indexed loan, uint256 amount);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can fund loans");
        _;
    }

    constructor(address _factory, address _usdc) {
        factory = _factory;
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Deposit USDC into the pool to earn interest
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Deposit must be > 0");

        uint256 assetsBefore = totalAssets();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        uint256 sharesToMint;
        if (totalShares == 0) {
            sharesToMint = amount;
        } else {
            require(assetsBefore > 0, "Invalid pool value");
            sharesToMint = (amount * totalShares) / assetsBefore;
        }
        require(sharesToMint > 0, "Deposit too small");

        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;

        emit Deposited(msg.sender, amount, sharesToMint);
    }

    /**
     * @notice Withdraw USDC and earned interest from the pool
     * @param sharesToBurn Number of shares to convert back to USDC
     */
    function withdraw(uint256 sharesToBurn) external nonReentrant {
        require(sharesToBurn > 0 && shares[msg.sender] >= sharesToBurn, "Invalid shares");

        uint256 amountToWithdraw = (sharesToBurn * totalAssets()) / totalShares;
        require(amountToWithdraw <= usdc.balanceOf(address(this)), "Insufficient liquid USDC");

        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        usdc.safeTransfer(msg.sender, amountToWithdraw);

        emit Withdrawn(msg.sender, amountToWithdraw, sharesToBurn);
    }

    /**
     * @notice Funds an approved loan request instantly from the pool
     * @param loanAddress The address of the Loan contract to fund
     */
    function fundLoan(address loanAddress) external onlyFactory nonReentrant {
        Loan loan = Loan(loanAddress);
        require(loan.status() == Loan.Status.Requested, "Loan not requestable");

        uint256 amount = loan.principal();
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient pool liquidity");

        usdc.safeTransfer(loanAddress, amount);
        loan.fundFromPool(amount);
        loanReceivables[loanAddress] = amount;
        totalReceivables += amount;

        emit LoanFunded(loanAddress, amount);
    }

    /**
     * @notice Settle a registered pool-funded loan's receivable on repayment or default.
     */
    function settleLoan(uint256 amount) external {
        uint256 outstanding = loanReceivables[msg.sender];
        require(outstanding > 0 && amount == outstanding, "Invalid loan settlement");
        delete loanReceivables[msg.sender];
        totalReceivables -= outstanding;
        emit LoanSettled(msg.sender, amount);
    }

    function totalAssets() public view returns (uint256) {
        return usdc.balanceOf(address(this)) + totalReceivables;
    }

    /**
     * @notice Returns the current value of a user's shares in USDC base units
     */
    function getBalanceOf(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[user] * totalAssets()) / totalShares;
    }
}
