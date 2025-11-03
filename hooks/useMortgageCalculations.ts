import { useMemo } from 'react';
import { AppState, LoanDetails, Frequency, AmortizationDataPoint, LoanSummary, FutureChange, InvestmentProperty, LoanFrequency, FutureLumpSum, OtherDebt } from '../types';

const MONTHS_IN_YEAR = 12;
const MAX_YEARS = 100;
const MAX_MONTHS = MAX_YEARS * MONTHS_IN_YEAR;

export const getMonthlyAmount = (amount: number, frequency: Frequency): number => {
    switch (frequency) {
        case 'weekly': return amount * (52 / 12);
        case 'fortnightly': return amount * (26 / 12);
        case 'monthly': return amount;
        case 'quarterly': return amount / 3;
        case 'annually': return amount / 12;
        default: return amount;
    }
};

// Helper to calculate P&I repayment for any frequency
export const calculatePIPayment = (principal: number, annualRate: number, termYears: number, frequency: Frequency): number => {
    if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
    const rate = annualRate / 100;
    let n, c; // n = number of periods, c = periodic interest rate
    switch (frequency) {
        case 'weekly': n = termYears * 52; c = rate / 52; break;
        case 'fortnightly': n = termYears * 26; c = rate / 26; break;
        case 'monthly': n = termYears * 12; c = rate / 12; break;
        case 'quarterly': n = termYears * 4; c = rate / 4; break;
        case 'annually': n = termYears; c = rate; break;
        default: return 0;
    }
    if (c === 0) return principal / n;
    return principal * (c * Math.pow(1 + c, n)) / (Math.pow(1 + c, n) - 1);
};

// Helper to calculate IO repayment for any frequency
export const calculateIOPayment = (principal: number, annualRate: number, frequency: Frequency): number => {
    if (principal <= 0 || annualRate <= 0) return 0;
    const annualInterest = principal * (annualRate / 100);
    switch (frequency) {
        case 'weekly': return annualInterest / 52;
        case 'fortnightly': return annualInterest / 26;
        case 'monthly': return annualInterest / 12;
        case 'quarterly': return annualInterest / 4;
        case 'annually': return annualInterest;
        default: return 0;
    }
};

interface AmortizationConfig {
    extraMonthlyPayment?: number;
    futureChanges?: FutureChange[];
    futureLumpSums?: FutureLumpSum[];
    strategy?: 'bank' | 'crown';
    debtRecyclingConfig?: {
        investmentRate: number;
        loanInterestRate: number;
        marginalTaxRate: number;
        percentage: number;
    }
}

export const calculateAmortization = (
    loanDetails: {
        amount: number;
        interestRate: number;
        repayment: number;
        frequency: Frequency;
        offsetBalance: number;
        loanType?: 'P&I' | 'IO';
        loanTerm?: number; // in years
        interestOnlyTerm?: number; // in years
    },
    config: AmortizationConfig = {}
): LoanSummary => {
    const {
        extraMonthlyPayment = 0,
        futureChanges = [],
        futureLumpSums = [],
        strategy = 'bank', // Default to 'bank' for safety
        debtRecyclingConfig
    } = config;
    
    const {
        amount,
        interestRate,
        offsetBalance,
        loanType = 'P&I',
        loanTerm = 30,
        interestOnlyTerm = 0,
    } = loanDetails;
    const { repayment, frequency } = loanDetails;

    if (amount <= 0) {
        return { termInYears: 0, totalInterest: 0, totalPaid: 0, amortizationSchedule: [] };
    }

    let balance = amount;
    let currentOffsetBalance = offsetBalance || 0;
    const monthlyRate = interestRate / 100 / MONTHS_IN_YEAR;
    let currentMonthlyRepayment = getMonthlyAmount(repayment, frequency as Frequency);
    const ioMonths = Math.round((interestOnlyTerm || 0) * MONTHS_IN_YEAR);

    let totalInterest = 0;
    const amortizationSchedule: AmortizationDataPoint[] = [];
    
    // --- Debt Recycling State ---
    let investmentLoanBalance = 0;
    let investmentPortfolioValue = 0;
    let netInvestmentReturn = 0; // The return from previous month, to be applied this month
    const investmentLoanSchedule: { month: number, balance: number }[] = [];
    const investmentPortfolioSchedule: { month: number, value: number }[] = [];
    // --- End Debt Recycling State ---
    
    const today = new Date();
    const futureChangesByMonth: Record<number, number> = {};
    futureChanges.forEach(change => {
        const startDate = new Date(change.startDate);
        const startMonth = Math.max(0, (startDate.getFullYear() - today.getFullYear()) * 12 + startDate.getMonth() - today.getMonth());
        
        const endMonth = change.isPermanent 
            ? MAX_MONTHS 
            : (new Date(change.endDate).getFullYear() - today.getFullYear()) * 12 + new Date(change.endDate).getMonth() - today.getMonth();

        const monthlyChange = getMonthlyAmount(change.changeAmount, change.frequency) * (change.type === 'income' ? 1 : -1);
        
        for (let m = startMonth; m <= endMonth; m++) {
            futureChangesByMonth[m] = (futureChangesByMonth[m] || 0) + monthlyChange;
        }
    });

    const lumpSumChangesByMonth: Record<number, number> = {};
    if (futureLumpSums) {
        futureLumpSums.forEach(lump => {
            const lumpDate = new Date(lump.date);
            const lumpMonth = Math.max(0, (lumpDate.getFullYear() - today.getFullYear()) * 12 + lumpDate.getMonth() - today.getMonth());
            const changeAmount = lump.type === 'income' ? Math.abs(lump.amount) : -Math.abs(lump.amount);
            lumpSumChangesByMonth[lumpMonth] = (lumpSumChangesByMonth[lumpMonth] || 0) + changeAmount;
        });
    }

    for (let month = 1; month <= MAX_MONTHS; month++) {
        // Apply lump sum changes at the start of the month
        if (lumpSumChangesByMonth[month - 1]) {
            const changeAmount = lumpSumChangesByMonth[month - 1]; // This is signed (+ for income, - for expense)
            
            if (strategy === 'crown') {
                // Crown strategy: directly impact principal
                balance -= changeAmount; // Income reduces balance, expense increases it
            } else { // Bank strategy
                if (changeAmount > 0) { // Income
                    currentOffsetBalance += changeAmount;
                } else { // Expense (redraw)
                    const expenseAmount = Math.abs(changeAmount);
                    if (currentOffsetBalance >= expenseAmount) {
                        currentOffsetBalance -= expenseAmount;
                    } else {
                        const remainder = expenseAmount - currentOffsetBalance;
                        currentOffsetBalance = 0;
                        balance += remainder; // Redraw from loan
                    }
                }
            }

            if (balance < 0) balance = 0;
        }


        if (balance <= 0) {
             if (amortizationSchedule.length === 0 || amortizationSchedule[amortizationSchedule.length - 1].month < month) {
                 amortizationSchedule.push({
                    month,
                    interestPaid: 0,
                    principalPaid: 0,
                    remainingBalance: 0,
                    offsetBalance: currentOffsetBalance,
                });
            }
            break; 
        }

        // If IO term ends, recalculate repayment to P&I
        if (loanType === 'IO' && month === ioMonths + 1) {
            const remainingTermYears = loanTerm - (interestOnlyTerm || 0);
            if (remainingTermYears > 0) {
                const newPIRepayment = calculatePIPayment(balance, interestRate, remainingTermYears, frequency as LoanFrequency);
                currentMonthlyRepayment = getMonthlyAmount(newPIRepayment, frequency as LoanFrequency);
            } else {
                currentMonthlyRepayment = 0; // Balloon payment due, loan won't pay off itself
            }
        }

        const effectiveOffset = Math.min(balance, currentOffsetBalance);
        const interestPaid = (balance - effectiveOffset) * monthlyRate;
        
        const surplusChangeForMonth = futureChangesByMonth[month - 1] || 0;
        const currentExtraPayment = extraMonthlyPayment + surplusChangeForMonth + netInvestmentReturn;
        const totalPayment = currentMonthlyRepayment + Math.max(0, currentExtraPayment);

        if (totalPayment <= interestPaid && month > 12 && Object.keys(futureChangesByMonth).length === 0 && extraMonthlyPayment === 0) {
             return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule };
        }
        
        let principalPaid = totalPayment - interestPaid;
        
        if (balance - principalPaid < 0) {
            principalPaid = balance;
        }
        
        balance -= principalPaid;
        totalInterest += interestPaid;

        // --- Debt Recycling Logic ---
        if (debtRecyclingConfig && principalPaid > 0) {
            const { investmentRate, loanInterestRate, marginalTaxRate, percentage = 100 } = debtRecyclingConfig;
            
            const amountToRecycle = principalPaid * (percentage / 100);
            investmentLoanBalance += amountToRecycle;
            investmentPortfolioValue += amountToRecycle;

            const investmentReturns = (investmentPortfolioValue * investmentRate / 100) / 12;
            const investmentLoanInterest = (investmentLoanBalance * loanInterestRate / 100) / 12;
            
            const netProfitBeforeTax = investmentReturns - investmentLoanInterest;
            netInvestmentReturn = netProfitBeforeTax * (1 - (marginalTaxRate / 100));
        }
        
        if (debtRecyclingConfig) {
            investmentLoanSchedule.push({ month, balance: investmentLoanBalance });
            investmentPortfolioSchedule.push({ month, value: investmentPortfolioValue });
        }
        // --- End Debt Recycling Logic ---

        amortizationSchedule.push({
            month,
            interestPaid,
            principalPaid,
            remainingBalance: balance,
            offsetBalance: currentOffsetBalance,
        });
    }

    if (balance > 0) {
        return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule };
    }
    
    const finalMonth = amortizationSchedule.length > 0 ? amortizationSchedule[amortizationSchedule.length - 1].month : 0;
    const totalPaidFromSchedule = amortizationSchedule.reduce((sum, entry) => sum + entry.principalPaid + entry.interestPaid, 0);

    return {
        termInYears: finalMonth / MONTHS_IN_YEAR,
        totalInterest,
        totalPaid: totalPaidFromSchedule,
        amortizationSchedule,
        ...(debtRecyclingConfig && {
            investmentLoanSchedule,
            investmentPortfolioSchedule,
            finalInvestmentLoanBalance: investmentLoanBalance,
            finalInvestmentPortfolioValue: investmentPortfolioValue,
        }),
    };
};

export const useMortgageCalculations = (appState: AppState) => {
    const { 
        loan, incomes, expenses, otherDebts, investmentProperties, futureChanges, futureLumpSums, 
        investmentAmountPercentage, investmentGrowthRate, idealRetirementAge, 
        propertyGrowthRate, crownMoneyInterestRate, payoffStrategy, people,
        debtRecyclingEnabled, debtRecyclingInvestmentRate, debtRecyclingLoanInterestRate, marginalTaxRate, debtRecyclingPercentage
    } = appState;

    const youngestPersonAge = useMemo(() => Math.min(...people.map(p => p.age)), [people]);

    const totalInitialDebt = useMemo(() => {
        return loan.amount + otherDebts.reduce((sum, debt) => sum + debt.amount, 0);
    }, [loan.amount, otherDebts]);

    const totalInitialNetDebt = useMemo(() => {
        return totalInitialDebt - (loan.offsetBalance || 0);
    }, [totalInitialDebt, loan.offsetBalance]);

    const budgetCalculations = useMemo(() => {
        const investmentPropertiesNetCashflow = investmentProperties.reduce((total, prop) => {
            if (prop.isFuture) return total;
            const monthlyIncome = getMonthlyAmount(prop.rentalIncome, prop.rentalIncomeFrequency);
            const monthlyRepayment = getMonthlyAmount(prop.repayment, prop.repaymentFrequency);
            const monthlyExpenses = prop.expenses.reduce((sum, exp) => sum + getMonthlyAmount(exp.amount, exp.frequency), 0);
            return total + (monthlyIncome - monthlyRepayment - monthlyExpenses);
        }, 0);
        
        const totalMonthlyIncome = incomes.reduce((sum, income) => sum + getMonthlyAmount(income.amount, income.frequency), 0) + Math.max(0, investmentPropertiesNetCashflow);
        
        const totalMonthlyLivingExpenses = expenses.reduce((sum, expense) => sum + getMonthlyAmount(expense.amount, expense.frequency), 0);
        
        const bankScenarioOtherDebtRepayments = otherDebts.reduce((sum, debt) => sum + getMonthlyAmount(debt.repayment, debt.frequency), 0);
        
        // Per business rule, Total Monthly Expenses should NOT include debt repayments.
        const totalMonthlyExpenses = totalMonthlyLivingExpenses + Math.abs(Math.min(0, investmentPropertiesNetCashflow));
        
        // For Crown, the surplus is calculated BEFORE any debt repayments, as the surplus is what pays the debts.
        const surplus = totalMonthlyIncome - totalMonthlyLivingExpenses;

        return {
            investmentPropertiesNetCashflow,
            totalMonthlyIncome,
            totalMonthlyExpenses,
            totalMonthlyLivingExpenses,
            surplus,
            bankScenarioOtherDebtRepayments,
        };
    }, [incomes, expenses, investmentProperties, otherDebts]);

    const bankLoanCalculation = useMemo(() => {
        // 1. Calculate primary loan amortization (netted against offset)
        const primaryLoanDetails = { 
            ...loan, 
            amount: loan.amount - (loan.offsetBalance || 0),
            offsetBalance: 0, 
        };
        // The bank's calculation should NOT be affected by future income/expense changes, only by lump sums.
        const primaryLoanCalc = calculateAmortization(primaryLoanDetails, { futureLumpSums, strategy: 'bank' });
    
        // 2. Calculate amortization for each "Other Debt" separately
        const otherDebtCalcs = otherDebts.map(debt => {
            return calculateAmortization({
                amount: debt.amount,
                interestRate: debt.interestRate,
                repayment: debt.repayment,
                frequency: debt.frequency,
                offsetBalance: 0,
                loanTerm: debt.remainingTerm,
            }, { strategy: 'bank' });
        });
    
        // 3. Combine results for a total portfolio view
        const allSchedules = [primaryLoanCalc, ...otherDebtCalcs];
        const maxMonths = Math.max(...allSchedules.map(calc => calc.amortizationSchedule.length));
    
        const isUnpayable = allSchedules.some(calc => calc.termInYears === Infinity);
        if (isUnpayable || maxMonths === 0) {
            return {
                termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [],
                primaryLoanInterest: Infinity, otherDebtsInterest: Infinity,
                year1PrimaryLoanInterest: Infinity, year1OtherDebtsInterest: Infinity,
                bankOtherDebtsMaxTerm: Infinity,
                year1PrimaryLoanPrincipal: 0, year1OtherDebtsPrincipal: 0
            };
        }
    
        const combinedSchedule: AmortizationDataPoint[] = [];
        let totalInterest = 0;
        let totalPaid = 0;
    
        for (let month = 1; month <= maxMonths; month++) {
            let monthInterest = 0;
            let monthPrincipal = 0;
            let monthRemaining = 0;
    
            allSchedules.forEach(calc => {
                const dataPoint = calc.amortizationSchedule[month - 1];
                if (dataPoint) {
                    monthInterest += dataPoint.interestPaid;
                    monthPrincipal += dataPoint.principalPaid;
                    monthRemaining += dataPoint.remainingBalance;
                }
            });
            
            totalInterest += monthInterest;
            totalPaid += monthInterest + monthPrincipal;
    
            combinedSchedule.push({
                month,
                interestPaid: primaryLoanCalc.amortizationSchedule[month-1]?.interestPaid ?? 0,
                principalPaid: primaryLoanCalc.amortizationSchedule[month-1]?.principalPaid ?? 0,
                remainingBalance: primaryLoanCalc.amortizationSchedule[month-1]?.remainingBalance ?? 0,
                offsetBalance: primaryLoanCalc.amortizationSchedule[month-1]?.offsetBalance ?? 0,
                totalInterestPaid: monthInterest,
                totalPrincipalPaid: monthPrincipal,
                totalRemainingBalance: monthRemaining,
            });
        }
        
        const otherDebtsInterest = otherDebtCalcs.reduce((sum, calc) => sum + calc.totalInterest, 0);
        const year1PrimaryLoanInterest = primaryLoanCalc.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.interestPaid, 0);
        const year1OtherDebtsInterest = otherDebtCalcs.reduce((total, calc) => 
            total + calc.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.interestPaid, 0), 0);
        const bankOtherDebtsMaxTerm = Math.max(0, ...otherDebtCalcs.map(c => c.termInYears));

        const year1PrimaryLoanPrincipal = primaryLoanCalc.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.principalPaid, 0);
        const year1OtherDebtsPrincipal = otherDebtCalcs.reduce((total, calc) => 
            total + calc.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.principalPaid, 0), 0);

        return {
            termInYears: maxMonths / 12, // The true term is when the LAST debt is paid
            totalInterest: totalInterest,
            totalPaid: totalPaid,
            amortizationSchedule: combinedSchedule,
            primaryLoanInterest: primaryLoanCalc.totalInterest,
            otherDebtsInterest,
            year1PrimaryLoanInterest,
            year1OtherDebtsInterest,
            bankOtherDebtsMaxTerm,
            year1PrimaryLoanPrincipal,
            year1OtherDebtsPrincipal,
        };
    }, [loan, otherDebts, futureLumpSums]);

    const crownMoneyLoanCalculation = useMemo(() => {
        const { surplus } = budgetCalculations;

        if (surplus <= 0 && getMonthlyAmount(loan.repayment, loan.frequency) <= 0) {
            return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [], primaryLoanInterest: Infinity, otherDebtsInterest: 0, year1PrimaryLoanInterest: Infinity, year1OtherDebtsInterest: 0, year1PrimaryOnlyPrincipalPaid: 0 };
        }

        // ALL other debts are consolidated.
        const consolidatedAmount = otherDebts.reduce((sum, d) => sum + d.amount, 0);

        // The repayment for Crown is effectively the entire surplus.
        const crownLoanDetailsForCalc = {
            amount: (loan.amount + consolidatedAmount) - (loan.offsetBalance || 0),
            interestRate: crownMoneyInterestRate,
            repayment: surplus, // The entire surplus is used for repayment.
            frequency: 'monthly' as const,
            offsetBalance: 0,
        };

        const result = calculateAmortization(crownLoanDetailsForCalc, {
            futureChanges,
            futureLumpSums,
            strategy: 'crown'
        });

        // Simulate first year for primary loan only to show comparison
        const primaryOnlyLoanDetailsForCalc = {
            amount: (loan.amount) - (loan.offsetBalance || 0),
            interestRate: crownMoneyInterestRate,
            repayment: surplus, 
            frequency: 'monthly' as const,
            offsetBalance: 0,
        };
        const primaryOnlyResult = calculateAmortization(primaryOnlyLoanDetailsForCalc, {
            futureChanges,
            futureLumpSums,
            strategy: 'crown'
        });

        const year1PrimaryOnlyPrincipalPaid = primaryOnlyResult.termInYears !== Infinity 
            ? primaryOnlyResult.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.principalPaid, 0)
            : 0;

        if (result.termInYears === Infinity) {
            return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [], primaryLoanInterest: Infinity, otherDebtsInterest: 0, year1PrimaryLoanInterest: Infinity, year1OtherDebtsInterest: 0, year1PrimaryOnlyPrincipalPaid: 0 };
        }
        
        const year1PrimaryLoanInterest = result.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.interestPaid, 0);

        return {
            ...result,
            primaryLoanInterest: result.totalInterest,
            otherDebtsInterest: 0,
            year1PrimaryLoanInterest: year1PrimaryLoanInterest,
            year1OtherDebtsInterest: 0,
            otherDebtPayoffDetails: [],
            year1PrimaryOnlyPrincipalPaid,
            amortizationSchedule: result.amortizationSchedule.map(point => ({
                ...point,
                totalInterestPaid: point.interestPaid,
                totalPrincipalPaid: point.principalPaid,
                totalRemainingBalance: point.remainingBalance,
            }))
        };
    }, [loan, otherDebts, budgetCalculations, crownMoneyInterestRate, futureChanges, futureLumpSums]);

    const debtRecyclingCalculation = useMemo(() => {
        const { totalMonthlyIncome, totalMonthlyExpenses } = budgetCalculations;
        const monthlyPrimaryLoanRepayment = getMonthlyAmount(loan.repayment, loan.frequency);
        const surplusAfterLivingAndInvestmentExpenses = totalMonthlyIncome - totalMonthlyExpenses;
        const extraMonthlyPaymentForCrown = Math.max(0, surplusAfterLivingAndInvestmentExpenses - monthlyPrimaryLoanRepayment);
        const netPrimaryLoanAmount = loan.amount - (loan.offsetBalance || 0);

        const crownLoanDetailsForPrimary: LoanDetails = {
            ...loan,
            amount: netPrimaryLoanAmount,
            offsetBalance: 0,
            interestRate: crownMoneyInterestRate,
        };

        return calculateAmortization(crownLoanDetailsForPrimary, {
            extraMonthlyPayment: extraMonthlyPaymentForCrown,
            futureChanges,
            futureLumpSums,
            strategy: 'crown',
            debtRecyclingConfig: {
                investmentRate: debtRecyclingInvestmentRate,
                loanInterestRate: debtRecyclingLoanInterestRate,
                marginalTaxRate: marginalTaxRate,
                percentage: debtRecyclingPercentage,
            }
        });
    }, [loan, budgetCalculations, crownMoneyInterestRate, futureChanges, futureLumpSums, debtRecyclingInvestmentRate, debtRecyclingLoanInterestRate, marginalTaxRate, debtRecyclingPercentage]);

    const investmentLoanCalculations = useMemo(() => {
        if (investmentProperties.length === 0) {
            return { totalBankInterest: 0, totalCrownInterest: 0, totalBankTerm: 0, totalCrownTerm: 0, investmentPayoffSchedule: [], totalInvestmentDebt: 0, payoffBreakpoints: [] };
        }

        let totalBankInterest = 0, totalBankTerm = 0;
        const investmentPayoffSchedule: any[] = [];
        
        investmentProperties.forEach(prop => {
            const propLoan = {
                amount: prop.loanAmount, interestRate: prop.interestRate, repayment: prop.repayment,
                frequency: prop.repaymentFrequency, offsetBalance: prop.offsetBalance, loanType: prop.loanType,
                loanTerm: prop.loanTerm, interestOnlyTerm: prop.interestOnlyTerm,
            };
            const bankCalc = calculateAmortization({ ...propLoan, amount: prop.loanAmount }, { strategy: 'bank' });
            totalBankInterest += bankCalc.totalInterest;
            totalBankTerm = Math.max(totalBankTerm, bankCalc.termInYears);
            investmentPayoffSchedule.push({ propertyId: prop.id, propertyAddress: prop.address, loanAmount: prop.loanAmount, bank: bankCalc, crown: { termInYears: Infinity, totalInterest: Infinity, amortizationSchedule: [] } });
        });
        
        let totalCrownInterest = 0, totalCrownTerm = 0;
        const payoffBreakpoints: { year: number, age: number, label: string }[] = [];

        if (crownMoneyLoanCalculation.termInYears !== Infinity) {
            const primaryPayoffMonths = Math.ceil(crownMoneyLoanCalculation.termInYears * 12);
            payoffBreakpoints.push({ year: crownMoneyLoanCalculation.termInYears, age: youngestPersonAge + crownMoneyLoanCalculation.termInYears, label: 'Primary Home Paid Off' });

            const { surplus } = budgetCalculations;
            const investmentSnowballPayment = Math.max(0, surplus);

            if (payoffStrategy === 'snowball') {
                let cumulativeMonthsOffset = primaryPayoffMonths;
                const sortedProps = [...investmentProperties].sort((a, b) => a.loanAmount - b.loanAmount);

                for (const prop of sortedProps) {
                    const netInvestmentLoanAmount = prop.loanAmount - (prop.offsetBalance || 0);
                    const minPIRepaymentInvestment = netInvestmentLoanAmount > 0 ? calculatePIPayment(netInvestmentLoanAmount, prop.interestRate, prop.loanTerm, 'monthly') : 0;
                    const investmentPayment = Math.max(investmentSnowballPayment, minPIRepaymentInvestment);

                    const propLoan = {
                       amount: netInvestmentLoanAmount, interestRate: prop.interestRate, repayment: investmentPayment,
                       frequency: 'monthly' as Frequency, offsetBalance: 0, loanType: 'P&I' as 'P&I' | 'IO',
                       loanTerm: prop.loanTerm, interestOnlyTerm: 0,
                    };
                    const payoffCalc = calculateAmortization(propLoan, { strategy: 'crown' });
                    
                    if (payoffCalc.termInYears !== Infinity) {
                        totalCrownInterest += payoffCalc.totalInterest;
                        const scheduleItem = investmentPayoffSchedule.find(p => p.propertyId === prop.id);
                        if (scheduleItem) {
                            scheduleItem.crown = { ...payoffCalc, startYear: cumulativeMonthsOffset / 12, durationYears: payoffCalc.termInYears, standaloneCalc: payoffCalc };
                        }
                        cumulativeMonthsOffset += Math.ceil(payoffCalc.termInYears * 12);
                        payoffBreakpoints.push({ year: cumulativeMonthsOffset / 12, age: youngestPersonAge + (cumulativeMonthsOffset / 12), label: `${prop.address} Paid Off` });
                    }
                }
                totalCrownTerm = (cumulativeMonthsOffset - primaryPayoffMonths) / 12;

            } else { // 'simultaneous'
                let balances = investmentProperties.reduce((acc, p) => ({ ...acc, [p.id]: p.loanAmount - (p.offsetBalance || 0) }), {} as Record<number, number>);
                const schedules = investmentProperties.reduce((acc, p) => ({...acc, [p.id]: [] as AmortizationDataPoint[]}), {} as Record<number, AmortizationDataPoint[]>);

                for (let month = 1; month <= MAX_MONTHS; month++) {
                    let totalDebt = Object.values(balances).reduce((s, b) => s + b, 0);
                    if (totalDebt <= 0) break;

                    if (month <= primaryPayoffMonths) {
                        investmentProperties.forEach(p => schedules[p.id].push({ month, interestPaid: 0, principalPaid: 0, remainingBalance: balances[p.id], offsetBalance: 0 }));
                    } else {
                        investmentProperties.forEach(p => {
                            if (balances[p.id] > 0) {
                                const proportion = balances[p.id] / totalDebt;
                                const payment = investmentSnowballPayment * proportion;
                                const interest = balances[p.id] * (p.interestRate / 100 / 12);
                                const principal = payment - interest;
                                balances[p.id] = Math.max(0, balances[p.id] - principal);
                                schedules[p.id].push({ month, interestPaid: interest, principalPaid: principal, remainingBalance: balances[p.id], offsetBalance: 0 });
                            } else {
                                schedules[p.id].push({ month, interestPaid: 0, principalPaid: 0, remainingBalance: 0, offsetBalance: 0 });
                            }
                        });
                    }
                }

                investmentProperties.forEach(p => {
                     const scheduleItem = investmentPayoffSchedule.find(item => item.propertyId === p.id);
                     if (scheduleItem && schedules[p.id].length > 0) {
                        let lastPaymentIndex = -1;
                        const schedule = schedules[p.id];
                        for (let i = schedule.length - 1; i >= 0; i--) {
                            if (schedule[i].principalPaid > 0) { lastPaymentIndex = i; break; }
                        }
                        const term = ((lastPaymentIndex + 1) - primaryPayoffMonths) / 12;
                        const interest = schedules[p.id].reduce((s, dp) => s + dp.interestPaid, 0);
                        const totalPaidFromSchedule = schedules[p.id].reduce((s, dp) => s + dp.principalPaid + dp.interestPaid, 0);
                        totalCrownInterest += interest;
                        scheduleItem.crown = { termInYears: term, totalInterest: interest, amortizationSchedule: schedules[p.id], totalPaid: totalPaidFromSchedule, startYear: primaryPayoffMonths / 12, durationYears: term };
                     }
                });
                const maxMonths = Object.values(schedules).reduce((max, s) => Math.max(max, s.length > 0 ? s[s.length-1].month : 0), 0);
                totalCrownTerm = (maxMonths - primaryPayoffMonths) / 12;
            }
        }

        return {
            totalBankInterest, totalCrownInterest, totalBankTerm,
            totalCrownTerm: Math.max(0, totalCrownTerm),
            investmentPayoffSchedule,
            totalInvestmentDebt: investmentProperties.reduce((sum, p) => sum + p.loanAmount, 0),
            payoffBreakpoints,
        };
    }, [investmentProperties, crownMoneyLoanCalculation, payoffStrategy, youngestPersonAge, budgetCalculations]);

    const wealthCalculations = useMemo(() => {
        const { surplus } = budgetCalculations;
        const wealthCalcs = (endAge: number) => {
            let wealth = 0, cashInHand = 0, homeEquity = 0;
            const crownPayoffMonths = crownMoneyLoanCalculation.termInYears * 12;
            
            if (isFinite(crownPayoffMonths)) {
                const monthlyInvestmentPower = surplus;
                const monthlyInvestment = monthlyInvestmentPower * (investmentAmountPercentage / 100);
                const monthlyCash = monthlyInvestmentPower - monthlyInvestment;
                const investmentMonths = (endAge - (youngestPersonAge + crownMoneyLoanCalculation.termInYears)) * 12;

                if (investmentMonths > 0) {
                     const monthlyGrowthRate = Math.pow(1 + (investmentGrowthRate / 100), 1/12) - 1;
                     wealth = monthlyGrowthRate > 0 ? monthlyInvestment * ((Math.pow(1 + monthlyGrowthRate, investmentMonths) - 1) / monthlyGrowthRate) : monthlyInvestment * investmentMonths;
                    cashInHand = monthlyCash * investmentMonths;
                }
            }
            const homeValueYears = endAge - youngestPersonAge;
            const initialPropertyValue = loan.propertyValue; 
            homeEquity = initialPropertyValue * Math.pow(1 + (propertyGrowthRate / 100), homeValueYears);
            return { wealth, cashInHand, homeEquity };
        };
        const bankDebtFreeAge = youngestPersonAge + bankLoanCalculation.termInYears;
        const wealthProjection = isFinite(bankDebtFreeAge) ? wealthCalcs(bankDebtFreeAge) : { wealth: 0, cashInHand: 0, homeEquity: 0 };
        const retirementWealthProjection = wealthCalcs(idealRetirementAge);
        return { wealthProjection, retirementWealthProjection, wealthCalcs };
    }, [budgetCalculations, crownMoneyLoanCalculation, investmentAmountPercentage, investmentGrowthRate, idealRetirementAge, youngestPersonAge, loan.propertyValue, propertyGrowthRate, bankLoanCalculation.termInYears]);

    const netWorthProjection = useMemo(() => {
        const { wealthCalcs } = wealthCalculations;
        const projection: {age: number, bank: number, crown: number}[] = [];
        const startAge = youngestPersonAge;
        const initialPropertyValue = loan.propertyValue;

        for (let age = startAge; age <= idealRetirementAge; age++) {
            const yearsElapsed = age - startAge;
            const month = yearsElapsed * 12;
            const currentHomeValue = initialPropertyValue * Math.pow(1 + (propertyGrowthRate / 100), yearsElapsed);

            // --- BANK SCENARIO ---
            const bankDebt = bankLoanCalculation.amortizationSchedule[month-1]?.totalRemainingBalance ?? (month > bankLoanCalculation.termInYears * 12 ? 0 : totalInitialNetDebt);
            let bankNetWorth = currentHomeValue - bankDebt; // Starts with home equity
            
            // Add cash accumulated after loan payoff
            const bankPayoffAge = youngestPersonAge + bankLoanCalculation.termInYears;
            if (age > bankPayoffAge) {
                const monthsOfSaving = (age - bankPayoffAge) * 12;
                const monthlyRepayment = getMonthlyAmount(loan.repayment, loan.frequency);
                const accumulatedCash = monthsOfSaving * monthlyRepayment;
                bankNetWorth += accumulatedCash;
            }

            // --- CROWN SCENARIO ---
            const crownDebt = crownMoneyLoanCalculation.amortizationSchedule[month-1]?.totalRemainingBalance ?? (month > crownMoneyLoanCalculation.termInYears * 12 ? 0 : totalInitialNetDebt);
            let crownNetWorth = currentHomeValue - crownDebt;
            
            if (age > youngestPersonAge + crownMoneyLoanCalculation.termInYears) {
                crownNetWorth += wealthCalcs(age).wealth + wealthCalcs(age).cashInHand;
            }
            projection.push({ age, bank: bankNetWorth, crown: crownNetWorth });
        }
        return projection;
    }, [wealthCalculations, youngestPersonAge, loan.propertyValue, propertyGrowthRate, bankLoanCalculation, crownMoneyLoanCalculation, idealRetirementAge, loan.repayment, loan.frequency, totalInitialNetDebt]);
    
    const totalDebtData = useMemo(() => {
        const maxMonths = Math.ceil(Math.max(
            bankLoanCalculation.amortizationSchedule.length,
            crownMoneyLoanCalculation.amortizationSchedule.length
        ));
    
        if (!isFinite(maxMonths) || maxMonths === 0) return [];
    
        const bankStartDebt = (loan.amount - (loan.offsetBalance || 0));
    
        const consolidatedAmount = otherDebts.reduce((sum, debt) => sum + debt.amount, 0);
        const crownStartDebt = (loan.amount - (loan.offsetBalance || 0)) + consolidatedAmount;
    
        const data = [{
            year: 0,
            age: youngestPersonAge,
            'Bank': bankStartDebt,
            'Crown Money': crownStartDebt,
        }];
    
        for (let month = 1; month <= maxMonths; month++) {
            const year = month / 12;
            const age = youngestPersonAge + year;
    
            const bankDebt = bankLoanCalculation.amortizationSchedule[month - 1]?.remainingBalance ?? 0;
            const crownDebt = crownMoneyLoanCalculation.amortizationSchedule[month - 1]?.totalRemainingBalance ?? 0;
    
            data.push({
                year: parseFloat(year.toFixed(2)),
                age: age,
                'Bank': bankDebt > 0 ? bankDebt : 0,
                'Crown Money': crownDebt > 0 ? crownDebt : 0,
            });
        }
    
        // Add the 'Crown Money Snowball' series
        if (payoffStrategy === 'snowball' && investmentLoanCalculations.investmentPayoffSchedule) {
            const primaryPayoffMonths = Math.ceil(crownMoneyLoanCalculation.termInYears * 12);
            const sortedPayoffSchedule = investmentLoanCalculations.investmentPayoffSchedule.sort((a, b) => a.crown.startYear - b.crown.startYear);
    
            data.forEach((dataPoint, index) => {
                const month = index;
                if (month === 0) {
                    dataPoint['Crown Money Snowball'] = crownStartDebt;
                    return;
                }
    
                if (month <= primaryPayoffMonths) {
                    // During primary loan payoff, it shows the primary loan balance
                    dataPoint['Crown Money Snowball'] = crownMoneyLoanCalculation.amortizationSchedule[month - 1]?.remainingBalance ?? 0;
                } else {
                    // During investment loan payoff
                    let snowballValue = 0;
                    let targetProp = null;
                    for (const prop of sortedPayoffSchedule) {
                        const startMonth = Math.floor(prop.crown.startYear * 12);
                        const endMonth = startMonth + Math.ceil(prop.crown.durationYears * 12);
                        if (month > startMonth && month <= endMonth) {
                            targetProp = prop;
                            break;
                        }
                    }
    
                    if (targetProp) {
                        const startMonthOfTarget = Math.floor(targetProp.crown.startYear * 12);
                        const monthIntoTargetPayoff = month - startMonthOfTarget;
                        snowballValue = targetProp.crown.standaloneCalc.amortizationSchedule[monthIntoTargetPayoff - 1]?.remainingBalance ?? 0;
                    }
                    dataPoint['Crown Money Snowball'] = snowballValue;
                }
            });
        }
    
        return data;
    }, [bankLoanCalculation, crownMoneyLoanCalculation, youngestPersonAge, loan.amount, loan.offsetBalance, otherDebts, investmentLoanCalculations, payoffStrategy]);

    const retirementEquity = useMemo(() => {
        const retirementYearsElapsed = idealRetirementAge - youngestPersonAge;
        const retirementMonthIndex = Math.max(0, retirementYearsElapsed * 12 - 1);
        const initialPropertyValueForBank = loan.propertyValue;
        const homeValueAtRetirement = initialPropertyValueForBank * Math.pow(1 + (propertyGrowthRate / 100), retirementYearsElapsed);
        const bankDebtAtRetirement = bankLoanCalculation.amortizationSchedule[retirementMonthIndex]?.remainingBalance ?? (retirementMonthIndex + 1 > bankLoanCalculation.termInYears * 12 ? 0 : loan.amount);
        const bankEquityAtRetirement = homeValueAtRetirement - bankDebtAtRetirement;
        return { homeValueAtRetirement, bankDebtAtRetirement, bankEquityAtRetirement };
    }, [idealRetirementAge, youngestPersonAge, loan.propertyValue, propertyGrowthRate, bankLoanCalculation]);

    const bankRetirementPosition = useMemo(() => {
        if (!isFinite(bankLoanCalculation.termInYears)) {
            return { bankCashAvailableAtRetirement: 0, totalBankNetPositionAtRetirement: retirementEquity.bankEquityAtRetirement };
        }

        const bankPayoffAge = youngestPersonAge + bankLoanCalculation.termInYears;
        let bankCashAvailableAtRetirement = 0;

        if (idealRetirementAge > bankPayoffAge) {
            const monthsOfSavings = (idealRetirementAge - bankPayoffAge) * 12;
            const monthlyRepayment = getMonthlyAmount(loan.repayment, loan.frequency);
            bankCashAvailableAtRetirement = monthsOfSavings * monthlyRepayment;
        }

        const totalBankNetPositionAtRetirement = retirementEquity.bankEquityAtRetirement + bankCashAvailableAtRetirement;

        return { bankCashAvailableAtRetirement, totalBankNetPositionAtRetirement };

    }, [idealRetirementAge, youngestPersonAge, bankLoanCalculation.termInYears, loan.repayment, loan.frequency, retirementEquity.bankEquityAtRetirement]);

    return useMemo(() => ({
        getMonthlyAmount,
        calculatePIPayment,
        calculateIOPayment,
        people,
        ...budgetCalculations,
        bankLoanCalculation,
        crownMoneyLoanCalculation,
        debtRecyclingCalculation,
        investmentLoanCalculations,
        ...wealthCalculations,
        netWorthProjection,
        totalDebtData,
        ...retirementEquity,
        ...bankRetirementPosition,
        totalInitialDebt,
        totalInitialNetDebt,
    }), [people, budgetCalculations, bankLoanCalculation, crownMoneyLoanCalculation, debtRecyclingCalculation, investmentLoanCalculations, wealthCalculations, netWorthProjection, totalDebtData, retirementEquity, bankRetirementPosition, totalInitialDebt, totalInitialNetDebt]);
};