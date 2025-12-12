
import React, { useState, useMemo } from 'react';
import { AppState, AmortizationDataPoint, LoanDetails } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import { AreaChart, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid, Area, Scatter, ReferenceDot, Line, Label, PieChart, Pie, Cell, ReferenceArea } from 'recharts';
import Tooltip from './common/Tooltip';
import { InfoIcon, DownloadIcon } from './common/IconComponents';
import { calculateAmortization, getMonthlyAmount, calculatePIPayment } from '../hooks/useMortgageCalculations';
import Accordion from './common/Accordion';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 'N/A';
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

const CustomAreaTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        // Original tooltip logic for the Area chart lines
        const bankData = payload.find(p => p.dataKey === 'Bank');
        const crownData = payload.find(p => p.dataKey === 'Crown Money');
        const difference = (bankData?.value || 0) - (crownData?.value || 0);
        const age = payload[0].payload.age;

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${Number(label).toFixed(1)} (Age: ${Math.floor(age)})`}</p>
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

const CustomSnapshotTooltip = ({ active, payload, label, type }: any) => {
    if (active && payload && payload.length) {
        // Find data by key to be robust
        const bankData = payload.find((p: any) => p.dataKey === 'Bank');
        const crownData = payload.find((p: any) => p.dataKey === 'Crown Money');

        const bankVal = bankData ? bankData.value : 0;
        const crownVal = crownData ? crownData.value : 0;
        const savings = bankVal - crownVal;

        const formatValue = (val: number) => {
            if (type === 'currency') return formatCurrency(val);
            return `${val.toFixed(1)} years`;
        };

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1 z-50">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-bank)' }}></div>
                    <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Bank: ${formatValue(bankVal)}`}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-crown)' }}></div>
                    <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`Crown Money: ${formatValue(crownVal)}`}</p>
                </div>
                <hr className="my-1 border-[var(--border-color)] opacity-50" />
                <p style={{ color: 'var(--tooltip-text-color-muted)' }}>
                    {`Savings: `}
                    <span className="font-semibold" style={{color: 'var(--chart-color-wealth)'}}>
                        {`${formatValue(savings)}`}
                    </span>
                </p>
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
      people
    } = calculations;
  
  const youngestPersonAge = Math.min(...people.map((p: any) => p.age));

  const adjustedCrownLoanCalculation = useMemo(() => {
    if (additionalMonthlyIncome === 0) {
        return initialCrownLoanCalculation;
    }
    
    const { loan, futureChanges, futureLumpSums, crownMoneyInterestRate, otherDebts } = appState;
    const adjustedSurplus = (totalMonthlyIncome + additionalMonthlyIncome) - totalMonthlyExpenses;

    if (adjustedSurplus <= 0) {
        return { termInYears: Infinity, totalInterest: Infinity, totalPaid: Infinity, amortizationSchedule: [] };
    }
    
    const consolidatedAmount = (otherDebts || []).reduce((sum, d) => sum + d.amount, 0);
    const netPrimaryLoanAmount = loan.amount - (loan.offsetBalance || 0);
    const crownLoanDetailsForPrimary: LoanDetails = {
        ...loan, amount: netPrimaryLoanAmount, offsetBalance: 0, interestRate: crownMoneyInterestRate,
    };
    
    const minPrimaryPayment = calculatePIPayment(netPrimaryLoanAmount + consolidatedAmount, crownMoneyInterestRate, 30, 'monthly');
    const extraPayment = Math.max(0, adjustedSurplus - minPrimaryPayment);

    return calculateAmortization(crownLoanDetailsForPrimary, {
        extraMonthlyPayment: extraPayment,
        futureChanges, futureLumpSums, strategy: 'crown'
    });

  }, [appState, additionalMonthlyIncome, initialCrownLoanCalculation, totalMonthlyIncome, totalMonthlyExpenses]);
  
  const crownMoneyLoanCalculation = adjustedCrownLoanCalculation;

  const loanBalanceChartData = useMemo(() => {
    const bankSchedule = bankLoanCalculation.amortizationSchedule;
    const crownSchedule = adjustedCrownLoanCalculation.amortizationSchedule;
    
    if (!bankSchedule || !crownSchedule) return [];

    const bankStart = loan.amount - (loan.offsetBalance || 0);
    const consolidatedDebt = (appState.otherDebts || []).reduce((sum, d) => sum + d.amount, 0);
    const crownStart = bankStart + consolidatedDebt;
    
    const data = [{
        year: 0,
        age: youngestPersonAge,
        'Bank': bankStart,
        'Crown Money': crownStart
    }];

    const maxMonths = Math.max(bankSchedule.length, crownSchedule.length);
    let hasCrownHitZero = false;

    for (let i = 0; i < maxMonths; i++) {
        const month = i + 1;
        
        const bankPoint = bankSchedule[i];
        const bankBalGross = bankPoint?.remainingBalance ?? 0;
        const bankOffset = bankPoint?.offsetBalance ?? 0;
        const bankBalNet = Math.max(0, bankBalGross - bankOffset);

        const crownPoint = crownSchedule[i];
        let crownVal: number | null = null;
        let crownNet = 0;
        
        if (crownPoint) {
             const crownBalGross = (crownPoint as any)?.totalRemainingBalance ?? crownPoint?.remainingBalance ?? 0;
             const crownOffset = crownPoint?.offsetBalance ?? 0;
             crownNet = Math.max(0, crownBalGross - crownOffset);
        } else {
             crownNet = 0;
        }

        if (hasCrownHitZero) {
            crownVal = null;
        } else {
            if (crownNet <= 0.01) {
                crownVal = 0;
                hasCrownHitZero = true;
            } else {
                crownVal = crownNet;
            }
        }
        
        if (!crownPoint && !hasCrownHitZero) {
             crownVal = 0;
             hasCrownHitZero = true;
        }

        data.push({
            year: month / 12,
            age: youngestPersonAge + (month / 12),
            'Bank': isFinite(bankBalNet) ? bankBalNet : 0,
            'Crown Money': crownVal === null ? null : (isFinite(crownVal) ? crownVal : 0)
        });
    }
    
    return data;
  }, [bankLoanCalculation, adjustedCrownLoanCalculation, loan, appState.otherDebts, youngestPersonAge]);

  const snapshotChartsData = useMemo(() => {
    return {
        payoff: [
            {
                name: 'Payoff Time',
                Bank: bankLoanCalculation.termInYears,
                'Crown Money': crownMoneyLoanCalculation.termInYears,
            }
        ],
        interest: [
            {
                name: 'Total Interest',
                Bank: bankLoanCalculation.totalInterest,
                'Crown Money': crownMoneyLoanCalculation.totalInterest,
            }
        ]
    };
  }, [bankLoanCalculation, crownMoneyLoanCalculation]);
  
  const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
  const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;

  const totalInterestSaved = isBankLoanValid && isCrownLoanValid ? bankLoanCalculation.totalInterest - crownMoneyLoanCalculation.primaryLoanInterest : 0;

  const { bankYear1, crownYear1, bankLifetime, crownLifetime } = useMemo(() => {
    // Basic data collection with safety fallbacks
    return {
        bankYear1: {
            homeLoanInterest: bankLoanCalculation.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.interestPaid, 0) || 0,
            principal: bankLoanCalculation.amortizationSchedule.slice(0, 12).reduce((sum, item) => sum + item.principalPaid, 0) || 0,
        },
        crownYear1: {
            principal: crownMoneyLoanCalculation.year1PrimaryOnlyPrincipalPaid || 0,
            homeLoanInterest: crownMoneyLoanCalculation.year1PrimaryLoanInterest || 0,
            otherDebtsInterest: crownMoneyLoanCalculation.year1OtherDebtsInterest || 0
        },
        bankLifetime: {
            principal: (loan.amount - (loan.offsetBalance || 0)),
            homeLoanInterest: bankLoanCalculation.totalInterest || 0,
            otherDebtsInterest: 0
        },
        crownLifetime: {
            principal: (loan.amount - (loan.offsetBalance || 0)) + (appState.otherDebts || []).reduce((s, d) => s + d.amount, 0),
            homeLoanInterest: crownMoneyLoanCalculation.primaryLoanInterest || 0,
            otherDebtsInterest: crownMoneyLoanCalculation.otherDebtsInterest || 0
        },
    };
  }, [bankLoanCalculation, crownMoneyLoanCalculation, loan, appState.otherDebts]);

  const DonutChartCard: React.FC<{
      title: string;
      homeLoanPrincipal: number;
      otherDebtsPrincipal?: number;
      homeLoanInterest: number;
      otherDebtsInterest: number;
      displayMode?: 'default' | 'largePrincipal';
  }> = ({ title, homeLoanPrincipal, otherDebtsPrincipal = 0, homeLoanInterest, otherDebtsInterest, displayMode = 'default' }) => {
      
      const safeHomeLoanPrincipal = isFinite(homeLoanPrincipal) ? homeLoanPrincipal : 0;
      const safeOtherDebtsPrincipal = isFinite(otherDebtsPrincipal) ? otherDebtsPrincipal : 0;
      const safeHomeLoanInterest = isFinite(homeLoanInterest) ? homeLoanInterest : 0;
      const safeOtherDebtsInterest = isFinite(otherDebtsInterest) ? otherDebtsInterest : 0;

      const totalPrincipal = safeHomeLoanPrincipal + safeOtherDebtsPrincipal;
      const totalInterest = safeHomeLoanInterest + safeOtherDebtsInterest;
      
      // Prevent crash if total interest is massive/infinite
      if (!isFinite(totalInterest) || totalInterest > 1000000000) {
          return (
              <div className="text-center p-2 bg-black/5 dark:bg-white/5 rounded-lg h-60 flex flex-col justify-center items-center">
                  <h5 className="font-semibold text-red-400">Calculation Unavailable</h5>
                  <p className="text-xs text-[var(--text-color-muted)]">Interest values are too high to display.</p>
              </div>
          );
      }

      const data = [
          { name: 'Principal', value: Math.max(0, totalPrincipal) },
          { name: 'Interest', value: Math.max(0, totalInterest) },
      ];
      if (data.every(d => d.value === 0)) data[0].value = 1;

      const totalAmount = totalPrincipal + totalInterest;
      const interestPercent = totalAmount > 0 ? (totalInterest / totalAmount) * 100 : 0;
      const principalPercent = totalAmount > 0 ? (totalPrincipal / totalAmount) * 100 : 0;

      return (
          <div className="text-center p-2 bg-black/5 dark:bg-white/5 rounded-lg flex flex-col justify-between">
              <h5 className={`font-semibold ${title.includes('Crown') ? 'text-lg' : 'text-base'}`}>{title}</h5>
              <div className={`w-full relative ${displayMode === 'largePrincipal' ? 'h-52' : 'h-40'}`}>
                  <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                      <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={2}>
                              <Cell fill="var(--chart-color-principal)" />
                              <Cell fill="var(--chart-color-interest)" />
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {displayMode === 'largePrincipal' ? (
                          <>
                              <span className="font-bold text-3xl" style={{color: 'var(--chart-color-principal)'}}>{principalPercent.toFixed(0)}%</span>
                              <span className="text-xs text-[var(--text-color-muted)]">Principal</span>
                          </>
                      ) : (
                          <>
                              <span className="font-bold text-2xl" style={{color: 'var(--chart-color-interest)'}}>{interestPercent.toFixed(0)}%</span>
                              <span className="text-xs text-[var(--text-color-muted)]">Interest</span>
                          </>
                      )}
                  </div>
              </div>
              <div className="text-xs text-left px-1 mt-1 space-y-1">
                  <div className="flex items-center">
                        <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-principal)'}}></div>Principal</span>
                        <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(safeHomeLoanPrincipal)}</span>
                    </div>
                    {(safeHomeLoanInterest > 0 && displayMode !== 'largePrincipal') && (
                        <div className="flex items-center pl-3.5">
                            <span className="text-[var(--text-color-muted)] flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--chart-color-interest)'}}></div>Interest</span>
                            <span className="font-semibold text-[var(--text-color)] ml-auto">{formatCurrency(safeHomeLoanInterest)}</span>
                        </div>
                    )}
              </div>
          </div>
      );
  };
  
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

  const formatYears = (value: number) => {
    if (!isFinite(value)) return 'N/A';
    return `${value.toFixed(2)}`; // Use 2 decimals here as per original design for section 4 large numbers, or change if needed. User asked for 1 max.
  }
  
  // Actually, user requested "at most one decimal point".
  const formatYearsStrict = (value: number) => {
    if (!isFinite(value)) return 'N/A';
    return `${value.toFixed(1)}`;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Accordion items={[
      {
          title: "1. Setup & \"What If\" Scenario",
          content: (
            <div className="space-y-6">
                 <div className="w-full md:w-3/4 mx-auto">
                    <SliderInput 
                        label={<div className='flex items-center justify-center gap-2'><span className='text-sm font-medium'>Crown Money Interest Rate</span></div>} 
                        value={appState.crownMoneyInterestRate} 
                        onChange={(v) => setAppState(prev => ({ ...prev, crownMoneyInterestRate: v }))} 
                        min={1} max={15} step={0.05} unit="%" 
                    />
                </div>
                <SliderInput 
                    label="Simulate Additional Monthly Income"
                    value={additionalMonthlyIncome}
                    onChange={setAdditionalMonthlyIncome}
                    min={0} max={5000} step={50} unit="$"
                />
            </div>
          )
      },
      {
          title: "2. Total Debt Trajectory",
          content: (
            <>
                <p className="text-sm text-[var(--text-color-muted)] mb-4">
                    This chart shows the Bank's **home loan** trajectory vs. Crown Money's **total consolidated debt** trajectory.
                </p>
                <div style={{ width: '100%', height: 500 }}>
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <ComposedChart data={loanBalanceChartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="year" type="number" stroke="var(--text-color)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                            <RechartsTooltip content={<CustomAreaTooltip formatter={formatChartCurrency} />} />
                            <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            {isCrownLoanValid && isBankLoanValid && bankLoanCalculation.termInYears > crownMoneyLoanCalculation.termInYears && (
                                <ReferenceArea
                                    x1={crownMoneyLoanCalculation.termInYears}
                                    x2={bankLoanCalculation.termInYears}
                                    y1={0}
                                    stroke="var(--chart-color-wealth)"
                                    strokeOpacity={0.3}
                                    fill="var(--chart-color-wealth)"
                                    fillOpacity={0.1}
                                    ifOverflow="extendDomain"
                                >
                                    <Label value="Savings & Investment Period" angle={90} position="insideTopLeft" fill="var(--chart-color-wealth)" offset={20} />
                                </ReferenceArea>
                            )}
                            <Area type="linear" dataKey="Bank" stroke="none" fill="var(--chart-color-bank)" fillOpacity={0.2} />
                            <Line type="linear" dataKey="Bank" stroke="var(--chart-color-bank)" strokeWidth={2} dot={false} />
                            <Area type="linear" dataKey="Crown Money" stroke="none" fill="var(--chart-color-crown)" fillOpacity={0.2} />
                            <Line type="linear" dataKey="Crown Money" stroke="var(--chart-color-crown)" strokeWidth={3} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
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
                          <p className="text-5xl font-extrabold my-2 animate-pulse" style={{color: 'var(--chart-color-wealth)'}}>{formatCurrency(totalInterestSaved)}</p>
                          <p className="text-sm font-semibold text-green-600">Primary Loan Savings: {formatCurrency(totalInterestSaved)}</p>

                          <p className="text-lg text-[var(--text-color-muted)] mt-4">Years saved:</p>
                          <p className="text-5xl font-extrabold my-2" style={{color: 'var(--chart-color-wealth)'}}>{(bankLoanCalculation.termInYears - crownMoneyLoanCalculation.termInYears).toFixed(1)}</p>
                      </div>

                      <p className="text-xs text-center text-[var(--text-color-muted)] italic">
                          *Interest Saved is the difference between the total interest paid in the Bank scenario and the Crown Money scenario.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                          {/* Payoff Time Chart */}
                          <div style={{ height: 300 }}>
                              <h4 className="text-center font-semibold text-[var(--text-color-muted)] mb-4">Payoff Time Comparison (Years)</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={snapshotChartsData.payoff} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                      <YAxis stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Years', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-color-muted)', textAnchor: 'middle' }, offset: 10 }} />
                                      <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomSnapshotTooltip type="years" />} />
                                      <Legend iconType="square" wrapperStyle={{ paddingTop: '10px' }} />
                                      <Bar dataKey="Bank" fill="var(--chart-color-bank)" barSize={40} />
                                      <Bar dataKey="Crown Money" fill="var(--chart-color-crown)" barSize={40} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>

                          {/* Interest Comparison Chart */}
                          <div style={{ height: 300 }}>
                              <h4 className="text-center font-semibold text-[var(--text-color-muted)] mb-4">Total Interest Comparison ($)</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={snapshotChartsData.interest} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                      <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} label={{ value: '$', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-color-muted)', textAnchor: 'middle' }, offset: 0 }} />
                                      <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomSnapshotTooltip type="currency" />} />
                                      <Legend iconType="square" wrapperStyle={{ paddingTop: '10px' }} />
                                      <Bar dataKey="Bank" fill="var(--chart-color-bank)" barSize={40} />
                                      <Bar dataKey="Crown Money" fill="var(--chart-color-crown)" barSize={40} />
                                  </BarChart>
                              </ResponsiveContainer>
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
                            homeLoanPrincipal={bankYear1.principal}
                            homeLoanInterest={bankYear1.homeLoanInterest} 
                            otherDebtsInterest={0} 
                            displayMode="largePrincipal"
                        />
                        <DonutChartCard 
                            title="Crown Money 🏆" 
                            homeLoanPrincipal={crownYear1.principal} 
                            homeLoanInterest={crownYear1.homeLoanInterest} 
                            otherDebtsInterest={crownYear1.otherDebtsInterest} 
                            displayMode="largePrincipal"
                        />
                    </div>
                </div>
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
                        />
                        <DonutChartCard 
                            title="Crown Money 🏆" 
                            homeLoanPrincipal={crownLifetime.principal}
                            homeLoanInterest={crownLifetime.homeLoanInterest} 
                            otherDebtsInterest={crownLifetime.otherDebtsInterest} 
                        />
                    </div>
                </div>
            </div>
          )
      },
      {
          title: "7. Detailed Comparison Table",
          content: (
            <div className="space-y-8 px-2 py-2">
                {/* Loan Payoff Time */}
                <div>
                     <div className="flex justify-center items-center gap-2 mb-6">
                        <h4 className="font-semibold text-[var(--text-color-muted)] text-lg">Loan Payoff Time</h4>
                         <Tooltip text="The estimated time to become completely debt free on your home loan (and any consolidated debts for Crown).">
                            <InfoIcon className="h-5 w-5 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                     </div>
                     <div className="flex justify-between items-center px-2 sm:px-12">
                        <div className="text-center">
                            <p className="text-xs font-bold text-[var(--text-color-muted)] tracking-wider mb-2">BANK</p>
                            <p className="text-4xl sm:text-5xl font-extrabold text-[var(--text-color)]">{formatYearsStrict(bankLoanCalculation.termInYears)}</p>
                            <p className="text-sm font-medium text-[var(--text-color-muted)] mt-1">Years</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-[var(--title-color)] tracking-wider mb-2">CROWN MONEY 🏆</p>
                            <p className="text-4xl sm:text-5xl font-extrabold text-[var(--title-color)]">{formatYearsStrict(crownMoneyLoanCalculation.termInYears)}</p>
                            <p className="text-sm font-medium text-[var(--text-color-muted)] mt-1">Years</p>
                        </div>
                     </div>
                </div>

                <hr className="border-[var(--border-color)] border-dashed" />

                {/* Debt Free By Age */}
                <div>
                     <h4 className="font-semibold text-[var(--text-color-muted)] text-center text-lg mb-6">Debt Free By Age</h4>
                     <div className="flex justify-between items-start px-2 sm:px-12">
                        <div className="text-center space-y-3">
                            <p className="text-xs font-bold text-[var(--text-color-muted)] tracking-wider mb-2">BANK</p>
                            {people.map((p: any) => (
                                <div key={p.id} className="text-base sm:text-lg font-bold text-[var(--text-color)]">
                                    {p.name}: <span className="ml-1">{isBankLoanValid ? Math.ceil(p.age + bankLoanCalculation.termInYears) : 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-center space-y-3">
                            <p className="text-xs font-bold text-[var(--title-color)] tracking-wider mb-2">CROWN MONEY 🏆</p>
                             {people.map((p: any) => (
                                <div key={p.id} className="text-base sm:text-lg font-bold text-[var(--title-color)]">
                                    {p.name}: <span className="ml-1">{isCrownLoanValid ? Math.ceil(p.age + crownMoneyLoanCalculation.termInYears) : 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>

                <hr className="border-[var(--border-color)] border-dashed" />

                {/* Interest Paid Breakdown */}
                <div>
                     <div className="flex justify-center items-center gap-2 mb-6">
                        <h4 className="font-semibold text-[var(--text-color-muted)] text-lg">Interest Paid Breakdown</h4>
                         <Tooltip text="Total interest paid over the life of the loan. Crown Money includes interest on consolidated debts.">
                            <InfoIcon className="h-5 w-5 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                     </div>
                     <div className="flex justify-between items-center px-2 sm:px-12 mb-8">
                        <div className="text-center">
                            <p className="text-xs font-bold text-[var(--text-color-muted)] tracking-wider mb-2">BANK</p>
                            <p className="text-sm text-[var(--text-color-muted)] mb-1">Home Loan:</p>
                            <p className="text-2xl sm:text-3xl font-bold text-[var(--text-color)]">{formatCurrency(bankLoanCalculation.totalInterest)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-[var(--title-color)] tracking-wider mb-2">CROWN MONEY 🏆</p>
                            <p className="text-sm text-[var(--text-color-muted)] mb-1">Total Consolidated Debt:</p>
                            <p className="text-2xl sm:text-3xl font-bold text-[var(--title-color)]">{formatCurrency(crownMoneyLoanCalculation.totalInterest)}</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-6 rounded-xl border border-[var(--border-color)] bg-white dark:bg-white/5 text-center shadow-sm">
                             <p className="text-xs font-bold text-[var(--text-color-muted)] uppercase tracking-wider mb-2">TOTAL INTEREST (BANK)</p>
                             <p className="text-3xl font-black text-[var(--text-color)]">{formatCurrency(bankLoanCalculation.totalInterest)}</p>
                        </div>
                        <div className="p-6 rounded-xl border border-[var(--title-color)] bg-[var(--title-color)]/5 text-center shadow-sm relative overflow-hidden">
                             <div className="absolute top-2 right-2 animate-bounce">
                                <span className="text-lg">🏆</span>
                             </div>
                             <p className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-2">TOTAL INTEREST (CROWN)</p>
                             <p className="text-3xl font-black text-[var(--title-color)]">{formatCurrency(crownMoneyLoanCalculation.totalInterest)}</p>
                        </div>
                     </div>
                </div>
            </div>
          )
      },
      ]} />
    </div>
  );
};

export default React.memo(Tab4_OODC);
