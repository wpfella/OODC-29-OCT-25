

import React, { useMemo } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import { ComposedChart, AreaChart, Area, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceDot, Label } from 'recharts';
import Tooltip from './common/Tooltip';
import { InfoIcon } from './common/IconComponents';

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

const CustomAreaTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        const age = payload[0].payload.age;
        const crownData = payload.find(p => p.dataKey.includes('Crown'));
        const bankData = payload.find(p => p.dataKey.includes('Bank'));
        const difference = (bankData?.value || 0) - (crownData?.value || 0);

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${label} (Age: ${Math.floor(age)})`}</p>
                {payload.map((pld: any) => (
                     <div key={pld.dataKey} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: pld.stroke || pld.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`${pld.name || pld.dataKey}: ${formatter(pld.value)}`}</p>
                    </div>
                ))}
                 {difference > 0 && crownData && (
                     <>
                        <hr className="my-1 border-[var(--border-color)] opacity-50" />
                        <p style={{ color: 'var(--tooltip-text-color-muted)' }}>
                            {`Ahead by: `}
                            <span className="font-semibold" style={{color: 'var(--tooltip-text-color-positive)'}}>
                                {`${formatter(difference)}`}
                            </span>
                        </p>
                    </>
                )}
            </div>
        );
    }
    return null;
};

const Tab_InvestmentOODC: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { investmentLoanCalculations, crownMoneyLoanCalculation, bankLoanCalculation, totalDebtData } = calculations;
  const { investmentProperties, payoffStrategy } = appState;

  // Chart axis calculations
  const initialDebt = totalDebtData?.[0]?.['Bank'] || 500000;
  const yAxisMax = Math.ceil((initialDebt * 1.05) / 50000) * 50000;

  const maxYear = totalDebtData?.length > 0 ? Math.ceil(totalDebtData[totalDebtData.length - 1].year) : 30;
  const xTicks = Array.from({ length: Math.floor(maxYear / 2) + 1 }, (_, i) => i * 2);

  // --- Chart Event Dot Calculations ---
  const findYValue = (year: number, dataKey: string, data: any[]) => {
      if (!data || data.length === 0) return 0;
      const closestPoint = data.reduce((prev: any, curr: any) => 
          Math.abs(curr.year - year) < Math.abs(prev.year - year) ? curr : prev
      );
      return closestPoint ? closestPoint[dataKey] : 0;
  };

  const crownPayoffEvents = useMemo(() => 
    investmentLoanCalculations.payoffBreakpoints.map((bp: any) => ({
        ...bp,
        y: 0, // Payoff events happen at 0 balance for the targeted loan.
    })), [investmentLoanCalculations.payoffBreakpoints]);

  const bankPayoffEvents = useMemo(() => {
      const events = [];
      if (bankLoanCalculation.termInYears !== Infinity) {
          events.push({
              year: bankLoanCalculation.termInYears,
              label: 'Primary Home Paid Off (Bank)',
              y: findYValue(bankLoanCalculation.termInYears, 'Bank', totalDebtData),
          });
      }
      investmentLoanCalculations.investmentPayoffSchedule.forEach((prop: any) => {
          if (prop.bank.termInYears !== Infinity) {
              events.push({
                  year: prop.bank.termInYears,
                  label: `${prop.propertyAddress} Paid Off (Bank)`,
                  y: findYValue(prop.bank.termInYears, 'Bank', totalDebtData),
              });
          }
      });
      return Array.from(new Map(events.map(event => [event.year.toFixed(1), event])).values());
  }, [bankLoanCalculation, investmentLoanCalculations, totalDebtData]);

  const startEvent = useMemo(() => {
      if (!totalDebtData || totalDebtData.length === 0) return null;
      return {
          year: 0,
          yBank: totalDebtData[0]['Bank'],
          yCrown: totalDebtData[0]['Crown Money Snowball'],
      };
  }, [totalDebtData]);
  // --- End Chart Event Dot Calculations ---

  const handleStrategyChange = (strategy: 'snowball' | 'simultaneous') => {
    setAppState(prev => ({ ...prev, payoffStrategy: strategy }));
  };
  
  const formatCurrency = (value: number) => {
    if (!isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  const formatYears = (value: number) => {
    if (!isFinite(value) || isNaN(value)) return 'N/A';
    return `${value.toFixed(1)}`;
  }

  if (investmentProperties.length === 0) {
    return (
      <Card>
        <div className="text-center text-[var(--text-color-muted)] p-8">
            <h3 className="text-xl font-bold mb-2 text-[var(--text-color)]">No Investment Properties Added</h3>
            <p>Add a property on the 'Investments' tab to see portfolio payoff comparisons.</p>
        </div>
      </Card>
    );
  }
  
  if (crownMoneyLoanCalculation.termInYears === Infinity) {
    return (
      <Card>
        <div className="text-center text-yellow-400 p-4 bg-yellow-900/50 rounded-lg">
            <p className="font-bold text-lg">Cannot Calculate Investment Payoff</p>
            <p>Your primary home loan must be payable under the Crown Money strategy first. Check your budget on the 'Income & Expenses' tab.</p>
        </div>
      </Card>
    );
  }

  const totalInvestmentInterestSaved = investmentLoanCalculations.totalBankInterest - investmentLoanCalculations.totalCrownInterest;
  const totalDebtFreeYears = crownMoneyLoanCalculation.termInYears + investmentLoanCalculations.totalCrownTerm;
  
  return (
    <div className="animate-fade-in space-y-6">
        <Card>
            <h3 className="text-lg font-bold text-[var(--title-color)] text-center mb-2">Investment Payoff Strategy</h3>
            <p className="text-sm text-center text-[var(--text-color-muted)] mb-4">
                After your home is paid off, your surplus cashflow is used to accelerate your investment loan repayments. Choose your preferred strategy below.
                <br />
                Your total investment debt is <strong>{formatCurrency(investmentLoanCalculations.totalInvestmentDebt)}</strong>.
            </p>
            <div className="flex justify-center p-1 rounded-full bg-[var(--input-bg-color)] border border-[var(--border-color)] max-w-md mx-auto">
                <Tooltip text="Snowball Method: After your home is paid off, all surplus cashflow is directed to the investment property with the smallest loan balance. Once that's paid off, the payment 'snowballs' to the next smallest loan. This provides quick wins and builds momentum.">
                    <button 
                        onClick={() => handleStrategyChange('snowball')}
                        className={`w-full py-2 px-4 rounded-full text-sm font-semibold transition-colors ${payoffStrategy === 'snowball' ? 'bg-indigo-600 text-white' : 'text-[var(--text-color-muted)] hover:bg-white/5'}`}
                    >
                        Snowball (Lowest Loan First)
                    </button>
                </Tooltip>
                 <Tooltip text="Simultaneous Method: After your home is paid off, your surplus cashflow is split proportionally among all investment loans. This pays down all properties at the same time, though it may feel slower as you don't get the 'quick win' of paying off a single loan.">
                    <button 
                        onClick={() => handleStrategyChange('simultaneous')}
                        className={`w-full py-2 px-4 rounded-full text-sm font-semibold transition-colors ${payoffStrategy === 'simultaneous' ? 'bg-indigo-600 text-white' : 'text-[var(--text-color-muted)] hover:bg-white/5'}`}
                    >
                        Simultaneous Payoff
                    </button>
                </Tooltip>
            </div>
        </Card>
        
        {payoffStrategy === 'snowball' && (
            <>
                {totalDebtData?.length > 0 && (
                    <Card title="Visualizing the Snowball: Targeted Loan Payoff vs. Total Bank Debt">
                        <div className="text-sm text-[var(--text-color-muted)] mb-4 space-y-2">
                            <p>This chart provides a unique view of the snowball strategy in action:</p>
                             <ul className="list-disc pl-5 space-y-1">
                                <li>The <strong>Bank Debt (grey area)</strong> shows your total portfolio debt over time with a standard bank loan.</li>
                                <li>The <strong>Crown Total Debt (green dotted line)</strong> shows the smooth downward trajectory of your entire portfolio debt using the Crown Money strategy.</li>
                                <li>The <strong>Crown Targeted Loan (purple area)</strong> visualizes the snowball effect. It shows the balance of the single loan being actively targeted at any given time. Watch as it pays off one loan, drops to zero, then jumps up to target the next investment loan, creating a powerful "sawtooth" payoff pattern.</li>
                            </ul>
                            <p className="mt-2">This illustrates how the Crown Money strategy reduces your overall debt while focusing its entire power on one debt at a time to eliminate it rapidly before moving to the next.</p>
                        </div>
                        <div className="w-full h-[500px]">
                            <ResponsiveContainer>
                                <ComposedChart data={totalDebtData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis 
                                        dataKey="year" 
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        stroke="var(--text-color)" 
                                        tick={{ fontSize: 10 }} 
                                        label={{ value: 'Years', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }}
                                        ticks={xTicks}
                                        interval="preserveStart"
                                    />
                                    <YAxis 
                                        stroke="var(--text-color)" 
                                        tickFormatter={formatChartCurrency} 
                                        tick={{ fontSize: 12 }} 
                                        domain={[0, yAxisMax]}
                                    />
                                    <RechartsTooltip content={<CustomAreaTooltip formatter={formatCurrency} />} />
                                    <Legend iconType="square" wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                                    <defs>
                                        <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-color-crown)" stopOpacity={0.7}/>
                                            <stop offset="95%" stopColor="var(--chart-color-crown)" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorBankInvestment" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-color-bank)" stopOpacity={0.7}/>
                                            <stop offset="95%" stopColor="var(--chart-color-bank)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="Bank" name="Bank Total Debt" stroke="var(--chart-color-bank)" fillOpacity={1} fill="url(#colorBankInvestment)" strokeWidth={2} dot={false} />
                                    <Area type="monotone" dataKey="Crown Money Snowball" name="Crown Targeted Loan" stroke="var(--chart-color-crown)" fillOpacity={1} fill="url(#colorTrajectory)" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Crown Money" name="Crown Total Debt" stroke="var(--chart-color-wealth)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    
                                    {/* Loan Start Dots */}
                                    {startEvent && (
                                        <>
                                            <ReferenceDot x={startEvent.year} y={startEvent.yBank} r={6} fill="var(--chart-color-bank)" stroke="var(--bg-color)" strokeWidth={2}>
                                                <Label value="Portfolio Start" position="top" fill="var(--text-color-muted)" fontSize={12} dy={-15} />
                                            </ReferenceDot>
                                            <ReferenceDot x={startEvent.year} y={startEvent.yCrown} r={6} fill="var(--chart-color-crown)" stroke="var(--bg-color)" strokeWidth={2} />
                                        </>
                                    )}

                                    {/* Crown Payoff Dots */}
                                    {crownPayoffEvents.map((bp: any, index: number) => (
                                        <ReferenceDot key={`crown-dot-${index}`} x={bp.year} y={bp.y} r={6} fill="var(--chart-color-crown)" stroke="var(--bg-color)" strokeWidth={2}>
                                            <Label value={`${bp.label} 🏆`} position="top" fill="var(--text-color)" fontSize={12} offset={15} />
                                        </ReferenceDot>
                                    ))}

                                    {/* Bank Payoff Dots */}
                                    {bankPayoffEvents.map((event: any, index: number) => (
                                        <ReferenceDot key={`bank-dot-${index}`} x={event.year} y={event.y} r={6} fill="var(--chart-color-bank)" stroke="var(--bg-color)" strokeWidth={2}>
                                            <Label value={event.label} position="bottom" fill="var(--text-color-muted)" fontSize={12} offset={15} />
                                        </ReferenceDot>
                                    ))}

                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
            </>
        )}

        {payoffStrategy === 'simultaneous' && totalDebtData?.length > 0 && (
            <Card title="Total Debt Trajectory (Simultaneous vs Bank)">
                <p className="text-sm text-[var(--text-color-muted)] mb-4">
                    This graph illustrates the reduction of your entire portfolio's debt (home + investments) over time, comparing the bank's plan to the Crown Money simultaneous payoff strategy.
                </p>
                <div className="w-full h-[400px]">
                    <ResponsiveContainer>
                        <AreaChart data={totalDebtData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis 
                                dataKey="year" 
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                stroke="var(--text-color)" 
                                tick={{ fontSize: 12 }} 
                                label={{ value: 'Years', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }}
                            />
                            <YAxis 
                                stroke="var(--text-color)" 
                                tickFormatter={formatChartCurrency} 
                                tick={{ fontSize: 12 }} 
                            />
                            <RechartsTooltip content={<CustomAreaTooltip formatter={formatCurrency} />} />
                            <Legend iconType="square" wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <defs>
                                <linearGradient id="colorBankTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-color-bank)" stopOpacity={0.7}/>
                                    <stop offset="95%" stopColor="var(--chart-color-bank)" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCrownTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-color-crown)" stopOpacity={0.7}/>
                                    <stop offset="95%" stopColor="var(--chart-color-crown)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="Bank" stroke="var(--chart-color-bank)" fillOpacity={1} fill="url(#colorBankTotal)" strokeWidth={2} dot={false}/>
                            <Area type="monotone" dataKey="Crown Money" stroke="var(--chart-color-crown)" fillOpacity={1} fill="url(#colorCrownTotal)" strokeWidth={2} dot={false}/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        )}
        
        {investmentLoanCalculations.investmentPayoffSchedule.map((prop: any, index: number) => (
             <Card key={prop.propertyId}>
                <h3 className="text-lg font-bold text-[var(--title-color)]">Investment Property {index + 1}: {prop.propertyAddress}</h3>
                <p className="text-sm text-[var(--text-color-muted)] mb-4">
                    Loan Amount: <strong>{formatCurrency(prop.loanAmount)}</strong>. 
                    {payoffStrategy === 'snowball' ? 
                        ` Payoff starts after ${formatYears(prop.crown.startYear)} years and finishes in ${formatYears(prop.crown.durationYears)} years.` :
                        ` Payoff starts after ${formatYears(crownMoneyLoanCalculation.termInYears)} years and finishes simultaneously with other properties.`
                    }
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="font-semibold text-center text-base text-[var(--text-color-muted)] mb-2">Payoff Time</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <p className="text-xs font-medium text-[var(--chart-color-bank)]">BANK</p>
                                <p className="text-3xl font-bold text-[var(--text-color)]">{formatYears(prop.bank.termInYears)}</p>
                                <p className="text-sm text-[var(--text-color-muted)]">Years</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-medium text-[var(--chart-color-crown)]">CROWN 🏆</p>
                                <p className="text-3xl font-bold text-[var(--chart-color-crown)]">{formatYears(prop.crown.durationYears)}</p>
                                <p className="text-sm text-[var(--text-color-muted)]">Years</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="font-semibold text-center text-base text-[var(--text-color-muted)] mb-2">Total Interest Paid</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <p className="text-xs font-medium text-[var(--chart-color-bank)]">BANK</p>
                                <p className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(prop.bank.totalInterest)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-medium text-[var(--chart-color-crown)]">CROWN 🏆</p>
                                <p className="text-2xl font-bold text-[var(--chart-color-crown)]">{formatCurrency(prop.crown.totalInterest)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                 <p className="text-xs text-center text-[var(--text-color-muted)] mt-3 italic print:hidden">*Crown payoff time for each property reflects the duration of active repayments after the primary home is paid off.</p>
             </Card>
        ))}

        <Card title="Total Savings & Final Timeline">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 text-center bg-black/10 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                        <h4 className="text-base text-[var(--text-color-muted)]">Total Interest Saved on Investments</h4>
                        <Tooltip text="CALCULATION: (Total interest paid on all investment loans with the Bank) - (Total interest paid on all investment loans with Crown Money).">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </div>
                    <p className="text-4xl font-bold my-2 text-[var(--chart-color-crown)]">{formatCurrency(totalInvestmentInterestSaved)}</p>
                </div>
                 <div className="p-4 text-center bg-black/10 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                        <h4 className="text-base text-[var(--text-color-muted)]">Completely Debt Free in:</h4>
                        <Tooltip text="CALCULATION: (Crown Money Home Loan Payoff Time) + (Crown Money Investment Loans Payoff Time). This is your final debt-free date for your entire portfolio.">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </div>
                    <p className="text-4xl font-bold my-2 text-[var(--chart-color-crown)]">{formatYears(totalDebtFreeYears)} Years</p>
                </div>
            </div>
            <p className="text-center text-sm text-[var(--text-color-muted)] mt-4">
                With your bank, paying off all investment loans would take <strong>{formatYears(investmentLoanCalculations.totalBankTerm)} Years</strong>, assuming all loans are paid in parallel.
            </p>
        </Card>
    </div>
  );
};

export default React.memo(Tab_InvestmentOODC);