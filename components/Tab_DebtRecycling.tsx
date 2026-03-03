
import React, { useMemo } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, LabelList, ComposedChart, Line } from 'recharts';
import Tooltip from './common/Tooltip';
import { InfoIcon, BanknotesIcon, TrendingUpIcon } from './common/IconComponents';
import Accordion from './common/Accordion';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatChartCurrency = (tick: number): string => {
  if (Math.abs(tick) >= 1000000) {
    return `$${(tick / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(tick) >= 1000) {
    return `$${Math.round(tick / 1000)}k`;
  }
  return `$${tick}`;
};

const ICONS = {
    DEBT_RECYCLING_DIAGRAM: "https://storage.googleapis.com/crown_money/Images%20%26%20Icons/Images/Debt%20Recycling%20Works.png"
};

const DebtRecyclingVisualGuide: React.FC<{ appState: AppState, calculations: any }> = ({ appState, calculations }) => {
    return (
        <div className="p-4 rounded-lg overflow-x-auto">
            <h3 className="text-xl font-bold text-center text-[var(--title-color)] mb-8">How Debt Recycling Works (5-Step Cycle)</h3>
            <div className="flex justify-center mb-8">
                <img 
                    src={ICONS.DEBT_RECYCLING_DIAGRAM} 
                    alt="Debt Recycling Process Diagram" 
                    className="max-w-4xl w-full object-contain"
                />
            </div>
        </div>
    );
};


const Tab_DebtRecycling: React.FC<Props> = ({ appState, setAppState, calculations }) => {
    const { debtRecyclingCalculation } = calculations;
    const { debtRecyclingInvestmentRate, debtRecyclingLoanInterestRate, marginalTaxRate, debtRecyclingPercentage } = appState;

    const handleStateChange = (field: keyof AppState, value: any) => {
        setAppState(prev => ({ ...prev, [field]: value }));
    };

    // --- Specific Debt Recycling Spread Math ---
    const recycledNumbers = useMemo(() => {
        if (!debtRecyclingCalculation || !debtRecyclingCalculation.amortizationSchedule) return null;
        
        const year1PrincipalPaid = debtRecyclingCalculation.amortizationSchedule.slice(0, 12).reduce((sum: number, p: any) => sum + p.principalPaid, 0);
        const amountRecycled = year1PrincipalPaid * (debtRecyclingPercentage / 100);
        
        const grossReturn = amountRecycled * (debtRecyclingInvestmentRate / 100);
        const interestCost = amountRecycled * (debtRecyclingLoanInterestRate / 100);
        
        const taxBenefit = interestCost * (marginalTaxRate / 100);
        const netCostAfterTax = interestCost - taxBenefit;
        
        const netAnnualGain = grossReturn - netCostAfterTax;

        // Final Outcome at end of loan
        const finalPortfolio = debtRecyclingCalculation.finalInvestmentPortfolioValue || 0;
        const finalLoan = debtRecyclingCalculation.finalInvestmentLoanBalance || 0;
        
        const finalAnnualGrossReturn = finalPortfolio * (debtRecyclingInvestmentRate / 100);
        const finalAnnualInterestCost = finalLoan * (debtRecyclingLoanInterestRate / 100);
        const finalPassiveIncomeSpread = finalAnnualGrossReturn - finalAnnualInterestCost;

        return {
            amountRecycled,
            grossReturn,
            interestCost,
            taxBenefit,
            netAnnualGain,
            lifetimeWealth: finalPortfolio,
            lifetimeLoan: finalLoan,
            finalAnnualGrossReturn,
            finalAnnualInterestCost,
            passiveIncome: finalPassiveIncomeSpread,
            yearsToPayoff: debtRecyclingCalculation.termInYears
        };
    }, [debtRecyclingCalculation, debtRecyclingPercentage, debtRecyclingInvestmentRate, debtRecyclingLoanInterestRate, marginalTaxRate]);

    const snowballChartData = useMemo(() => {
        const { loan } = appState;
        if (!debtRecyclingCalculation || !debtRecyclingCalculation.termInYears || !isFinite(debtRecyclingCalculation.termInYears) || !debtRecyclingCalculation.amortizationSchedule) {
            return [];
        }
    
        const homeLoanSchedule = debtRecyclingCalculation.amortizationSchedule;
        const portfolioSchedule = debtRecyclingCalculation.investmentPortfolioSchedule || [];
        const termInYears = debtRecyclingCalculation.termInYears;
        const netLoanAmount = loan.amount - (loan.offsetBalance || 0);
        const data = [];
        const lastYear = Math.min(Math.ceil(termInYears), 100);

        for (let year = 0; year <= lastYear; year++) {
             if (year === 0) {
                data.push({ label: 'Start', 'Home Loan Balance': netLoanAmount, 'Investment Portfolio': 0 });
                continue;
            }
            const monthIndex = year * 12 - 1;
            const isAfterPayoff = (monthIndex + 1) / 12 > termInYears;
            const homeLoan = isAfterPayoff ? 0 : (homeLoanSchedule[monthIndex]?.remainingBalance ?? 0);
            const portfolio = isAfterPayoff ? portfolioSchedule[portfolioSchedule.length - 1]?.value ?? 0 : (portfolioSchedule[monthIndex]?.value ?? 0);
            
            data.push({
                label: `Year ${year}`,
                'Home Loan Balance': isFinite(homeLoan) && homeLoan > 0 ? homeLoan : 0,
                'Investment Portfolio': isFinite(portfolio) ? portfolio : 0,
            });
        }
        return data;
    }, [debtRecyclingCalculation, appState.loan]);

    const debtCompositionData = React.useMemo(() => {
        if (!debtRecyclingCalculation || !debtRecyclingCalculation.amortizationSchedule) return [];
        const homeLoanSchedule = debtRecyclingCalculation.amortizationSchedule || [];
        const invLoanSchedule = debtRecyclingCalculation.investmentLoanSchedule || [];
        const maxMonths = Math.max(homeLoanSchedule.length, invLoanSchedule.length);
        if (maxMonths === 0 || maxMonths > 1200) return [];

        const data = [];
        for (let i = 0; i < maxMonths; i++) {
            const homeLoan = homeLoanSchedule[i]?.remainingBalance || 0;
            const invLoan = invLoanSchedule[i]?.balance || 0;
            data.push({
                year: (i + 1) / 12,
                'Home Loan': isFinite(homeLoan) ? homeLoan : 0,
                'Investment Loan': isFinite(invLoan) ? invLoan : 0,
                'Total Debt': isFinite(homeLoan + invLoan) ? homeLoan + invLoan : 0,
            });
        }
        return data;
    }, [debtRecyclingCalculation]);

    const accordionItems = [
        {
            title: "1. How Debt Recycling Works",
            content: <DebtRecyclingVisualGuide appState={appState} calculations={calculations} />
        },
        {
            title: "2. The Numbers: Strategic Financial Outcomes",
            content: recycledNumbers ? (
                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <p className="text-sm text-[var(--text-color-muted)] italic max-w-2xl mx-auto">
                            Debt Recycling creates a <strong>"Wealth Spread"</strong> by shifting non-deductible interest to deductible interest, while keeping your capital working in the market.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Year 1 Spread Card */}
                        <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--border-color)] space-y-4">
                            <h5 className="font-bold text-center text-[var(--text-color-muted)] uppercase tracking-widest text-xs">Year 1 Cashflow Impact</h5>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span>Principal Recycled</span>
                                    <span className="font-bold">{formatCurrency(recycledNumbers.amountRecycled)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                                    <span>Gross Return (@{debtRecyclingInvestmentRate}%)</span>
                                    <span>+{formatCurrency(recycledNumbers.grossReturn)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-red-500 font-medium">
                                    <span>Loan Cost (@{debtRecyclingLoanInterestRate}%)</span>
                                    <span>-{formatCurrency(recycledNumbers.interestCost)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-blue-500 font-bold border-t border-dashed border-[var(--border-color)] pt-2">
                                    <span>Tax Benefit ({marginalTaxRate}%)</span>
                                    <span>+{formatCurrency(recycledNumbers.taxBenefit)}</span>
                                </div>
                            </div>
                            <div className="pt-4 mt-2 border-t border-[var(--border-color)]">
                                <div className="flex justify-between items-center">
                                    <span className="font-black uppercase text-xs">Total Net Benefit</span>
                                    <span className="text-2xl font-black text-[var(--chart-color-wealth)]">{formatCurrency(recycledNumbers.netAnnualGain)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Passive Income Outcome Card */}
                        <div className="p-6 bg-[var(--title-color)]/5 rounded-2xl border-2 border-[var(--title-color)]/20 space-y-4 shadow-sm">
                            <div className="text-center">
                                <h5 className="font-bold text-[var(--title-color)] uppercase tracking-widest text-xs mb-2">Passive Income at Home Payoff</h5>
                                <p className="text-xs text-[var(--text-color-muted)] mb-4">In {recycledNumbers.yearsToPayoff.toFixed(1)} years when the home is clear:</p>
                                
                                <div className="space-y-3 px-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-color-muted)]">Recycled Portfolio</span>
                                        <span className="font-bold text-[var(--text-color)]">{formatCurrency(recycledNumbers.lifetimeWealth)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-b border-[var(--border-color)] pb-2 mb-2">
                                        <span className="text-[var(--text-color-muted)]">Investment Loan</span>
                                        <span className="font-bold text-[var(--text-color)]">{formatCurrency(recycledNumbers.lifetimeLoan)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-xs font-medium text-green-600">
                                        <span>Investment Returns (@{debtRecyclingInvestmentRate}%)</span>
                                        <span>+{formatCurrency(recycledNumbers.finalAnnualGrossReturn)}/yr</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium text-red-500">
                                        <span>Loan Interest (@{debtRecyclingLoanInterestRate}%)</span>
                                        <span>-{formatCurrency(recycledNumbers.finalAnnualInterestCost)}/yr</span>
                                    </div>

                                    <div className="pt-4 mt-2 border-t-2 border-[var(--title-color)]/30">
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-[var(--text-color)] uppercase text-xs">Net Passive Income</span>
                                            <div className="text-right">
                                                <p className="text-3xl font-black text-[var(--chart-color-wealth)]">{formatCurrency(recycledNumbers.passiveIncome)}</p>
                                                <p className="text-[10px] font-bold text-[var(--text-color-muted)] uppercase">Per Annum (Before Tax)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <p className="text-xs text-[var(--text-color)] leading-relaxed text-center italic">
                            *The passive income logic: Even if you still have an investment loan of {formatCurrency(recycledNumbers.lifetimeLoan)}, the higher return on your investment ({debtRecyclingInvestmentRate}%) compared to the loan cost ({debtRecyclingLoanInterestRate}%) creates a <strong>{ (debtRecyclingInvestmentRate - debtRecyclingLoanInterestRate).toFixed(1) }% net wealth spread</strong> that stays in your pocket as income.
                        </p>
                    </div>
                </div>
            ) : null
        },
        {
            title: "3. Configuration & Assumptions",
            content: (
                <div className="space-y-6">
                    <SliderInput 
                        label="Percentage of Principal to Recycle" 
                        value={debtRecyclingPercentage} 
                        onChange={val => handleStateChange('debtRecyclingPercentage', val)} 
                        min={0} max={100} step={5} unit="%" 
                    />
                    <SliderInput 
                        label="Expected Investment Yield / Return" 
                        value={debtRecyclingInvestmentRate} 
                        onChange={val => handleStateChange('debtRecyclingInvestmentRate', val)} 
                        min={0} max={15} step={0.1} unit="%" 
                    />
                    <SliderInput 
                        label="Investment Loan Interest Rate" 
                        value={debtRecyclingLoanInterestRate} 
                        onChange={val => handleStateChange('debtRecyclingLoanInterestRate', val)} 
                        min={0} max={15} step={0.1} unit="%" 
                    />
                    <SliderInput 
                        label="Marginal Tax Rate" 
                        value={marginalTaxRate} 
                        onChange={val => handleStateChange('marginalTaxRate', val)} 
                        min={0} max={50} step={0.5} unit="%" 
                    />
                </div>
            )
        },
        {
            title: "4. The Snowball Effect: Portfolio Growth Timeline",
            content: (
                <div className="w-full h-[400px]">
                    <ResponsiveContainer minWidth={0} minHeight={0}>
                        <BarChart data={snowballChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey="label" stroke="var(--text-color)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                            <Legend iconType="square" wrapperStyle={{ fontSize: "14px", color: "var(--text-color-muted)", paddingTop: '20px' }} />
                            <Bar dataKey="Home Loan Balance" name="Home Loan (Bad Debt)" stackId="a" fill="#ec4899" />
                            <Bar dataKey="Investment Portfolio" name="Investment Portfolio" stackId="a" fill="#6d28d9" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            title: "5. Debt Composition (Deductible vs Non-Deductible)",
            content: (
                <div className="w-full h-[400px]">
                    <ResponsiveContainer minWidth={0} minHeight={0}>
                        <ComposedChart data={debtCompositionData} stackOffset="none" margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="year" type="number" stroke="var(--text-color)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <Area type="monotone" dataKey="Home Loan" name="Home Loan (Non-Deductible)" stackId="1" stroke="var(--chart-color-crown)" fill="var(--chart-color-crown)" fillOpacity={0.6} />
                            <Area type="monotone" dataKey="Investment Loan" name="Investment Loan (Tax-Deductible)" stackId="1" stroke="var(--chart-color-interest)" fill="var(--chart-color-interest)" fillOpacity={0.6} />
                            <Line type="monotone" dataKey="Total Debt" stroke="#facc15" strokeWidth={3} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )
        }
    ];

    if (!debtRecyclingCalculation || debtRecyclingCalculation.termInYears === Infinity) {
        return (
            <div className="text-center p-8 animate-fade-in">
                <h3 className="text-xl font-bold text-[var(--text-color)]">Debt Recycling Unavailable</h3>
                <p className="text-[var(--text-color-muted)]">Your Crown Money loan calculation must be valid (payable) to enable Debt Recycling projections.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <Accordion items={accordionItems} defaultOpenIndex={1} />
        </div>
    );
};

export default React.memo(Tab_DebtRecycling);
