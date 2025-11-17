export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
export type LoanFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface LoanDetails {
  amount: number;
  propertyValue: number;
  interestRate: number;
  repayment: number;
  frequency: LoanFrequency;
  offsetBalance: number;
}

export interface Person {
  id: number;
  name: string;
  age: number;
}

export interface IncomeItem {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
}

export interface ExpenseItem {
  id: number;
  name:string;
  amount: number;
  category: 'FFF' | 'Soft Expenses' | 'Hard Expenses' | 'Other';
  frequency: Frequency;
}

export interface OtherDebt {
  id: number;
  name: string;
  amount: number;
  interestRate: number;
  repayment: number;
  frequency: Frequency;
  remainingTerm: number; // in years
}

export interface FutureChange {
  id: number;
  description: string;
  type: 'income' | 'expense';
  changeAmount: number; // can be negative for reduction
  frequency: Frequency;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  isPermanent: boolean;
}

export interface FutureLumpSum {
  id: number;
  description: string;
  type: 'income' | 'expense';
  amount: number; // Always positive
  date: string; // 'YYYY-MM-DD'
}

export interface InvestmentPropertyExpense {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
}

export interface InvestmentProperty {
  id: number;
  address: string;
  propertyValue: number;
  loanAmount: number;
  offsetBalance: number;
  loanType: 'P&I' | 'IO';
  interestRate: number;
  loanTerm: number; // in years
  loanStartDate: string; // 'YYYY-MM-DD'
  repayment: number;
  repaymentFrequency: Frequency;
  expenses: InvestmentPropertyExpense[];
  rentalIncome: number;
  rentalIncomeFrequency: Frequency;
  isFuture?: boolean;
  purchaseDate?: string;
  rentalGrowthRate?: number;
  interestOnlyTerm?: number; // in years
}

export interface AppState {
  loan: LoanDetails;
  people: Person[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  otherDebts: OtherDebt[];
  futureChanges: FutureChange[];
  futureLumpSums: FutureLumpSum[];
  investmentProperties: InvestmentProperty[];
  crownMoneyInterestRate: number;
  clientEmail: string;
  clientPhone: string;
  investmentAmountPercentage: number; // The percentage of savings to invest
  investmentGrowthRate: number;
  idealRetirementAge: number;
  propertyGrowthRate: number;
  payoffStrategy: 'snowball' | 'simultaneous';
  currentLender: string;
  numberOfKids: number;
  allPartiesInAttendance: 'Yes- Single' | 'Yes- Couple' | 'Yes- Other' | 'Only 1 of 2 Showed';
  // New properties for Debt Recycling
  debtRecyclingEnabled: boolean;
  debtRecyclingInvestmentRate: number;
  debtRecyclingLoanInterestRate: number;
  marginalTaxRate: number;
  debtRecyclingPercentage: number;
  notepadContent: string;
}

export enum Tab {
  CurrentLoan,
  InterestBreakdown,
  InvestmentProperties,
  IncomeExpenses,
  OODC,
  InvestmentOODC,
  DebtRecycling,
  In2Wealth,
  Reports,
  Summary,
}

export interface AmortizationDataPoint {
  month: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
  offsetBalance: number;
  // New properties to track total portfolio
  totalInterestPaid?: number;
  totalPrincipalPaid?: number;
  totalRemainingBalance?: number;
}

export interface LoanSummary {
  termInYears: number;
  totalInterest: number;
  totalPaid: number;
  amortizationSchedule: AmortizationDataPoint[];
  // Optional schedules for debt recycling
  investmentLoanSchedule?: { month: number; balance: number }[];
  investmentPortfolioSchedule?: { month: number; value: number }[];
  finalInvestmentPortfolioValue?: number;
  finalInvestmentLoanBalance?: number;
}

export interface SavedScenario {
  id: number;
  name: string;
  timestamp: number;
  data: AppState;
}