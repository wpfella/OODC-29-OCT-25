
import React, { useMemo, useEffect } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import { ComposedChart, AreaChart, Area, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceDot, Label, ReferenceLine, BarChart, Bar } from 'recharts';
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
        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${Number(label).toFixed(1)}`}</p>
                {payload.map((pld: any) => (
                     <div key={pld.dataKey} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: pld.stroke || pld.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`${pld.name || pld.dataKey}: ${formatter(pld.value)}`}</p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CustomBarTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${label}`}</p>
                {payload.map((pld: any) => {
                    const isCrown = pld.name.includes("Crown");
                    // Ensure high contrast for Crown text on dark background
                    const textColor = isCrown ? '#E9D5FF' : 'var(--tooltip-text-color)';
                    return (
                        <div key={pld.dataKey} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: pld.fill }}></div>
                            <p className="font-semibold" style={{ color: textColor }}>{`${pld.name}: ${formatter(pld.value)}`}</p>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

const Tab_InvestmentOODC: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { investmentLoanCalculations, crownMoneyLoanCalculation, bankLoanCalculation, totalDebtData } = calculations;
  const { investmentProperties, payoffStrategy } = appState;

  useEffect(() => {
      if (payoffStrategy !== 'snowball') {
          setAppState(prev => ({ ...prev, payoffStrategy: 'snowball' }));
      }
  }, [payoffStrategy, setAppState]);

  // Sanitize chart data to prevent infinity/NaN
  const safeTotalDebtData = useMemo(() => {
      if (!totalDebtData) return [];
      return totalDebtData.map((item: any) => {
          const newItem: any = { ...item };
          Object.keys(newItem).forEach(key => {
              if (typeof newItem[key] === 'number' && !isFinite(newItem[key])) {
                  newItem[key] = 0;
              }
          });
          return newItem;
      });
  }, [totalDebtData]);

  // Calculate Annual Principal Reduction Data
  const annualPrincipalData = useMemo(() => {
      if (!safeTotalDebtData || safeTotalDebtData.length < 13) return [];
      
      const years = [];
      const totalPoints = safeTotalDebtData.length;
      
      // Find Primary Payoff Year for reference
      const primaryPayoffYear = Math.ceil(crownMoneyLoanCalculation.termInYears);

      // We need at least 2 points to calculate a delta.
      for (let i = 12; i < totalPoints; i += 12) {
          const prevData = safeTotalDebtData[i - 12];
          const currData = safeTotalDebtData[i];
          
          if (!prevData || !currData) break;

          const bankPrincipalPaid = Math.max(0, (prevData['Bank'] || 0) - (currData['Bank'] || 0));
          // Crown "Total Debt" decrease represents total principal paid across all loans
          const crownPrincipalPaid = Math.max(0, (prevData['Crown Money'] || 0) - (currData['Crown Money'] || 0));
          
          years.push({
              year: currData.year,
              'Bank Principal': bankPrincipalPaid,
              'Crown Principal': crownPrincipalPaid,
              isSnowballPhase: currData.year > primaryPayoffYear
          });
      }
      return years;
  }, [safeTotalDebtData, crownMoneyLoanCalculation.termInYears]);

  const initialDebt = safeTotalDebtData?.[0]?.['Bank'] || 500000;
  const yAxisMax = Math.ceil((initialDebt * 1.05) / 50000) * 50000;

  const formatCurrency = (value: number) => {
    if (!isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  const formatYears = (value: number) => {
    if (!isFinite(value)) return 'N/A';
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
  const primaryPayoffYear = crownMoneyLoanCalculation.termInYears;
  
  return (
    <div className="animate-fade-in space-y-6">
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-[var(--title-color)] mb-1">Investment Payoff Strategy: Snowball</h3>
                    <p className="text-sm text-[var(--text-color-muted)]">
                        After your home is paid off, your surplus cashflow accelerates your investment loan repayments.
                    </p>
                </div>
            </div>
        </Card>
        
        {safeTotalDebtData?.length > 0 && (
            <Card title="Visualising the Snowball">
                <div style={{ width: '100%', height: 500 }}>
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <ComposedChart data={safeTotalDebtData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis 
                                dataKey="year" 
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                stroke="var(--text-color)" 
                                tick={{ fontSize: 10 }} 
                                tickFormatter={(val) => val.toFixed(0)}
                                interval={0} 
                                allowDuplicatedCategory={false}
                            />
                            <YAxis 
                                stroke="var(--text-color)" 
                                tickFormatter={formatChartCurrency} 
                                tick={{ fontSize: 12 }} 
                                domain={[0, yAxisMax]}
                            />
                            <RechartsTooltip content={<CustomAreaTooltip formatter={formatCurrency} />} />
                            <Legend iconType="square" wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <ReferenceLine x={primaryPayoffYear} stroke="var(--chart-color-crown)" strokeDasharray="3 3">
                                <Label 
                                    value="Primary Home Paid Off: Surplus redirected to Investments" 
                                    position="insideTopLeft" 
                                    angle={-90}
                                    offset={20}
                                    fill="var(--chart-color-crown)"
                                    style={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                            </ReferenceLine>
                            <Area type="monotone" dataKey="Bank" name="Bank Total Debt" stroke="var(--chart-color-bank)" fillOpacity={1} fill="var(--chart-color-bank)" strokeWidth={2} dot={false} />
                            {/* Use linear interpolation to allow sharp vertical transitions for the M-shape */}
                            <Area type="linear" dataKey="Crown Money Snowball" name="Crown Targeted Loan" stroke="var(--chart-color-crown)" fillOpacity={1} fill="var(--chart-color-crown)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Crown Money" name="Crown Total Debt" stroke="var(--chart-color-wealth)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        )}

        {annualPrincipalData.length > 0 && (
            <Card title="Annual Investment Principal Reduction Comparison">
                <p className="text-sm text-[var(--text-color-muted)] mb-4">
                    This chart shows how much <strong>Principal (Debt)</strong> is paid off each year across your entire portfolio. Notice the massive jump in the Crown scenario once the snowball effect kicks in (Annual Rent Growth + Redirected Surplus).
                </p>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <BarChart data={annualPrincipalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis 
                                dataKey="year" 
                                stroke="var(--text-color)" 
                                tick={{ fontSize: 10 }}
                                interval={0}
                            />
                            <YAxis 
                                stroke="var(--text-color)" 
                                tickFormatter={formatChartCurrency} 
                                tick={{ fontSize: 12 }} 
                            />
                            <RechartsTooltip 
                                cursor={{fill: 'transparent'}}
                                content={<CustomBarTooltip formatter={formatCurrency} />}
                            />
                            <Legend iconType="square" wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="Bank Principal" fill="var(--chart-color-bank)" name="Bank Principal Paid" />
                            <Bar dataKey="Crown Principal" fill="var(--chart-color-crown)" name="Crown Principal Paid" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        )}

        <Card title="Total Savings & Final Timeline">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 text-center bg-black/10 dark:bg-white/5 rounded-lg">
                    <h4 className="text-base text-[var(--text-color-muted)]">Total Interest Saved on Investments</h4>
                    <p className="text-4xl font-bold my-2 text-[var(--chart-color-crown)]">{formatCurrency(totalInvestmentInterestSaved)}</p>
                </div>
                 <div className="p-4 text-center bg-black/10 dark:bg-white/5 rounded-lg">
                    <h4 className="text-base text-[var(--text-color-muted)]">Completely Debt Free in:</h4>
                    <p className="text-4xl font-bold my-2 text-[var(--chart-color-crown)]">{formatYears(totalDebtFreeYears)} Years</p>
                </div>
            </div>
        </Card>
    </div>
  );
};

export default React.memo(Tab_InvestmentOODC);
