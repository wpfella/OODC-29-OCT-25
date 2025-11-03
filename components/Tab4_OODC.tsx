import React, { useState, useMemo } from 'react';
import { AppState, AmortizationDataPoint, LoanDetails } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
// FIX: Add AreaChart to imports to fix 'Cannot find name' error.
import { AreaChart, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid, Area, Scatter, ReferenceDot, LineChart, Line, Label, PieChart, Pie, Cell, ReferenceArea } from 'recharts';
import Tooltip from './common/Tooltip';
import { InfoIcon, DownloadIcon } from './common/IconComponents';
import { calculateAmortization, getMonthlyAmount, calculatePIPayment } from '../hooks/useMortgageCalculations';
import Accordion from './common/Accordion';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const formatChartCurrency = (tick: number): string => {
  if (Math.abs(tick) >= 1000000) {
    return `$${(tick / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(tick) >= 1000) {
    return `$${Math.round(tick / 1000)}k`;
  }
  return `$${tick}`;
};

const CustomBarTooltip: React.FC<{ active?: boolean, payload?: any[], formatter: (value: number) => string, unit?: string }> = ({ active, payload, formatter, unit }) => {
    if (active && payload && payload.length) {
        const bankData = payload.find(p => p.dataKey === 'Bank');
        const crownData = payload.find(p => p.dataKey === 'Crown Money');
        const difference = (bankData?.value || 0) - (crownData?.value || 0);
        
        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                {bankData && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: bankData.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Bank: ${formatter(bankData.value)}`}</p>
                    </div>
                )}
                {crownData && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: crownData.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Crown Money: ${formatter(crownData.value)}`}</p>
                    </div>
                )}
                
                 {difference > 0 && (
                     <>
                        <hr className="my-1 border-[var(--border-color)] opacity-50" />
                        <p style={{ color: 'var(--tooltip-text-color-muted)' }}>
                            {`Savings: `}
                            <span className="font-semibold" style={{color: 'var(--tooltip-text-color-positive)'}}>
                                {unit === 'years' ? `${difference.toFixed(1)} years` : formatter(difference)}
                            </span>
                        </p>
                    </>
                )}
            </div>
        );
    }
    // Fallback logic
    if (active && payload && payload.length) {
         return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: pld.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`${pld.name}: ${formatter(pld.value)}`}</p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CustomAreaTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        const eventPayload = payload.find(p => p.payload.event);

        // If it's an event tooltip (from the Scatter plot)
        if (eventPayload && eventPayload.payload.event) {
            const { description, amount, type } = eventPayload.payload.event;
            return (
                <div className="p-2 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-md text-sm shadow-lg print:hidden">
                    <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{description}</p>
                    <p style={{ color: `var(--tooltip-text-color-${type === 'income' ? 'positive' : 'negative'})` }}>
                        {`${type === 'income' ? 'Income: +' : 'Expense: -'}${formatter(amount)}`}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tooltip-text-color-muted)' }}>{`At Year ${parseFloat(label || '0').toFixed(1)}`}</p>
                </div>
            );
        }
        
        // Original tooltip logic for the Area chart lines
        const bankData = payload.find(p => p.dataKey === 'Bank');
        const crownData = payload.find(p => p.dataKey === 'Crown Money');
        const difference = (bankData?.value || 0) - (crownData?.value || 0);
        const age = payload[0].payload.age;

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${label} (Age: ${Math.floor(age)})`}</p>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-bank)' }}></div>
                    <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Bank Balance: ${formatter(bankData?.value || 0)}`}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-crown)' }}></div>
                    <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Crown Balance: ${formatter(crownData?.value || 0)}`}</p>
                </div>
                {difference < 0 && ( // When crown is lower, difference is negative
                    <>
                        <hr className="my-1 border-[var(--border-color)] opacity-50" />
                        <p style={{ color: 'var(--tooltip-text-color-muted)' }}>
                            {`Ahead by: `}
                            <span className="font-semibold" style={{color: 'var(--tooltip-text-color-positive)'}}>
                                {`${formatter(Math.abs(difference))}`}
                            </span>
                        </p>
                    </>
                )}
            </div>
        );
    }
    return null;
};

const CustomMonthlyTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        const bankData = payload.find(p => p.dataKey === 'Bank');
        const crownData = payload.find(p => p.dataKey === 'Crown Money');
        const difference = (bankData?.value || 0) - (crownData?.value || 0);

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{label === '0' ? 'Starting Balance' : `End of Month: ${label}`}</p>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-bank)' }}></div>
                    <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Bank Balance: ${formatter(bankData?.value || 0)}`}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-crown)' }}></div>
                    <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Crown Balance: ${formatter(crownData?.value || 0)}`}</p>
                </div>
                {difference < 0 && (
                    <>
                        <hr className="my-1 border-[var(--border-color)] opacity-50" />
                        <p style={{ color: 'var(--tooltip-text-color-muted)' }}>
                            {`Ahead by: `}
                            <span className="font-semibold" style={{color: 'var(--tooltip-text-color-positive)'}}>
                                {`${formatter(Math.abs(difference))}`}
                            </span>
                        </p>
                    </>
                )}
            </div>
        );
    }
    return null;
};


const Tab4_OODC: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const [additionalMonthlyIncome, setAdditionalMonthlyIncome] = useState(0);
  const { loan } = appState;
  const { 
      bankLoanCalculation, 
      crownMoneyLoanCalculation: initialCrownLoanCalculation,
      totalMonthlyIncome,
      totalMonthlyExpenses,
      people,
      getMonthlyAmount
    } = calculations;
  
  const youngestPersonAge = Math.min(...people.map((p: any) => p.age));

  const maxStartDebt = Math.max(
      loan.amount - (loan.offsetBalance || 0), 
      initialCrownLoanCalculation.amortizationSchedule[0]?.totalRemainingBalance ?? 0
  );
  const yAxisMax = Math.ceil((maxStartDebt + 50000) / 50000) * 50000;


  const adjustedCrownLoanCalculation = useMemo(() => {
    if (additionalMonthlyIncome === 0) {
        return initialCrownLoanCalculation;
    }
    
    const { loan, futureChanges, futureLumpSums, crownMoneyInterestRate, otherDebts } = appState;
    
    // Create a temporary AppState for recalculation
    const tempState = { ...appState, incomes: [...appState.incomes, { id: 999, name: 'Additional Income', amount: additionalMonthlyIncome, frequency: 'monthly' as 'monthly' }] };
    
    // We need to re-run the core logic from the hook with the adjusted income
    const adjustedSurplus = (totalMonthlyIncome + additionalMonthlyIncome) - totalMonthlyExpenses;

    if (adjustedSurplus <= 0) {
        return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [] };
    }
    
    // This is a simplified version of the hook logic for the "what if" scenario
    const consolidatedAmount = otherDebts.reduce((sum, d) => sum + d.amount, 0);
    const primaryLoanBalance = (loan.amount + consolidatedAmount) - (loan.offsetBalance || 0);

    const minPrimaryPayment = calculatePIPayment(primaryLoanBalance, crownMoneyInterestRate, 30, 'monthly');
    const extraPayment = Math.max(0, adjustedSurplus - minPrimaryPayment);

    const netPrimaryLoanAmount = loan.amount - (loan.offsetBalance || 0);
    const crownLoanDetailsForPrimary: LoanDetails = {
        ...loan, amount: netPrimaryLoanAmount, offsetBalance: 0, interestRate: crownMoneyInterestRate,
    };
    
    return calculateAmortization(crownLoanDetailsForPrimary, {
        extraMonthlyPayment: extraPayment,
        futureChanges, futureLumpSums, strategy: 'crown'
    });

  }, [appState, additionalMonthlyIncome, initialCrownLoanCalculation, totalMonthlyIncome, totalMonthlyExpenses]);
  
  const crownMoneyLoanCalculation = adjustedCrownLoanCalculation;

  const first12MonthsData = useMemo(() => {
    const bankSchedule = bankLoanCalculation.amortizationSchedule.slice(0, 12);
    const crownSchedule = crownMoneyLoanCalculation.amortizationSchedule.slice(0, 12);

    if (bankSchedule.length === 0 && crownSchedule.length === 0) return [];
    
    const bankStartDebt = loan.amount - (loan.offsetBalance || 0);
    
    // Calculate the correct starting debt for Crown Money (total debt)
    const consolidatedAmount = appState.otherDebts.reduce((sum, debt) => sum + debt.amount, 0);
    const crownStartDebt = (loan.amount - (loan.offsetBalance || 0)) + consolidatedAmount;

    const data: {month: number, 'Bank': number, 'Crown Money': number}[] = [{
        month: 0,
        'Bank': bankStartDebt,
        'Crown Money': crownStartDebt,
    }];
    
    for (let i = 0; i < 12; i++) {
        data.push({
            month: i + 1,
            'Bank': bankSchedule[i]?.remainingBalance ?? data[i]['Bank'],
            'Crown Money': crownSchedule[i]?.totalRemainingBalance ?? data[i]['Crown Money'],
        });
    }

    return data;
  }, [bankLoanCalculation.amortizationSchedule, crownMoneyLoanCalculation.amortizationSchedule, loan.amount, loan.offsetBalance, appState.otherDebts]);
  
  const handleRateChange = (value: number) => {
    setAppState(prev => ({ ...prev, crownMoneyInterestRate: value }));
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  
  const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
  const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;

  const primaryInterestSaved = isBankLoanValid && isCrownLoanValid ? bankLoanCalculation.primaryLoanInterest - crownMoneyLoanCalculation.primaryLoanInterest : 0;
  const otherDebtsInterestSaved = isBankLoanValid && isCrownLoanValid ? bankLoanCalculation.otherDebtsInterest - crownMoneyLoanCalculation.otherDebtsInterest : 0;
  const totalInterestSaved = primaryInterestSaved + otherDebtsInterestSaved;

  const bankDebtFreeAges = appState.people.reduce((acc, p) => {
    acc[p.id] = isBankLoanValid ? Math.ceil(p.age + bankLoanCalculation.termInYears) : "N/A";
    return acc;
  }, {} as Record<number, number | string>);

  const crownDebtFreeAges = appState.people.reduce((acc, p) => {
    acc[p.id] = isCrownLoanValid ? Math.ceil(p.age + crownMoneyLoanCalculation.termInYears) : "N/A";
    return acc;
  }, {} as Record<number, number | string>);

  const yearsChartData = [
    { 
      name: 'Payoff Time', 
      Bank: isBankLoanValid ? bankLoanCalculation.termInYears : 0, 
      'Crown Money': isCrownLoanValid ? crownMoneyLoanCalculation.termInYears : 0 
    },
  ];

  const interestChartData = [
    { 
      name: 'Interest Paid', 
      Bank: isBankLoanValid ? bankLoanCalculation.totalInterest : 0, 
      'Crown Money': isCrownLoanValid ? crownMoneyLoanCalculation.totalInterest : 0 
    },
  ];
  
  const loanBalanceChartData = calculations.totalDebtData;
  
  const SliderLabel = () => (
    <div className='flex items-center justify-center gap-2'>
        <span className='text-sm font-medium text-[var(--text-color)] print:text-black'>Crown Money Interest Rate</span>
        <Tooltip text="Adjust this rate to match the current interest rate offered for the Crown Money facility. This will affect the speed of debt reduction.">
            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
        </Tooltip>
    </div>
  );
  
  const surplusForDebtReduction = totalMonthlyIncome - totalMonthlyExpenses;
  
  const maxYear = loanBalanceChartData.length > 0 ? Math.ceil(loanBalanceChartData[loanBalanceChartData.length - 1].year) : 30;
  const xTickInterval = Math.max(1, Math.floor(maxYear / 6)); 
  const xTicks = Array.from({ length: Math.floor(maxYear / xTickInterval) + 1 }, (_, i) => i * xTickInterval);
  if (!xTicks.includes(maxYear) && maxYear > 0) xTicks.push(maxYear);

  const { bankYear1, crownYear1, bankLifetime, crownLifetime } = useMemo(() => {
    return {
        bankYear1: {
            homeLoanInterest: bankLoanCalculation.year1PrimaryLoanInterest,
            otherDebtsInterest: bankLoanCalculation.year1OtherDebtsInterest
        },
        crownYear1: {
            principal: (surplusForDebtReduction * 12) - (crownMoneyLoanCalculation.year1PrimaryLoanInterest + crownMoneyLoanCalculation.year1OtherDebtsInterest),
            homeLoanInterest: crownMoneyLoanCalculation.year1PrimaryLoanInterest,
            otherDebtsInterest: crownMoneyLoanCalculation.year1OtherDebtsInterest
        },
        bankLifetime: {
            principal: (loan.amount - (loan.offsetBalance || 0)) + appState.otherDebts.reduce((s, d) => s + d.amount, 0),
            homeLoanInterest: bankLoanCalculation.primaryLoanInterest,
            otherDebtsInterest: bankLoanCalculation.otherDebtsInterest
        },
        crownLifetime: {
            principal: (loan.amount - (loan.offsetBalance || 0)) + appState.otherDebts.reduce((s, d) => s + d.amount, 0),
            homeLoanInterest: crownMoneyLoanCalculation.primaryLoanInterest,
            otherDebtsInterest: crownMoneyLoanCalculation.otherDebtsInterest
        },
    };
  }, [bankLoanCalculation, crownMoneyLoanCalculation, loan, appState.otherDebts, surplusForDebtReduction]);

  const DonutChartCard: React.FC<{
      title: string;
      homeLoanPrincipal: number;
      otherDebtsPrincipal?: number;
      homeLoanInterest: number;
      otherDebtsInterest: number;
      usePrincipalAsDenominator?: boolean;
      showInterestAmount?: boolean;
      principalWithConsolidation?: number;
      principalWithoutConsolidation?: number;
  }> = ({ title, homeLoanPrincipal, otherDebtsPrincipal = 0, homeLoanInterest, otherDebtsInterest, usePrincipalAsDenominator = false, showInterestAmount = true, principalWithConsolidation, principalWithoutConsolidation }) => {
      const totalPrincipal = homeLoanPrincipal + otherDebtsPrincipal;
      const totalInterest = homeLoanInterest + otherDebtsInterest;
      const data = [
          { name: 'Principal', value: totalPrincipal },
          { name: 'Interest', value: totalInterest },
      ];
      const totalPaid = totalPrincipal + totalInterest;
      const denominator = usePrincipalAsDenominator ? totalPrincipal : totalPaid;
      const interestPercent = denominator > 0 ? (totalInterest / denominator) * 100 : 0;

      return (
          <div className="text-center p-2 bg-black/5 dark:bg-white/5 rounded-lg flex flex-col justify-between">
              <h5 className={`font-semibold ${title.includes('Crown') ? 'text-lg' : 'text-sm'}`}>{title}</h5>
              <div className="w-full h-40 relative">
                  <ResponsiveContainer>
                      <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={2}>
                              <Cell fill="var(--chart-color-principal)" />
                              <Cell fill="var(--chart-color-interest)" />
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold" style={{color: 'var(--chart-color-interest)'}}>{interestPercent.toFixed(0)}%</span>
                      <span className="text-xs text-[var(--text-color-muted)]">Interest</span>
                  </div>
              </div>
              <div className="text-xs text-left px-1 mt-1 space-y-1">
                  {principalWithConsolidation && typeof principalWithoutConsolidation !== 'undefined' ? (
                      <>
                          <div className="flex items-center">
                              <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-principal)'}}></div>Principal (with consolidation)</span>
                              <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(principalWithConsolidation)}</span>
                          </div>
                          <div className="flex items-center pl-[14px]">
                              <span className="text-[var(--text-color-muted)]">Principal (without consolidation)</span>
                              <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(principalWithoutConsolidation)}</span>
                          </div>
                      </>
                  ) : otherDebtsPrincipal > 0 ? (
                    <>
                        <div className="flex items-center">
                            <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-principal)'}}></div>Home Loan Principal</span>
                            <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(homeLoanPrincipal)}</span>
                        </div>
                        <div className="flex items-center pl-[14px]">
                            <span className="text-[var(--text-color-muted)]">Other Debts Principal</span>
                            <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(otherDebtsPrincipal)}</span>
                        </div>
                    </>
                  ) : (
                    <div className="flex items-center">
                        <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-principal)'}}></div>Principal</span>
                        <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(homeLoanPrincipal)}</span>
                    </div>
                  )}
                  
                  {showInterestAmount ? (
                      <>
                          {homeLoanInterest > 0 && (
                              <div className="flex items-center pl-3.5">
                                  <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-interest)'}}></div>Home Loan Int.</span>
                                  <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(homeLoanInterest)}</span>
                              </div>
                          )}
                          {otherDebtsInterest > 0 && (
                              <div className="flex items-center pl-3.5">
                                  <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-interest)'}}></div>Other Debts Int.</span>
                                  <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(otherDebtsInterest)}</span>
                              </div>
                          )}
                      </>
                  ) : (
                      null
                  )}
              </div>
          </div>
      );
  };
  
  const otherDebtsChartData = useMemo(() => {
    if (appState.otherDebts.length === 0) return [];
    return [
      {
        name: 'Payoff Time',
        Bank: bankLoanCalculation.bankOtherDebtsMaxTerm,
        'Crown Money': crownMoneyLoanCalculation.otherDebtPayoffDetails.reduce((max, d) => Math.max(max, d.payoffMonth / 12), 0),
      },
    ];
  }, [appState.otherDebts, bankLoanCalculation, crownMoneyLoanCalculation]);

  const otherDebtsInterestChartData = useMemo(() => {
    if (appState.otherDebts.length === 0) return [];
    return [
      {
        name: 'Interest Paid',
        Bank: bankLoanCalculation.otherDebtsInterest,
        'Crown Money': crownMoneyLoanCalculation.otherDebtsInterest,
      },
    ];
  }, [appState.otherDebts, bankLoanCalculation, crownMoneyLoanCalculation]);

  const monthTicks = Array.from({ length: 13 }, (_, i) => i);

  const accordionItems = [
      {
          title: "1. Setup & \"What If\" Scenario",
          content: (
            <div className="space-y-6">
                 <div className="w-full md:w-3/4 mx-auto">
                    <SliderInput label={<SliderLabel />} value={appState.crownMoneyInterestRate} onChange={handleRateChange} min={1} max={15} step={0.05} unit="%" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-4">
                    <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs text-[var(--color-positive-text)]">Total Monthly Income</h4>
                        <p className="text-lg font-bold">{formatCurrency(totalMonthlyIncome)}</p>
                    </div>
                    <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs text-[var(--color-negative-text)]">Total Monthly Expenses</h4>
                        <p className="text-lg font-bold">{formatCurrency(totalMonthlyExpenses)}</p>
                    </div>
                    <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs text-[var(--color-surplus-text)]">Current Surplus</h4>
                        <p className="text-lg font-bold">{formatCurrency(surplusForDebtReduction)}</p>
                    </div>
                </div>
                <p className="text-xs text-center text-[var(--text-color-muted)] -mt-2 italic print:hidden">*Surplus is calculated as Total Monthly Income minus Total Monthly Living Expenses from the budget tab.</p>
                <hr className="border-[var(--border-color)] border-dashed my-4" />
                <SliderInput 
                    label={
                        <div className="flex items-center gap-1">
                            <span>Simulate Additional Monthly Income</span>
                            <Tooltip text="Use this slider to see how extra income (e.g., from a pay rise or side hustle) would accelerate your Crown Money payoff time. All charts will update instantly.">
                                <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                            </Tooltip>
                        </div>
                    }
                    value={additionalMonthlyIncome}
                    onChange={setAdditionalMonthlyIncome}
                    min={0}
                    max={5000}
                    step={50}
                    unit="$"
                />
                <div className="mt-4 text-center p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-surplus-bg)', borderColor: 'var(--color-surplus-text)' }}>
                    <span className="font-bold" style={{ color: 'var(--color-surplus-text)' }}>Adjusted Surplus for Crown Plan: </span>
                    <span className="font-bold text-lg" style={{ color: 'var(--color-surplus-text)' }}>
                        {formatCurrency(surplusForDebtReduction + additionalMonthlyIncome)}
                    </span>
                </div>
            </div>
          )
      },
      {
          title: "2. Total Debt Trajectory",
          content: (
            <>
                {isBankLoanValid && isCrownLoanValid ? (
                  <>
                    <p className="text-sm text-[var(--text-color-muted)] mb-4">
                        This chart shows the Bank's **home loan** trajectory vs. Crown Money's **total consolidated debt** trajectory, illustrating the impact of consolidation and accelerated repayment.
                    </p>
                    <div className="w-full h-[500px]">
                        <ResponsiveContainer>
                            <ComposedChart data={loanBalanceChartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="year" type="number" domain={[0, 'dataMax']} ticks={xTicks} stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Years', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }} />
                                <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} domain={[0, yAxisMax]} />
                                <RechartsTooltip content={<CustomAreaTooltip formatter={formatChartCurrency} />} />
                                <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                                <defs>
                                    <linearGradient id="colorBank" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-color-bank)" stopOpacity={0.7}/><stop offset="95%" stopColor="var(--chart-color-bank)" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorCrown" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-color-crown)" stopOpacity={0.7}/><stop offset="95%" stopColor="var(--chart-color-crown)" stopOpacity={0}/></linearGradient>
                                </defs>
                                {isCrownLoanValid && isBankLoanValid && bankLoanCalculation.termInYears > crownMoneyLoanCalculation.termInYears && (
                                    <ReferenceArea
                                        x1={crownMoneyLoanCalculation.termInYears}
                                        x2={bankLoanCalculation.termInYears}
                                        y1={0}
                                        y2={yAxisMax}
                                        stroke="var(--chart-color-wealth)"
                                        strokeOpacity={0.3}
                                        fill="var(--chart-color-wealth)"
                                        fillOpacity={0.1}
                                        ifOverflow="extendDomain"
                                    >
                                        <Label value="Savings & Investment Period" angle={90} position="insideTopLeft" fill="var(--chart-color-wealth)" offset={20} />
                                    </ReferenceArea>
                                )}
                                
                                <Area type="linear" dataKey="Bank" name="Bank (Home Loan Only)" stroke="none" fillOpacity={1} fill="url(#colorBank)" legendType="none" />
                                <Line type="linear" name="Bank (Home Loan Only)" dataKey="Bank" stroke="var(--chart-color-bank)" strokeWidth={2} dot={false} />

                                <Area type="linear" dataKey="Crown Money" name="Crown Money (Total Debt)" stroke="none" fillOpacity={1} fill="url(#colorCrown)" legendType="none" />
                                <Line type="linear" name="Crown Money (Total Debt)" dataKey="Crown Money" stroke="var(--chart-color-crown)" strokeWidth={3} dot={false} />
                                
                                {isCrownLoanValid && isFinite(crownMoneyLoanCalculation.termInYears) && crownMoneyLoanCalculation.termInYears > 0 && (
                                    <ReferenceDot x={crownMoneyLoanCalculation.termInYears} y={0} r={6} fill="var(--chart-color-crown)" stroke="var(--bg-color)" strokeWidth={2} ifOverflow="extendDomain" label={{ value: "Total Debt Free 🏆", position: 'top', fill: 'var(--chart-color-crown)', fontSize: 12, dy: -10, fontWeight: 'bold' }} />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-center text-[var(--text-color-muted)] mt-3 italic print:hidden">*This chart tracks the remaining debt over time for both scenarios.</p>
                  </>
                ) : <p className="text-center text-[var(--text-color-muted)]">Data not available.</p>}
              </>
          )
      },
      {
          title: "3. First 12 Months: Debt Reduction Trajectory",
          content: (
            <>
                <p className="text-sm text-[var(--text-color-muted)] mb-4">
                    This chart zooms in on the crucial first year, showing the rapid debt reduction achieved by the Crown Money strategy compared to a standard bank loan from day one.
                </p>
                <div className="w-full h-[400px]">
                    <ResponsiveContainer>
                        <AreaChart data={first12MonthsData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorBank12m" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-color-bank)" stopOpacity={0.7}/><stop offset="95%" stopColor="var(--chart-color-bank)" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorCrown12m" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-color-crown)" stopOpacity={0.7}/><stop offset="95%" stopColor="var(--chart-color-crown)" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="month" type="number" domain={[0, 12]} ticks={monthTicks} interval={0} stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Months', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }} />
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} domain={['dataMin - 1000', 'dataMax + 1000']} allowDataOverflow />
                            <RechartsTooltip content={<CustomMonthlyTooltip formatter={formatChartCurrency} />} />
                            <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <Area type="monotone" name="Bank (Home Loan Only)" dataKey="Bank" stroke="var(--chart-color-bank)" fill="url(#colorBank12m)" strokeWidth={2} dot={true} />
                            <Area type="monotone" name="Crown Money (Total Debt)" dataKey="Crown Money" stroke="var(--chart-color-crown)" fill="url(#colorCrown12m)" strokeWidth={3} dot={true} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-[var(--text-color-muted)] mt-3 italic print:hidden">*Chart shows remaining loan balance at the end of each month.</p>
            </>
          )
      },
      {
          title: "4. Your Savings Snapshot",
          content: (
            <>
              {isBankLoanValid && isCrownLoanValid && totalInterestSaved > 0 && (
                  <div className="space-y-6">
                      <div className="text-center">
                          <p className="text-lg text-[var(--text-color-muted)]">Total Interest Saved:</p>
                          <p className="text-5xl font-extrabold my-2 animate-pulse" style={{color: 'var(--chart-color-crown)'}}>{formatCurrency(totalInterestSaved)}</p>
                          <div className="text-sm text-center text-[var(--text-color-muted)] mt-2">
                            {primaryInterestSaved > 0 && <p>Primary Loan Savings: <span className="font-semibold text-[var(--color-positive-text)]">{formatCurrency(primaryInterestSaved)}</span></p>}
                            {otherDebtsInterestSaved > 0 && <p>Other Debts Savings: <span className="font-semibold text-[var(--color-positive-text)]">{formatCurrency(otherDebtsInterestSaved)}</span></p>}
                          </div>
                          <p className="text-lg text-[var(--text-color-muted)] mt-4">Years saved:</p>
                          <p className="text-5xl font-extrabold my-2" style={{color: 'var(--chart-color-crown)'}}>{(bankLoanCalculation.termInYears - crownMoneyLoanCalculation.termInYears).toFixed(1)}</p>
                      </div>
                      <p className="text-xs text-center text-[var(--text-color-muted)] mt-2 italic print:hidden">*Interest Saved is the difference between the total interest paid in the Bank scenario and the Crown Money scenario.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                          <div>
                              <h4 className="text-center text-[var(--text-color-muted)] mb-2">Payoff Time Comparison (Years)</h4>
                              <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={yearsChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                                        <XAxis type="category" dataKey="name" hide={true} />
                                        <YAxis stroke="var(--text-color)" domain={[0, 'dataMax + 5']} tickFormatter={(tick) => tick.toFixed(0)} label={{ value: 'Years', angle: -90, position: 'insideLeft', fill: 'var(--text-color-muted)' }} />
                                        <RechartsTooltip content={<CustomBarTooltip formatter={(value: number) => `${value.toFixed(1)} years`} unit="years" />} cursor={{fill: 'var(--card-bg-color)'}} />
                                        <Legend verticalAlign="top" wrapperStyle={{color: "var(--text-color-muted)"}} />
                                        <Bar dataKey="Bank" fill="var(--chart-color-bank)" barSize={60} />
                                        <Bar dataKey="Crown Money" fill="var(--chart-color-crown)" barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                              </div>
                          </div>
                          <div>
                              <h4 className="text-center text-[var(--text-color-muted)] mb-2">Total Interest Comparison ($)</h4>
                              <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={interestChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                                        <XAxis type="category" dataKey="name" hide={true} />
                                        <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} label={{ value: '$', angle: -90, position: 'insideLeft', fill: 'var(--text-color-muted)' }} />
                                        <RechartsTooltip content={<CustomBarTooltip formatter={(value: number) => formatCurrency(value)} unit="currency" />} cursor={{fill: 'var(--card-bg-color)'}}/>
                                        <Legend verticalAlign="top" wrapperStyle={{color: "var(--text-color-muted)"}}/>
                                        <Bar dataKey="Bank" fill="var(--chart-color-bank)" barSize={60} />
                                        <Bar dataKey="Crown Money" fill="var(--chart-color-crown)" barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
            </>
          )
      },
      {
          title: "5. First Year Interest vs. Principal Comparison",
          content: (
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-center mb-2">First Year Comparison</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <DonutChartCard 
                            title="Bank" 
                            homeLoanPrincipal={bankLoanCalculation.year1PrimaryLoanPrincipal}
                            otherDebtsPrincipal={bankLoanCalculation.year1OtherDebtsPrincipal}
                            homeLoanInterest={bankYear1.homeLoanInterest} 
                            otherDebtsInterest={bankYear1.otherDebtsInterest} 
                            showInterestAmount={false} 
                        />
                        <DonutChartCard 
                            title="Crown Money 🏆" 
                            homeLoanPrincipal={crownYear1.principal} 
                            homeLoanInterest={crownYear1.homeLoanInterest} 
                            otherDebtsInterest={crownYear1.otherDebtsInterest} 
                            showInterestAmount={false} 
                            principalWithConsolidation={appState.otherDebts.length > 0 ? crownYear1.principal : undefined}
                            principalWithoutConsolidation={appState.otherDebts.length > 0 ? calculations.crownMoneyLoanCalculation.year1PrimaryOnlyPrincipalPaid : undefined}
                        />
                    </div>
                </div>
                <p className="text-xs text-center text-[var(--text-color-muted)] mt-3 italic print:hidden">*Charts show interest as a percentage of total payments made in the first 12 months.</p>
            </div>
          )
      },
      {
          title: "6. Lifetime Interest vs. Principal Comparison",
          content: (
            <div className="space-y-6">
                 <div>
                    <h4 className="font-semibold text-center mb-2">Lifetime Comparison</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <DonutChartCard 
                            title="Bank" 
                            homeLoanPrincipal={bankLifetime.principal}
                            homeLoanInterest={bankLifetime.homeLoanInterest} 
                            otherDebtsInterest={bankLifetime.otherDebtsInterest} 
                            usePrincipalAsDenominator={true} 
                        />
                        <DonutChartCard 
                            title="Crown Money 🏆" 
                            homeLoanPrincipal={crownLifetime.principal}
                            homeLoanInterest={crownLifetime.homeLoanInterest} 
                            otherDebtsInterest={crownLifetime.otherDebtsInterest} 
                            usePrincipalAsDenominator={true} 
                        />
                    </div>
                </div>
                <p className="text-xs text-center text-[var(--text-color-muted)] mt-3 italic print:hidden">*Charts show total interest paid over the life of the loan as a percentage of the total principal borrowed.</p>
            </div>
          )
      },
      {
        title: "7. Other Debts Strategy Breakdown",
        content: (
            <div className="space-y-6">
                 {appState.otherDebts.length > 0 ? (
                    <>
                        <p className="text-sm text-[var(--text-color-muted)]">This section breaks down how the Crown Money "debt avalanche" strategy tackles your other debts compared to the bank simply treating them as a separate monthly expense.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                              <div>
                                  <h4 className="text-center text-[var(--text-color-muted)] mb-2">Other Debts Payoff Time (Years)</h4>
                                  <div style={{ width: '100%', height: 250 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={otherDebtsChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                                            <XAxis type="category" dataKey="name" hide={true} />
                                            <YAxis stroke="var(--text-color)" domain={[0, 'dataMax + 2']} tickFormatter={(tick) => tick.toFixed(0)} label={{ value: 'Years', angle: -90, position: 'insideLeft', fill: 'var(--text-color-muted)' }} />
                                            <RechartsTooltip content={<CustomBarTooltip formatter={(value: number) => `${value.toFixed(1)} years`} unit="years" />} cursor={{fill: 'var(--card-bg-color)'}} />
                                            <Legend verticalAlign="top" wrapperStyle={{color: "var(--text-color-muted)"}} />
                                            <Bar dataKey="Bank" fill="var(--chart-color-bank)" barSize={60} />
                                            <Bar dataKey="Crown Money" fill="var(--chart-color-crown)" barSize={60} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                              </div>
                              <div>
                                  <h4 className="text-center text-[var(--text-color-muted)] mb-2">Other Debts Interest Paid ($)</h4>
                                  <div style={{ width: '100%', height: 250 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={otherDebtsInterestChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                                            <XAxis type="category" dataKey="name" hide={true} />
                                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} label={{ value: '$', angle: -90, position: 'insideLeft', fill: 'var(--text-color-muted)' }} />
                                            <RechartsTooltip content={<CustomBarTooltip formatter={(value: number) => formatCurrency(value)} unit="currency" />} cursor={{fill: 'var(--card-bg-color)'}} />
                                            <Legend verticalAlign="top" wrapperStyle={{color: "var(--text-color-muted)"}}/>
                                            <Bar dataKey="Bank" fill="var(--chart-color-bank)" barSize={60} />
                                            <Bar dataKey="Crown Money" fill="var(--chart-color-crown)" barSize={60} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                              </div>
                          </div>
                     </>
                 ) : (
                    <p className="text-center text-sm text-[var(--text-color-muted)] p-4">No other debts have been added. Add them on the 'Current Loan' tab.</p>
                )}
            </div>
        )
      },
      {
          title: "8. Detailed Comparison Table",
          content: (
            <>
              {isCrownLoanValid ? (
                  <div className="space-y-4">
                      <div>
                        <div className='flex items-center justify-center gap-2 mb-2'>
                          <h4 className="text-center font-semibold text-base text-[var(--text-color-muted)]">Loan Payoff Time</h4>
                          <Tooltip text="The total time it will take to pay off the loan completely. The Crown Money strategy uses your budget surplus to make extra repayments and reduce this time.">
                              <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                          </Tooltip>
                        </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 rounded-lg"><p className="text-xs font-medium text-[var(--chart-color-bank)]">BANK</p><p className="text-3xl font-bold text-[var(--text-color)]">{isBankLoanValid ? bankLoanCalculation.termInYears.toFixed(1) : 'N/A'}</p><p className="text-sm text-[var(--text-color-muted)]">Years</p></div>
                              <div className="text-center p-3 rounded-lg bg-[var(--chart-color-crown)]/10"><p className="text-xs font-medium text-[var(--chart-color-crown)]">CROWN MONEY 🏆</p><p className="text-3xl font-bold text-[var(--chart-color-crown)]">{isCrownLoanValid ? crownMoneyLoanCalculation.termInYears.toFixed(1) : 'N/A'}</p><p className="text-sm text-[var(--text-color-muted)]">Years</p></div>
                          </div>
                      </div>
                      <hr className="border-[var(--border-color)]" />
                      <div>
                          <h4 className="text-center font-semibold text-base text-[var(--text-color-muted)] mb-2">Debt Free By Age</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="text-center space-y-1 p-3 rounded-lg"><p className="text-xs font-medium text-[var(--chart-color-bank)] mb-1">BANK</p>{appState.people.map(p => (<p key={p.id} className="text-lg font-bold text-[var(--text-color)]">{p.name}: {bankDebtFreeAges[p.id]}</p>))}</div>
                              <div className="text-center space-y-1 p-3 rounded-lg bg-[var(--chart-color-crown)]/10"><p className="text-xs font-medium text-[var(--chart-color-crown)] mb-1">CROWN MONEY 🏆</p>{appState.people.map(p => (<p key={p.id} className="text-lg font-bold text-[var(--chart-color-crown)]">{p.name}: {crownDebtFreeAges[p.id]}</p>))}</div>
                          </div>
                      </div>
                      <hr className="border-[var(--border-color)]" />
                      <div>
                         <div className='flex items-center justify-center gap-2 mb-2'><h4 className="text-center font-semibold text-base text-[var(--text-color-muted)]">Interest Paid Breakdown</h4><Tooltip text="The total interest you will pay over the entire life of the loan. A lower number means more of your money stays in your pocket."><InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/></Tooltip></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 rounded-lg space-y-2"><p className="text-xs font-medium text-[var(--chart-color-bank)] mb-1">BANK</p>
                                <p className="text-xs">Home Loan:</p><p className="text-lg font-bold">{isBankLoanValid ? formatCurrency(bankLoanCalculation.primaryLoanInterest) : 'N/A'}</p>
                                <p className="text-xs">Other Debts:</p><p className="text-lg font-bold">{isBankLoanValid ? formatCurrency(bankLoanCalculation.otherDebtsInterest) : 'N/A'}</p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-[var(--chart-color-crown)]/10 space-y-2"><p className="text-xs font-medium text-[var(--chart-color-crown)] mb-1">CROWN MONEY 🏆</p>
                                <p className="text-xs">Home Loan:</p><p className="text-lg font-bold text-[var(--chart-color-crown)]">{isCrownLoanValid ? formatCurrency(crownMoneyLoanCalculation.primaryLoanInterest) : 'N/A'}</p>
                                <p className="text-xs">Other Debts:</p><p className="text-lg font-bold text-[var(--chart-color-crown)]">{isCrownLoanValid ? formatCurrency(crownMoneyLoanCalculation.otherDebtsInterest) : 'N/A'}</p>
                              </div>
                          </div>
                      </div>
                      <hr className="border-[var(--border-color)] border-dashed" />
                      <div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                               <div className="text-center p-3 rounded-lg border border-[var(--border-color)]"><p className="text-sm font-semibold text-[var(--text-color-muted)] mb-1">TOTAL INTEREST (BANK)</p><p className="text-2xl font-bold text-[var(--text-color)]">{isBankLoanValid ? formatCurrency(bankLoanCalculation.totalInterest) : 'N/A'}</p></div>
                              <div className="text-center p-3 rounded-lg bg-[var(--chart-color-crown)]/10 border border-[var(--chart-color-crown)]"><p className="text-sm font-semibold text-[var(--chart-color-crown)] mb-1">TOTAL INTEREST (CROWN) 🏆</p><p className="text-2xl font-bold text-[var(--chart-color-crown)]">{isCrownLoanValid ? formatCurrency(crownMoneyLoanCalculation.totalInterest) : 'N/A'}</p></div>
                          </div>
                      </div>
                  </div>
              ) : <p className="text-center text-[var(--text-color-muted)]">Data not available.</p>}
            </>
          )
      },
  ];

  if (!isCrownLoanValid) {
    return (
      <Card>
        <div className="text-center text-yellow-400 p-4 bg-yellow-900/50 rounded-lg">
            <p className="font-bold text-lg">Unable to calculate Crown Money scenario.</p>
            <p>Monthly expenses exceed monthly income. Please review the budget on the 'Income & Expenses' tab.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Accordion items={accordionItems} />
    </div>
  );
};

export default React.memo(Tab4_OODC);