
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import { InfoIcon, UsersIcon } from './common/IconComponents';
import Tooltip from './common/Tooltip';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, Cell } from 'recharts';

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

const CustomAreaTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Age: ${label}`}</p>
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: pld.stroke || pld.fill }}></div>
                        <p className="text-[var(--tooltip-text-color)]">
                            {pld.name}: <span className="font-semibold">{formatter(pld.value || 0)}</span>
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1e1e1e] border border-gray-700 p-4 rounded-lg shadow-xl z-50 text-white">
                <p className="font-bold text-lg mb-3 border-b border-gray-600 pb-2">{payload[0].payload.name}</p>
                <div className="space-y-2">
                    <p className="text-gray-300 text-sm">Net Worth :</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(payload[0].value)}</p>
                </div>
            </div>
        );
    }
    return null;
};

const Tab_In2Wealth: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { 
      bankLoanCalculation, 
      crownMoneyLoanCalculation, 
      netWorthProjection,
      surplus,
      wealthCalcs,
      investmentLoanCalculations
  } = calculations;
  
  const { people, idealRetirementAge, investmentAmountPercentage, investmentGrowthRate, propertyGrowthRate, investmentProperties } = appState;
  const [selectedPersonId, setSelectedPersonId] = useState<number>(people[0]?.id || 1);

  const selectedPerson = people.find(p => p.id === selectedPersonId) || people[0];
  const youngestPerson = people.reduce((min, p) => p.age < min.age ? p : min, people[0]);
  
  // Calculate timeline relative to the selected person
  const currentAge = selectedPerson.age;
  const yearsToRetirement = Math.max(0, idealRetirementAge - currentAge);
  const monthsToRetirement = Math.floor(yearsToRetirement * 12);
  
  // Need to align "yearsToRetirement" with the global timeline used by wealthCalcs (which is based on youngest person)
  const ageDiff = selectedPerson.age - youngestPerson.age; 
  const equivalentYoungestAgeAtRetirement = idealRetirementAge - ageDiff;

  const handleStateChange = (field: keyof AppState, value: any) => {
    setAppState(prev => ({ ...prev, [field]: value }));
  };

  // --- CROWN PATH CALCULATIONS ---
  const crownProjections = wealthCalcs(equivalentYoungestAgeAtRetirement);
  
  const crownHomeEquity = crownProjections.homeEquity; 
  const crownInvPropsEquity = crownProjections.investmentEquity;
  const crownSharesWealth = crownProjections.wealth;
  const crownCash = crownProjections.cashInHand;
  
  const crownTotalNet = crownHomeEquity + crownInvPropsEquity + crownSharesWealth + crownCash;

  // --- BANK PATH CALCULATIONS ---
  
  // 1. Bank Primary Home Equity
  const bankHomeValue = appState.loan.propertyValue * Math.pow(1 + (propertyGrowthRate / 100), yearsToRetirement);
  const bankPrimaryDebt = bankLoanCalculation.amortizationSchedule[monthsToRetirement]?.remainingBalance 
      ?? (monthsToRetirement > bankLoanCalculation.termInYears * 12 ? 0 : appState.loan.amount); 
  const bankHomeEquity = Math.max(0, bankHomeValue - bankPrimaryDebt);

  // 2. Bank Investment Properties Equity
  let bankInvPropsEquity = 0;
  if (investmentProperties && investmentProperties.length > 0) {
      investmentProperties.forEach(prop => {
            const fv = prop.propertyValue * Math.pow(1 + (propertyGrowthRate / 100), yearsToRetirement);
            const bankSchedule = investmentLoanCalculations.investmentPayoffSchedule.find((p: any) => p.propertyId === prop.id)?.bank.amortizationSchedule;
            const debt = bankSchedule?.[monthsToRetirement]?.remainingBalance ?? (monthsToRetirement === 0 ? prop.loanAmount : 0);
            bankInvPropsEquity += Math.max(0, fv - debt);
      });
  }

  // 3. Bank Cash / Wealth
  let bankCash = 0;
  if (monthsToRetirement > bankLoanCalculation.termInYears * 12) {
      const monthsDebtFree = monthsToRetirement - (bankLoanCalculation.termInYears * 12);
      const monthlyRepayment = calculations.getMonthlyAmount(appState.loan.repayment, appState.loan.frequency);
      bankCash = monthsDebtFree * monthlyRepayment; 
  }

  const bankSharesWealth = 0; // Typically 0 in Bank scenario
  const bankTotalNet = bankHomeEquity + bankInvPropsEquity + bankSharesWealth + bankCash;

  // Investment Power Calculations
  const yearsSaved = Math.max(0, bankLoanCalculation.termInYears - crownMoneyLoanCalculation.termInYears);
  const weeklySavings = surplus * 12 / 52;
  const monthlySavings = surplus;
  const annualSavings = surplus * 12;
  const totalOverYearsSaved = annualSavings * yearsSaved;

  const monthlyInvestment = surplus * (investmentAmountPercentage / 100);
  const monthlyCashInHand = surplus - monthlyInvestment;

  // Chart Data Preparation
  const adjustedNetWorthProjection = useMemo(() => {
      if (!netWorthProjection) return [];
      return (netWorthProjection || []).map((d: any) => ({
          ...d,
          age: d.age + ageDiff, // Shift age to match selected person
          bank: isFinite(d.bank) ? d.bank : 0,
          crown: isFinite(d.crown) ? d.crown : 0,
      })).filter((d: any) => d.age <= 95); 
  }, [netWorthProjection, ageDiff]);

  const barChartData = [
      { name: 'Bank', value: bankTotalNet },
      { name: 'Crown Money', value: crownTotalNet }
  ];

  const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
  const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;

  if (!isBankLoanValid || !isCrownLoanValid) {
    return (
      <Card>
        <div className="text-center text-yellow-400 p-8 bg-yellow-900/50 rounded-lg">
          <p className="font-bold text-lg">Calculations Not Available</p>
          <p>Please ensure both the Bank and Crown Money scenarios can be calculated on the 'OODC' tab to view wealth projections.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      
      {/* Step 1: Planning */}
      <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-[var(--title-color)]">Step 1: Plan Your Investment & Retirement</h2>
          </div>
          
          <div className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-[var(--border-color)]">
               <SliderInput 
                    label="Ideal Retirement Age"
                    value={idealRetirementAge}
                    onChange={val => handleStateChange('idealRetirementAge', val)}
                    min={selectedPerson.age + 1} 
                    max={85} 
                    step={1}
                />
                 <Tooltip text="The age at which you plan to retire. This is used to calculate the duration of your investment growth after your loan is paid off." className="inline-block ml-1">
                     <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]" />
                 </Tooltip>
          </div>

          <Card>
              <div className="text-center mb-6">
                  <h3 className="text-md font-bold text-[var(--title-color)] mb-2">Your Investment Power <InfoIcon className="inline h-4 w-4 mb-1"/></h3>
                  <p className="text-sm text-[var(--text-color)]">
                      By paying off your loan <span className="font-bold">{yearsSaved.toFixed(1)} years earlier</span>, your entire monthly surplus becomes free cash. This is the amount you can now invest.
                  </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-[var(--input-bg-color)] rounded-lg text-center">
                      <p className="text-xs text-[var(--text-color-muted)] font-semibold mb-1">Weekly Savings</p>
                      <p className="text-lg font-bold text-[var(--text-color)]">{formatCurrency(weeklySavings)}</p>
                  </div>
                   <div className="p-3 bg-[var(--input-bg-color)] rounded-lg text-center">
                      <p className="text-xs text-[var(--text-color-muted)] font-semibold mb-1">Monthly Savings</p>
                      <p className="text-lg font-bold text-[var(--text-color)]">{formatCurrency(monthlySavings)}</p>
                  </div>
                   <div className="p-3 bg-[var(--input-bg-color)] rounded-lg text-center">
                      <p className="text-xs text-[var(--text-color-muted)] font-semibold mb-1">Annual Savings</p>
                      <p className="text-lg font-bold text-[var(--text-color)]">{formatCurrency(annualSavings)}</p>
                  </div>
                   <div className="p-3 bg-[var(--input-bg-color)] rounded-lg text-center">
                      <p className="text-xs text-[var(--text-color-muted)] font-semibold mb-1">Total Over {yearsSaved.toFixed(1)} Yrs</p>
                      <p className="text-lg font-bold text-[var(--text-color)]">{formatCurrency(totalOverYearsSaved)}</p>
                  </div>
              </div>
              <p className="text-xs text-[var(--text-color-muted)] text-center italic">
                  *Your 'Investment Power' is your monthly surplus (Total Income - Total Monthly Expenses), which is available for investing once the loan is paid off.
              </p>
          </Card>

          <Card>
               <h4 className="text-sm font-semibold text-[var(--text-color)] mb-4">Percentage of Savings to Invest</h4>
               <div className="flex items-center gap-4 mb-6">
                   <div className="flex-grow">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={investmentAmountPercentage}
                          onChange={(e) => handleStateChange('investmentAmountPercentage', parseInt(e.target.value))}
                          className="w-full h-2 bg-[var(--slider-track-color)] rounded-lg appearance-none cursor-pointer"
                          style={{ accentColor: 'var(--title-color)' }}
                        />
                   </div>
                   <div className="flex items-center gap-1 bg-[var(--input-bg-color)] rounded-md border border-[var(--border-color)] overflow-hidden">
                       {[25, 50, 75, 100].map(pct => (
                           <button
                                key={pct}
                                onClick={() => handleStateChange('investmentAmountPercentage', pct)}
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${investmentAmountPercentage === pct ? 'bg-[var(--title-color)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                           >
                               {pct}%
                           </button>
                       ))}
                   </div>
                   <div className="w-16 text-right font-bold text-[var(--text-color)]">{investmentAmountPercentage}%</div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                   <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center border border-green-100 dark:border-green-800">
                       <p className="text-sm text-green-800 dark:text-green-300 font-semibold mb-1">Monthly Investment</p>
                       <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(monthlyInvestment)}</p>
                   </div>
                    <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-center border border-indigo-100 dark:border-indigo-800">
                       <p className="text-sm text-indigo-800 dark:text-indigo-300 font-semibold mb-1">Monthly Cash In Hand</p>
                       <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(monthlyCashInHand)}</p>
                   </div>
               </div>

               <div className="space-y-6">
                    <SliderInput 
                        label="Average Annual Investment Growth Rate"
                        value={investmentGrowthRate}
                        onChange={val => handleStateChange('investmentGrowthRate', val)}
                        min={0} 
                        max={15} 
                        step={0.5}
                        unit="%"
                    />
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded text-xs text-[var(--text-color-muted)] text-center">
                        Investing in a diversified portfolio of assets like property, the stock market, or index funds has historically produced average returns of 7% or more over the long term. 
                        <br/><strong>Disclaimer:</strong> This is for illustrative purposes only and does not include financial advice. Past performance is not indicative of future results.
                    </div>
               </div>
          </Card>
      </div>

      {/* Step 2: Wealth Projections */}
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--title-color)]">Step 2: Your Wealth Projections</h2>
            <div className="flex gap-2 text-xs font-semibold p-1 bg-[var(--input-bg-color)] rounded-lg border border-[var(--border-color)]">
                {people.map(p => (
                    <button 
                        key={p.id}
                        onClick={() => setSelectedPersonId(p.id)}
                        className={`px-3 py-1.5 rounded-md transition-colors ${selectedPersonId === p.id ? 'bg-[var(--title-color)] text-white' : 'text-[var(--text-color-muted)] hover:bg-black/5'}`}
                    >
                        {p.name}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="w-full p-4 bg-white dark:bg-white/5 rounded-xl border border-[var(--border-color)]">
             <SliderInput 
                label="Annual Property Growth Rate (Adjust for Comparison)"
                value={propertyGrowthRate}
                onChange={val => handleStateChange('propertyGrowthRate', val)}
                min={0} 
                max={15} 
                step={0.5}
                unit="%"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Path */}
              <div className="bg-[#F3F4F6] dark:bg-white/5 p-6 rounded-2xl border border-transparent">
                  <h3 className="text-center font-bold text-[var(--text-color)] text-xl mb-1">Your Bank's Path</h3>
                  <p className="text-center text-xs text-[var(--text-color-muted)] mb-6 uppercase tracking-wider">At Retirement Age {idealRetirementAge}</p>
                  
                  <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-color-muted)]">Projected Home Equity <InfoIcon className="inline h-3 w-3"/></span>
                          <span className="font-bold text-[var(--text-color)] text-lg">{formatCurrency(bankHomeEquity)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-color-muted)]">Investment Properties Equity <InfoIcon className="inline h-3 w-3"/></span>
                          <span className="font-bold text-[var(--text-color)] text-lg">{formatCurrency(bankInvPropsEquity)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                          <div className='flex flex-col'>
                            <span className="text-[var(--text-color-muted)]">Wealth from Investments <InfoIcon className="inline h-3 w-3"/></span>
                            <span className="text-[10px] text-[var(--text-color-muted)] italic">(Shares/Cash)</span>
                          </div>
                          <span className="font-bold text-[var(--text-color)] text-lg">{formatCurrency(bankSharesWealth)}</span>
                      </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-color-muted)] uppercase text-xs">Cash Spent on Lifestyle Since Being Debt Free</span>
                          <span className="font-bold text-[var(--text-color)] text-lg">{formatCurrency(bankCash)}</span>
                      </div>
                      
                      <div className="pt-4 mt-4 border-t border-gray-300 dark:border-gray-600">
                           <div className="flex justify-between items-center">
                              <span className="font-bold text-[var(--text-color)] text-lg">Total Net Position <InfoIcon className="inline h-4 w-4"/></span>
                              <span className="font-extrabold text-[#9CA3AF] text-3xl">{formatCurrency(bankTotalNet)}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Crown Path */}
              <div className="bg-[#EEF2FF] dark:bg-[#EEF2FF]/10 p-6 rounded-2xl border border-[var(--title-color)]/20">
                  <h3 className="text-center font-bold text-[var(--text-color)] text-xl mb-1">The Crown Money Path 🏆</h3>
                  <p className="text-center text-xs text-[var(--text-color-muted)] mb-6 uppercase tracking-wider">At Retirement Age {idealRetirementAge}</p>
                  
                  <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-color-muted)]">Projected Home Equity <InfoIcon className="inline h-3 w-3"/></span>
                          <span className="font-bold text-green-600 dark:text-green-400 text-lg">{formatCurrency(crownHomeEquity)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-color-muted)]">Investment Properties Equity <InfoIcon className="inline h-3 w-3"/></span>
                          <span className="font-bold text-green-600 dark:text-green-400 text-lg">{formatCurrency(crownInvPropsEquity)}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                          <div className='flex flex-col'>
                            <span className="text-[var(--text-color-muted)]">Wealth from Investments <InfoIcon className="inline h-3 w-3"/></span>
                            <span className="text-[10px] text-[var(--text-color-muted)] italic">(Shares/Cash)</span>
                          </div>
                          <span className="font-bold text-green-600 dark:text-green-400 text-lg">{formatCurrency(crownSharesWealth)}</span>
                      </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-color-muted)] uppercase text-xs">Cash Spent on Lifestyle Since Being Debt Free</span>
                          <span className="font-bold text-[var(--text-color)] text-lg">{formatCurrency(crownCash)}</span>
                      </div>
                      
                      <div className="pt-4 mt-4 border-t border-[var(--title-color)]/20">
                           <div className="flex justify-between items-center">
                              <span className="font-bold text-[var(--text-color)] text-lg">Total Net Position <InfoIcon className="inline h-4 w-4"/></span>
                              <span className="font-extrabold text-[var(--title-color)] text-3xl">{formatCurrency(crownTotalNet)}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <p className="text-center text-xs text-[var(--text-color-muted)] italic">
              *Total Net Position = Projected Home Equity + Investment Properties Equity + Wealth from Shares + Cash. Projections assume constant growth rates.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Area Chart */}
              <div>
                  <h4 className="text-center font-semibold mb-4">Net Worth Growth Comparison</h4>
                  <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={adjustedNetWorthProjection} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis 
                                    dataKey="age" 
                                    name="Age" 
                                    stroke="var(--text-color)" 
                                    tick={{ fontSize: 12 }} 
                                    label={{ value: `Age (${selectedPerson.name})`, position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }}
                                />
                                <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                                <RechartsTooltip content={<CustomAreaTooltip formatter={(val) => formatChartCurrency(val)} />} />
                                <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" iconType='plainline' />
                                <Area type="monotone" dataKey="bank" stroke="var(--chart-color-bank)" fill="var(--chart-color-bank)" fillOpacity={0.1} strokeWidth={2} name="Bank" />
                                <Area type="monotone" dataKey="crown" stroke="var(--chart-color-crown)" fill="var(--chart-color-crown)" fillOpacity={0.3} strokeWidth={2} name="Crown Money" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                     <p className="text-xs text-[var(--text-color-muted)] italic mt-2 text-center">
                        *The shaded area represents the period where you are investing with Crown Money while still paying off your loan with the Bank.
                    </p>
              </div>

              {/* Bar Chart */}
              <div>
                   <h4 className="text-center font-semibold mb-4">Net Worth at Retirement</h4>
                   <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barSize={60}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis dataKey="name" stroke="var(--text-color)" tick={{ fontSize: 12 }} />
                                <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                                <RechartsTooltip 
                                    cursor={{fill: 'transparent'}}
                                    content={<CustomBarTooltip />}
                                />
                                <Bar dataKey="value" name="Net Worth">
                                    <Cell fill="var(--chart-color-bank)" />
                                    <Cell fill="var(--chart-color-crown)" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default React.memo(Tab_In2Wealth);
