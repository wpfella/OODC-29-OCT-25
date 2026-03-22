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

export const getAnnualAmount = (amount: number, frequency: Frequency): number => {
    switch (frequency) {
        case 'weekly': return amount * 52;
        case 'fortnightly': return amount * 26;
        case 'monthly': return amount * 12;
        case 'quarterly': return amount * 4;
        case 'annually': return amount;
        default: return amount;
    }
};

export const calculatePIPayment = (principal: number, annualRate: number, termYears: number, frequency: Frequency): number => {
    if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
    const rate = annualRate / 100;
    let n, c;
    switch (frequency) {
        case 'weekly': n = termYears * 52; c = rate / 52; break;
        case 'fortnightly': n = termYears * 26; c = rate / 26; break;
        case 'monthly': n = termYears * 12; c = rate / 12; break;
        case 'quarterly': n = termYears * 4; c = rate / 4; break;
        case 'annually': n = termYears; c = rate; break;
        default: return 0;
    }
    if (n <= 0) return 0;
    if (c === 0) return principal / n;
    const pow = Math.pow(1 + c, n);
    if (!isFinite(pow)) return principal * c; // Interest only if power is too large
    return principal * (c * pow) / (pow - 1);
};

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
        loanTerm?: number;
        interestOnlyTerm?: number;
    },
    config: AmortizationConfig = {}
): LoanSummary => {
    try {
        const {
            extraMonthlyPayment = 0,
            futureChanges = [],
            futureLumpSums = [],
            strategy = 'bank',
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
        
        let investmentLoanBalance = 0;
        let investmentPortfolioValue = 0;
        let netInvestmentReturn = 0;
        const investmentLoanSchedule: { month: number, balance: number }[] = [];
        const investmentPortfolioSchedule: { month: number, value: number }[] = [];
        
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

        const MAX_SAFE_BALANCE = amount * 10; 

        for (let month = 1; month <= MAX_MONTHS; month++) {
            if (lumpSumChangesByMonth[month - 1]) {
                const changeAmount = lumpSumChangesByMonth[month - 1];
                if (strategy === 'crown') {
                    balance -= changeAmount;
                }
                if (balance < 0) balance = 0;
            }

            // Payoff Check at start of month: Consider debt paid off when balance <= offset
            if (balance <= currentOffsetBalance + 0.01) {
                 if (amortizationSchedule.length === 0) {
                     amortizationSchedule.push({ month, interestPaid: 0, principalPaid: 0, remainingBalance: balance, offsetBalance: currentOffsetBalance });
                }
                break; 
            }
            
            if (balance > MAX_SAFE_BALANCE) {
                 return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [] };
            }

            if (loanType === 'IO' && month === ioMonths + 1) {
                const remainingTermYears = loanTerm - (interestOnlyTerm || 0);
                if (remainingTermYears > 0) {
                    const newPIRepayment = calculatePIPayment(balance, interestRate, remainingTermYears, frequency as LoanFrequency);
                    currentMonthlyRepayment = getMonthlyAmount(newPIRepayment, frequency as LoanFrequency);
                }
            }

            const effectiveOffset = Math.min(balance, currentOffsetBalance);
            const interestPaid = (balance - effectiveOffset) * monthlyRate;
            const surplusChangeForMonth = futureChangesByMonth[month - 1] || 0;
            let totalPayment = currentMonthlyRepayment;

            if (strategy === 'crown') {
                totalPayment = Math.max(0, currentMonthlyRepayment + extraMonthlyPayment + surplusChangeForMonth + netInvestmentReturn);
            }

            // Forced strictly zero principal for IO type if using 'bank' strategy with precise IO repayment
            let principalPaid = 0;
            if (loanType === 'IO' && strategy === 'bank' && month <= ioMonths) {
                principalPaid = 0;
            } else {
                principalPaid = Math.min(balance, totalPayment - interestPaid);
            }
            
            balance -= principalPaid;
            totalInterest += interestPaid;

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

            amortizationSchedule.push({ month, interestPaid, principalPaid, remainingBalance: balance, offsetBalance: currentOffsetBalance });

            // Secondary break check if balance dropped below offset after payment
            if (balance <= currentOffsetBalance + 0.01) {
                break;
            }
        }

        const finalMonth = amortizationSchedule.length > 0 ? amortizationSchedule[amortizationSchedule.length - 1].month : 0;
        const totalPaidFromSchedule = amortizationSchedule.reduce((sum, entry) => sum + entry.principalPaid + entry.interestPaid, 0);

        return {
            termInYears: finalMonth / MONTHS_IN_YEAR,
            totalInterest,
            totalPaid: totalPaidFromSchedule,
            amortizationSchedule,
            ...(debtRecyclingConfig && { investmentLoanSchedule, investmentPortfolioSchedule, finalInvestmentLoanBalance: investmentLoanBalance, finalInvestmentPortfolioValue: investmentPortfolioValue }),
        };
    } catch (e) {
        console.error("Error in calculateAmortization", e);
        return { termInYears: Infinity, totalInterest: 0, totalPaid: 0, amortizationSchedule: [] };
    }
};

export const useMortgageCalculations = (appState: AppState) => {
    const { loan, incomes, expenses, otherDebts, investmentProperties, futureChanges, futureLumpSums, investmentAmountPercentage, investmentGrowthRate, idealRetirementAge, propertyGrowthRate, crownMoneyInterestRate, payoffStrategy, people } = appState;
    const youngestPersonAge = useMemo(() => Math.min(...people.map(p => p.age)), [people]);

    const rentalGrowthChanges = useMemo(() => {
        const changes: FutureChange[] = [];
        const today = new Date();
        investmentProperties.forEach(prop => {
            const growthRate = prop.rentalGrowthRate || 0;
            if (growthRate > 0) {
                const monthlyIncome = getMonthlyAmount(prop.rentalIncome, prop.rentalIncomeFrequency);
                let currentRentalIncome = monthlyIncome;
                for (let year = 1; year <= 30; year++) {
                    const newRentalIncome = currentRentalIncome * (1 + growthRate / 100);
                    const increase = newRentalIncome - currentRentalIncome;
                    currentRentalIncome = newRentalIncome; 
                    const changeDate = new Date(today);
                    changeDate.setFullYear(today.getFullYear() + year);
                    changes.push({ id: Date.now() + Math.random(), description: `Rental Growth - ${prop.address}`, type: 'income', changeAmount: increase, frequency: 'monthly', startDate: changeDate.toISOString().split('T')[0], endDate: '2099-12-31', isPermanent: true });
                }
            }
        });
        return changes;
    }, [investmentProperties]);

    const allFutureChanges = useMemo(() => [...futureChanges, ...rentalGrowthChanges], [futureChanges, rentalGrowthChanges]);

    const budgetCalculations = useMemo(() => {
        const calculateNetCashflow = (props: InvestmentProperty[], scenario: 'bank' | 'crown') => {
            return (props || []).reduce((total, prop) => {
                if (prop.isFuture) return total;
                const monthlyIncome = getMonthlyAmount(prop.rentalIncome, prop.rentalIncomeFrequency);
                const monthlyExpenses = (prop.expenses || []).reduce((sum, exp) => sum + getMonthlyAmount(exp.amount, exp.frequency), 0);
                let repayment = 0;
                if (scenario === 'crown') {
                     const crownRate = prop.crownSettings?.interestRate ?? prop.interestRate;
                     const netLoan = Math.max(0, prop.loanAmount - (prop.offsetBalance || 0));
                     repayment = calculateIOPayment(netLoan, crownRate, 'monthly');
                } else {
                     repayment = getMonthlyAmount(prop.repayment, prop.repaymentFrequency);
                }
                return total + (monthlyIncome - repayment - monthlyExpenses);
            }, 0);
        };
        const bankInvestmentNetCashflow = calculateNetCashflow(investmentProperties, 'bank');
        const crownInvestmentNetCashflow = calculateNetCashflow(investmentProperties, 'crown');
        const baseIncome = (incomes || []).reduce((sum, income) => sum + getMonthlyAmount(income.amount, income.frequency), 0);
        const baseLivingExpenses = (expenses || []).reduce((sum, expense) => sum + getMonthlyAmount(expense.amount, expense.frequency), 0);
        const bankTotalMonthlyIncome = baseIncome + Math.max(0, bankInvestmentNetCashflow);
        const bankTotalMonthlyExpenses = baseLivingExpenses + Math.abs(Math.min(0, bankInvestmentNetCashflow));
        const bankSurplus = bankTotalMonthlyIncome - bankTotalMonthlyExpenses;
        const crownTotalMonthlyIncome = baseIncome + Math.max(0, crownInvestmentNetCashflow);
        const crownTotalMonthlyExpenses = baseLivingExpenses + Math.abs(Math.min(0, crownInvestmentNetCashflow));
        const crownSurplus = crownTotalMonthlyIncome - crownTotalMonthlyExpenses;
        return { investmentPropertiesNetCashflow: bankInvestmentNetCashflow, bankInvestmentNetCashflow, crownInvestmentNetCashflow, totalMonthlyIncome: bankTotalMonthlyIncome, totalMonthlyExpenses: bankTotalMonthlyExpenses, totalMonthlyLivingExpenses: baseLivingExpenses, surplus: bankSurplus, bankSurplus, crownSurplus };
    }, [incomes, expenses, investmentProperties, otherDebts]);

    // NEW: Calculate the status quo interest cost for other debts
    const otherDebtsBreakdown = useMemo(() => {
        return (otherDebts || []).map(debt => {
            const requiredRepayment = calculatePIPayment(debt.amount, debt.interestRate, debt.remainingTerm, debt.frequency);
            const bankCalc = calculateAmortization({
                amount: debt.amount,
                interestRate: debt.interestRate,
                repayment: requiredRepayment,
                frequency: debt.frequency,
                offsetBalance: 0,
                loanTerm: debt.remainingTerm,
                loanType: 'P&I'
            }, { strategy: 'bank' });

            // For comparison, calculate what this same debt would cost at the Crown rate over the same term
            const crownRequiredRepayment = calculatePIPayment(debt.amount, crownMoneyInterestRate, debt.remainingTerm, debt.frequency);
            const crownCalc = calculateAmortization({
                amount: debt.amount,
                interestRate: crownMoneyInterestRate,
                repayment: crownRequiredRepayment,
                frequency: debt.frequency,
                offsetBalance: 0,
                loanTerm: debt.remainingTerm,
                loanType: 'P&I'
            }, { strategy: 'bank' });

            return {
                name: debt.name,
                amount: debt.amount,
                bankInterest: bankCalc.totalInterest === Infinity ? 0 : bankCalc.totalInterest,
                crownInterest: crownCalc.totalInterest === Infinity ? 0 : crownCalc.totalInterest,
                savings: (bankCalc.totalInterest === Infinity ? 0 : bankCalc.totalInterest) - (crownCalc.totalInterest === Infinity ? 0 : crownCalc.totalInterest),
                bankRate: debt.interestRate,
                crownRate: crownMoneyInterestRate,
                term: debt.remainingTerm,
                frequency: debt.frequency
            };
        });
    }, [otherDebts, crownMoneyInterestRate]);

    const otherDebtsStatusQuoInterest = useMemo(() => {
        return otherDebtsBreakdown.reduce((total, d) => total + d.bankInterest, 0);
    }, [otherDebtsBreakdown]);

    const bankLoanCalculation = useMemo(() => {
        const netLoan = { ...loan, amount: Math.max(0, loan.amount - (loan.offsetBalance || 0)), offsetBalance: 0 };
        return calculateAmortization(netLoan, { strategy: 'bank' });
    }, [loan]);

    const crownMoneyLoanCalculation = useMemo(() => {
        try {
            const { crownSurplus } = budgetCalculations;
            if (crownSurplus <= 0 && getMonthlyAmount(loan.repayment, loan.frequency) <= 0) throw new Error("No surplus");
            const consolidatedAmount = (otherDebts || []).reduce((sum, d) => sum + d.amount, 0);
            const crownLoanDetailsForCalc = { amount: (loan.amount + consolidatedAmount), interestRate: crownMoneyInterestRate, repayment: crownSurplus, frequency: 'monthly' as const, offsetBalance: loan.offsetBalance };
            const result = calculateAmortization(crownLoanDetailsForCalc, { futureChanges: allFutureChanges, futureLumpSums, strategy: 'crown' });
            if (result.termInYears === Infinity) throw new Error("Infinite term");
            return { ...result, amortizationSchedule: result.amortizationSchedule.map(point => ({ ...point, totalRemainingBalance: point.remainingBalance })) };
        } catch (e) {
            return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [] };
        }
    }, [loan, otherDebts, budgetCalculations, crownMoneyInterestRate, allFutureChanges, futureLumpSums]);

    const investmentLoanCalculations = useMemo(() => {
        try {
            if (!investmentProperties || investmentProperties.length === 0) return { totalBankInterest: 0, totalCrownInterest: 0, totalBankTerm: 0, totalCrownTerm: 0, investmentPayoffSchedule: [], totalInvestmentDebt: 0, payoffBreakpoints: [] };
            let totalBankInterest = 0, totalBankTerm = 0;
            const investmentPayoffSchedule: any[] = [];
            investmentProperties.forEach(prop => {
                const bankCalc = calculateAmortization({ amount: prop.loanAmount, interestRate: prop.interestRate, repayment: prop.repayment, frequency: prop.repaymentFrequency, offsetBalance: prop.offsetBalance, loanType: prop.loanType, loanTerm: prop.loanTerm, interestOnlyTerm: prop.interestOnlyTerm }, { strategy: 'bank' });
                totalBankInterest += bankCalc.totalInterest;
                totalBankTerm = Math.max(totalBankTerm, bankCalc.termInYears);
                investmentPayoffSchedule.push({ propertyId: prop.id, propertyAddress: prop.address, loanAmount: prop.loanAmount, bank: bankCalc, crown: { termInYears: Infinity, totalInterest: Infinity, amortizationSchedule: [] } });
            });
            let totalCrownInterest = 0, totalCrownTerm = 0;
            const payoffBreakpoints: { year: number, age: number, label: string }[] = [];
            if (crownMoneyLoanCalculation.termInYears !== Infinity) {
                const primaryPayoffMonths = Math.ceil(crownMoneyLoanCalculation.termInYears * 12);
                payoffBreakpoints.push({ year: crownMoneyLoanCalculation.termInYears, age: youngestPersonAge + crownMoneyLoanCalculation.termInYears, label: 'Primary Home Paid Off' });
                const { crownSurplus } = budgetCalculations;
                if (payoffStrategy === 'snowball') {
                    let cumulativeMonthsOffset = primaryPayoffMonths;
                    let accumulatedFreedUpRepayments = 0;
                    const sortedProps = [...investmentProperties].sort((a, b) => a.loanAmount - b.loanAmount);
                    for (const prop of sortedProps) {
                        const netInvestmentLoanAmount = prop.loanAmount - (prop.offsetBalance || 0);
                        const crownRate = prop.crownSettings?.interestRate ?? prop.interestRate;
                        const crownMinRepayment = calculateIOPayment(netInvestmentLoanAmount, crownRate, 'monthly');
                        
                        // Explicitly IO Waiting phase with strategy: bank to ensure $0 principal
                        const waitingCalc = calculateAmortization({ amount: netInvestmentLoanAmount, interestRate: crownRate, repayment: crownMinRepayment, frequency: 'monthly', offsetBalance: 0, loanType: 'IO', loanTerm: 100, interestOnlyTerm: 100 }, { strategy: 'bank' }); 
                        
                        const balanceAtStartOfSnowball = waitingCalc.amortizationSchedule[cumulativeMonthsOffset - 1]?.remainingBalance ?? netInvestmentLoanAmount;
                        if (balanceAtStartOfSnowball <= 0) {
                            cumulativeMonthsOffset += 0;
                            accumulatedFreedUpRepayments += crownMinRepayment;
                            continue;
                        }
                        const snowballPayment = crownSurplus + accumulatedFreedUpRepayments + crownMinRepayment;
                        const payoffCalc = calculateAmortization({ amount: balanceAtStartOfSnowball, interestRate: crownRate, repayment: snowballPayment, frequency: 'monthly', offsetBalance: 0, loanType: 'P&I', loanTerm: 30, interestOnlyTerm: 0 }, { futureChanges: allFutureChanges, futureLumpSums, strategy: 'crown' });
                        
                        if (payoffCalc.termInYears !== Infinity) {
                            const waitSchedule = waitingCalc.amortizationSchedule.slice(0, cumulativeMonthsOffset).map(p => ({...p, principalPaid: 0, isWaitPhase: true}));
                            const interestDuringWait = waitSchedule.reduce((s, x) => s + x.interestPaid, 0);
                            totalCrownInterest += (interestDuringWait + payoffCalc.totalInterest);
                            const scheduleItem = investmentPayoffSchedule.find(p => p.propertyId === prop.id);
                            if (scheduleItem) {
                                scheduleItem.crown = { 
                                    termInYears: (cumulativeMonthsOffset / 12) + payoffCalc.termInYears, 
                                    totalInterest: interestDuringWait + payoffCalc.totalInterest, 
                                    amortizationSchedule: [
                                        ...waitSchedule,
                                        ...payoffCalc.amortizationSchedule.map(p => ({...p, month: p.month + cumulativeMonthsOffset, isWaitPhase: false}))
                                    ], 
                                    startYear: cumulativeMonthsOffset / 12, 
                                    durationYears: payoffCalc.termInYears,
                                    standaloneCalc: payoffCalc,
                                    loanAmountAtStart: netInvestmentLoanAmount // Capture for chart jump
                                };
                            }
                            cumulativeMonthsOffset += Math.ceil(payoffCalc.termInYears * 12);
                            accumulatedFreedUpRepayments += crownMinRepayment; 
                            payoffBreakpoints.push({ year: cumulativeMonthsOffset / 12, age: youngestPersonAge + (cumulativeMonthsOffset / 12), label: `${prop.address} Paid Off` });
                        }
                    }
                    totalCrownTerm = (cumulativeMonthsOffset - primaryPayoffMonths) / 12;
                }
            }
            return { totalBankInterest, totalCrownInterest, totalBankTerm, totalCrownTerm: Math.max(0, totalCrownTerm), investmentPayoffSchedule, totalInvestmentDebt: investmentProperties.reduce((sum, p) => sum + p.loanAmount, 0), payoffBreakpoints };
        } catch (e) {
            return { totalBankInterest: 0, totalCrownInterest: 0, totalBankTerm: 0, totalCrownTerm: 0, investmentPayoffSchedule: [], totalInvestmentDebt: 0, payoffBreakpoints: [] };
        }
    }, [investmentProperties, crownMoneyLoanCalculation, payoffStrategy, youngestPersonAge, budgetCalculations, allFutureChanges, futureLumpSums]);

    const wealthCalculations = useMemo(() => {
        const { crownSurplus } = budgetCalculations;
        const wealthCalcs = (endAge: number) => {
            let wealth = 0, cashInHand = 0, homeEquity = 0, investmentEquity = 0;
            const yearsElapsed = endAge - youngestPersonAge;
            if (isFinite(crownMoneyLoanCalculation.termInYears)) {
                const investmentMonths = (endAge - (youngestPersonAge + crownMoneyLoanCalculation.termInYears)) * 12;
                if (investmentMonths > 0) {
                    const monthlyGrowthRate = Math.pow(1 + (investmentGrowthRate / 100), 1/12) - 1;
                    const monthlyInv = crownSurplus * (investmentAmountPercentage / 100);
                    wealth = monthlyInv > 0 ? monthlyInv * ((Math.pow(1 + monthlyGrowthRate, investmentMonths) - 1) / monthlyGrowthRate) : monthlyInv * investmentMonths;
                    cashInHand = (crownSurplus - monthlyInv) * investmentMonths;
                }
            }
            homeEquity = loan.propertyValue * Math.pow(1 + (propertyGrowthRate / 100), yearsElapsed);
            investmentProperties.forEach(prop => {
                const fv = prop.propertyValue * Math.pow(1 + (propertyGrowthRate / 100), yearsElapsed);
                const propData = investmentLoanCalculations.investmentPayoffSchedule.find(p => p.propertyId === prop.id);
                const debt = propData?.crown.amortizationSchedule[Math.round(yearsElapsed * 12) - 1]?.remainingBalance ?? 0;
                investmentEquity += Math.max(0, fv - debt);
            });
            return { wealth, cashInHand, homeEquity, investmentEquity };
        };
        return { retirementWealthProjection: wealthCalcs(idealRetirementAge), wealthCalcs };
    }, [budgetCalculations, crownMoneyLoanCalculation, investmentAmountPercentage, investmentGrowthRate, idealRetirementAge, youngestPersonAge, loan.propertyValue, propertyGrowthRate, investmentProperties, investmentLoanCalculations]);

    const totalDebtData = useMemo(() => {
        try {
            const bankPrimarySchedule = bankLoanCalculation.amortizationSchedule;
            const crownPrimarySchedule = crownMoneyLoanCalculation.amortizationSchedule;
            const bankInvSchedules = investmentLoanCalculations.investmentPayoffSchedule.map((p: any) => ({ id: p.propertyId, schedule: p.bank.amortizationSchedule }));
            const crownInvSchedules = investmentLoanCalculations.investmentPayoffSchedule.map((p: any) => ({ id: p.propertyId, schedule: p.crown.amortizationSchedule }));
            
            const maxMonths = Math.ceil(Math.max(bankPrimarySchedule.length, crownPrimarySchedule.length, ...bankInvSchedules.map(s => s.schedule.length), ...crownInvSchedules.map(s => s.schedule.length), 1));
            if (!isFinite(maxMonths) || maxMonths === 0) return [];

            const primaryStartDebt = loan.amount - (loan.offsetBalance || 0);
            const otherDebtsStartDebt = (otherDebts || []).reduce((sum, debt) => sum + debt.amount, 0);
            const investmentStartDebts: Record<number, number> = {};
            investmentProperties.forEach(p => { investmentStartDebts[p.id] = p.loanAmount - (p.offsetBalance || 0); });
            const totalInvStartDebt = Object.values(investmentStartDebts).reduce((sum, d) => sum + d, 0);

            const sortedInvSchedules = [...investmentLoanCalculations.investmentPayoffSchedule].filter((p: any) => p.crown.termInYears !== Infinity).sort((a: any, b: any) => (a.crown.startYear || 0) - (b.crown.startYear || 0));

            const data = [];
            for (let month = 0; month <= maxMonths; month++) {
                const index = month === 0 ? 0 : month - 1;
                
                // Bank Line: Combined Total Debt
                let bankTotal = (bankPrimarySchedule[index]?.remainingBalance ?? 0);
                bankInvSchedules.forEach(inv => bankTotal += (inv.schedule[index]?.remainingBalance ?? 0));
                
                const point: any = { 
                    year: month / 12, 
                    age: youngestPersonAge + (month / 12), 
                    'Bank': month === 0 ? (primaryStartDebt + totalInvStartDebt) : bankTotal,
                };

                // Sequential Attack Path Logic: Sawtooth Pattern
                let activeAttackValue: number | null = null;
                const primaryEndM = crownPrimarySchedule.length;
                
                if (month < primaryEndM) {
                    activeAttackValue = month === 0 ? (primaryStartDebt + otherDebtsStartDebt) : (crownPrimarySchedule[index]?.totalRemainingBalance ?? 0);
                } else if (month === primaryEndM) {
                    activeAttackValue = 0;
                } else {
                    let found = false;
                    for (let j = 0; j < sortedInvSchedules.length; j++) {
                        const inv = sortedInvSchedules[j];
                        const startM = Math.round(inv.crown.startYear * 12);
                        const endM = Math.round(inv.crown.termInYears * 12);
                        
                        // Vertical Jump Handling: Exactly at transition, show the new loan's balance
                        if (month === startM + 1) {
                            activeAttackValue = inv.crown.loanAmountAtStart ?? (inv.loanAmount - (inv.offsetBalance || 0));
                            found = true;
                            break;
                        }
                        else if (month > startM && month < endM) {
                             activeAttackValue = inv.crown.amortizationSchedule[index]?.remainingBalance ?? 0;
                             found = true;
                             break;
                        } else if (month === endM) {
                             activeAttackValue = 0;
                             found = true;
                             break;
                        }
                    }
                    if (!found) activeAttackValue = 0;
                }
                point['StrategyAttack'] = activeAttackValue;

                // Portfolio Strategy Line
                let crownTotal = (crownPrimarySchedule[index]?.totalRemainingBalance ?? 0);
                crownInvSchedules.forEach(inv => crownTotal += (inv.schedule[index]?.remainingBalance ?? 0));
                point['Crown Money'] = month === 0 ? (primaryStartDebt + otherDebtsStartDebt + totalInvStartDebt) : crownTotal;

                data.push(point);
            }
            return data;
        } catch (e) { return []; }
    }, [bankLoanCalculation, crownMoneyLoanCalculation, youngestPersonAge, loan, otherDebts, investmentProperties, investmentLoanCalculations]);

    const netWorthProjection = useMemo(() => {
        try {
            const data = [];
            const { wealthCalcs } = wealthCalculations;
            for (let age = youngestPersonAge; age <= 95; age++) {
                const crown = wealthCalcs(age);
                const years = age - youngestPersonAge;
                const bankHomeVal = loan.propertyValue * Math.pow(1 + (propertyGrowthRate / 100), years);
                const bankPrimaryDebt = bankLoanCalculation.amortizationSchedule[Math.round(years * 12)]?.remainingBalance ?? 0;
                let bankInvEquity = 0;
                investmentProperties.forEach(p => {
                    const fv = p.propertyValue * Math.pow(1 + (propertyGrowthRate / 100), years);
                    const bankSchedule = investmentLoanCalculations.investmentPayoffSchedule.find((pi: any) => pi.propertyId === p.id)?.bank.amortizationSchedule;
                    const debt = bankSchedule?.[Math.round(years * 12)]?.remainingBalance ?? 0;
                    bankInvEquity += Math.max(0, fv - debt);
                });
                const bankNetWorth = Math.max(0, bankHomeVal - bankPrimaryDebt) + bankInvEquity;
                data.push({ age, bank: bankNetWorth, crown: crown.wealth + crown.cashInHand + crown.homeEquity + crown.investmentEquity });
            }
            return data;
        } catch (e) { return []; }
    }, [youngestPersonAge, wealthCalculations, loan, propertyGrowthRate, bankLoanCalculation, investmentProperties, investmentLoanCalculations]);

    const debtRecyclingCalculation = useMemo(() => {
        try {
            const { debtRecyclingInvestmentRate, debtRecyclingLoanInterestRate, marginalTaxRate, debtRecyclingPercentage, debtRecyclingEnabled } = appState;
            if (!debtRecyclingEnabled) return { termInYears: Infinity, totalInterest: 0, totalPaid: 0, amortizationSchedule: [] };
            const { crownSurplus } = budgetCalculations;
            const consolidatedAmount = (otherDebts || []).reduce((sum, d) => sum + d.amount, 0);
            return calculateAmortization({ amount: (loan.amount + consolidatedAmount), interestRate: crownMoneyInterestRate, repayment: crownSurplus, frequency: 'monthly', offsetBalance: loan.offsetBalance }, { futureChanges: allFutureChanges, futureLumpSums, strategy: 'crown', debtRecyclingConfig: { investmentRate: debtRecyclingInvestmentRate, loanInterestRate: debtRecyclingLoanInterestRate, marginalTaxRate: marginalTaxRate, percentage: debtRecyclingPercentage } });
        } catch (e) { return { termInYears: Infinity, totalInterest: 0, totalPaid: 0, amortizationSchedule: [] }; }
    }, [appState, otherDebts, crownMoneyInterestRate, budgetCalculations, allFutureChanges, futureLumpSums, loan]);

    const reportCalculations = useMemo(() => {
        const getReportData = (schedule: AmortizationDataPoint[], months: number) => {
            if (!schedule || schedule.length === 0) return { startingBalance: 0, principalPaid: 0, interestPaid: 0, endingBalance: 0 };
            const slice = schedule.slice(0, months);
            return { startingBalance: schedule[0] ? schedule[0].remainingBalance + schedule[0].principalPaid : 0, principalPaid: slice.reduce((sum, item) => sum + item.principalPaid, 0), interestPaid: slice.reduce((sum, item) => sum + item.interestPaid, 0), endingBalance: schedule[Math.min(months - 1, schedule.length - 1)]?.remainingBalance || 0 };
        };
        return { bankFuture: { 3: getReportData(bankLoanCalculation.amortizationSchedule, 3), 6: getReportData(bankLoanCalculation.amortizationSchedule, 6), 12: getReportData(bankLoanCalculation.amortizationSchedule, 12) }, crownFuture: { 3: getReportData(crownMoneyLoanCalculation.amortizationSchedule, 3), 6: getReportData(crownMoneyLoanCalculation.amortizationSchedule, 6), 12: getReportData(crownMoneyLoanCalculation.amortizationSchedule, 12) } };
    }, [bankLoanCalculation, crownMoneyLoanCalculation]);

    const totalInitialDebt = useMemo(() => {
        const primaryDebt = loan.amount;
        const otherDebtTotal = (otherDebts || []).reduce((sum, d) => sum + d.amount, 0);
        const invDebtTotal = (investmentProperties || []).reduce((sum, p) => sum + p.loanAmount, 0);
        return primaryDebt + otherDebtTotal + invDebtTotal;
    }, [loan.amount, otherDebts, investmentProperties]);

    const totalInitialNetDebt = useMemo(() => {
        const primaryNetDebt = Math.max(0, loan.amount - (loan.offsetBalance || 0));
        const otherDebtTotal = (otherDebts || []).reduce((sum, d) => sum + d.amount, 0);
        const invNetDebtTotal = (investmentProperties || []).reduce((sum, p) => sum + Math.max(0, p.loanAmount - (p.offsetBalance || 0)), 0);
        return primaryNetDebt + otherDebtTotal + invNetDebtTotal;
    }, [loan.amount, loan.offsetBalance, otherDebts, investmentProperties]);

    return { getMonthlyAmount, getAnnualAmount, calculatePIPayment, calculateIOPayment, people, ...budgetCalculations, otherDebtsStatusQuoInterest, otherDebtsBreakdown, bankLoanCalculation, crownMoneyLoanCalculation, investmentLoanCalculations, ...wealthCalculations, debtRecyclingCalculation, reportCalculations, netWorthProjection, totalDebtData, totalInitialDebt, totalInitialNetDebt };
};