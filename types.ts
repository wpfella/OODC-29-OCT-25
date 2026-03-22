
export enum Tab {
  CurrentLoan = 'current-loan',
  InterestBreakdown = 'interest-breakdown',
  InvestmentProperties = 'investment-properties',
  IncomeExpenses = 'income-expenses',
  OODC = 'oodc',
  InvestmentOODC = 'investment-oodc',
  DebtRecycling = 'debt-recycling',
  In2Wealth = 'in2wealth',
  Reports = 'reports',
  Summary = 'summary',
}

export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'annually' | 'quarterly';
export type LoanFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface ExpenseItem {
  id: number;
  name: string;
  amount: number;
  category: string;
  frequency: Frequency;
}

export interface CustomSection {
  id: string;
  tab: string;
  title: string;
  html: string;
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

export interface OtherDebt {
  id: number;
  name: string;
  amount: number;
  interestRate: number;
  repayment: number;
  frequency: Frequency;
  remainingTerm: number;
}

export interface FutureChange {
  id: number;
  type: 'income' | 'expense';
  startDate: string;
  endDate: string;
  isPermanent: boolean;
  changeAmount: number;
  frequency: Frequency;
  description: string;
  name?: string;
  amount?: number;
  startYear?: number;
  duration?: number;
}

export interface FutureLumpSum {
  id: number;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  name?: string;
  year?: number;
}

export interface InvestmentPropertyExpense {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
}

export interface InvestmentProperty {
  id: number;
  name: string;
  value: number;
  propertyValue?: number;
  loanAmount: number;
  interestRate: number;
  rent: number;
  rentalIncome: number;
  rentalIncomeFrequency: Frequency;
  expenses: InvestmentPropertyExpense[];
  growthRate: number;
  rentalGrowthRate?: number;
  address?: string;
  isFuture?: boolean;
  crownSettings?: {
    interestRate: number;
  };
  offsetBalance?: number;
  repayment: number;
  repaymentFrequency: Frequency;
  loanType?: 'P&I' | 'IO';
  loanTerm?: number;
  interestOnlyTerm?: number;
}

export interface LoanDetails {
  amount: number;
  propertyValue: number;
  interestRate: number;
  repayment: number;
  frequency: Frequency;
  offsetBalance: number;
  loanType?: 'P&I' | 'IO';
  loanTerm?: number;
  interestOnlyTerm?: number;
}

export interface AmortizationDataPoint {
  month: number;
  balance?: number;
  remainingBalance: number;
  interest?: number;
  interestPaid: number;
  principal?: number;
  principalPaid: number;
  offsetBenefit?: number;
  cumulativeInterest?: number;
  offsetBalance: number;
}

export interface LoanSummary {
  termInYears: number;
  totalInterest: number;
  totalPrincipal?: number;
  totalPaid: number;
  payoffMonths?: number;
  payoffYears?: number;
  monthlyRepayment?: number;
  amortizationSchedule: AmortizationDataPoint[];
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
  investmentAmountPercentage: number;
  investmentGrowthRate: number;
  idealRetirementAge: number;
  propertyGrowthRate: number;
  payoffStrategy: string;
  currentLender: string;
  numberOfKids: number;
  allPartiesInAttendance: string;
  debtRecyclingEnabled: boolean;
  debtRecyclingInvestmentRate: number;
  debtRecyclingLoanInterestRate: number;
  marginalTaxRate: number;
  debtRecyclingPercentage: number;
  notepadContent: string;
  investmentCashflowScenario: string;
  customSections: CustomSection[];
}

export interface SavedScenario {
  id: number;
  name: string;
  timestamp: number;
  data: AppState;
}
