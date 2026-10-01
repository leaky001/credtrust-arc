export const CREDIT_SCORE_ABI = [
	"function getScore(address user) view returns (uint256)",
	"function calculateInterestRate(address user) view returns (uint256)",
];

export const LOAN_FACTORY_ABI = [
	"function createLoan(uint256 principal, uint256 durationDays) returns (uint256 loanId)",
	"function borrowFromPool(uint256 principal, uint256 durationDays) returns (uint256 loanId)",
	"function listLoans() view returns (address[])",
	"function getLendingPool() view returns (address)",
	"function getLoan(uint256 loanId) view returns (address)",
	"function loanCount() view returns (uint256)",
	"event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 principal, uint256 interestRateBps, uint256 durationDays)",
];

export const LOAN_ABI = [
	"function borrower() view returns (address)",
	"function principal() view returns (uint256)",
	"function interestRateBps() view returns (uint256)",
	"function durationDays() view returns (uint256)",
	"function status() view returns (uint8)",
	"function fundedAt() view returns (uint256)",
	"function repaymentDeadline() view returns (uint256)",
	"function totalFunded() view returns (uint256)",
	"function getLendersCount() view returns (uint256)",
	"function lenders(uint256 index) view returns (address)",
	"function getTotalRepayment() view returns (uint256)",
	"function fund(uint256 amount)",
	"function repay()",
	"function markDefaulted()",
	"event LoanFunded(address indexed lender, uint256 amount)",
	"event LoanPartiallyFunded(address indexed lender, uint256 amount, uint256 remaining)",
	"event LoanRepaid(address indexed borrower, uint256 principal, uint256 interest)",
	"event LoanDefaulted(address indexed borrower)",
];

export const LENDING_POOL_ABI = [
	"function deposit(uint256 amount)",
	"function withdraw(uint256 sharesToBurn)",
	"function getBalanceOf(address user) view returns (uint256)",
	"function totalShares() view returns (uint256)",
	"function shares(address user) view returns (uint256)",
	"function totalAssets() view returns (uint256)",
	"event Deposited(address indexed user, uint256 amount, uint256 sharesMinted)",
	"event Withdrawn(address indexed user, uint256 amount, uint256 sharesBurned)",
];
