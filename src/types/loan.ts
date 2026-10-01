export type LoanStatus =
  | "Requested"
  | "Funded"
  | "Active"
  | "Repaid"
  | "Defaulted";

export interface Loan {
  id: string;
  borrower: string;
  lender: string | null; // Keeps backward compatibility (first lender or null)
  lenders?: string[];
  lendersCount: number;
  totalFunded: string;
  principal: string;
  remaining?: string;
  interestRate: string;
  duration: number; // days
  status: LoanStatus;
  createdAt: number;
  fundedAt?: number;
  repaymentDeadline?: number;
}

export interface AccountActivity {
  id: string;
  kind: "Loan created" | "Loan funded" | "Loan partially funded" | "Loan repaid" | "Loan defaulted" | "Pool deposit" | "Pool withdrawal";
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  loanAddress?: string;
  amount?: string;
  interest?: string;
}

export interface TransactionFeedback {
  status: "idle" | "pending" | "success" | "failed";
  message?: string;
  hash?: string;
  explorerUrl?: string;
}

export interface CreateLoanParams {
  amount: string;
  interestRate?: string;
  duration: number;
}
