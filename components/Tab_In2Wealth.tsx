import React, { useEffect } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import { InfoIcon } from './common/IconComponents';
import Tooltip from './common/Tooltip';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, ReferenceDot, ReferenceArea } from 'recharts';

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
        const bankData = payload.find(p => p.dataKey === 'bank');
        const crownData = payload.find(p => p.dataKey === 'crown');
        const difference = (crownData?.value || 0) - (bankData?.value || 0);

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Age: ${label}`}</p>
                
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: crownData?.stroke }}></div>
                    <p className="text-[var(--tooltip-text-color)]">
                        {crownData?.name}: <span className="font-semibold">{formatter(crownData?.value || 0)}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: bankData?.stroke }}></div>
                    <p className="text-[var(--tooltip-text-color)]">
                        {bankData?.name}: <span className="font-semibold">{formatter(bankData?.value || 0)}</span>
                    </p>
                </div>

                {difference > 0 && (
                    <>
                        <hr className="my-1 border-[var(--border-color)] opacity-50" />
                        <p className="text-[var(--tooltip-text-color-muted)]">
                            {`Advantage: `}
                            <span className="font-semibold" style={{ color: 'var(--tooltip-text-color-positive)' }}>
                                {formatter(difference)}
                            </span>
                        </p>
                    </>
                )}
            </div>
        );
    }
    return null;
};

const CustomBarTooltip: React.FC<{ active?: boolean, payload?: any[], formatter: (value: number) => string }> = ({ active, payload, formatter }) => {
    if (active && payload && payload.length) {
        const bankData = payload.find(p => p.dataKey === 'Bank');
        const crownData = payload.find(p => p.dataKey === 'Crown Money');
        const difference = (crownData?.value || 0) - (bankData?.value || 0);

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                {crownData && (
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: crownData.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`${crownData.name}: ${formatter(crownData.value)}`}</p>
                    </div>
                )}
                {bankData && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: bankData.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`${bankData.name}: ${formatter(bankData.value)}`}</p>
                    </div>
                )}
                 {difference > 0 && (
                     <>
                        <hr className="my-1 border-[var(--border-color)] opacity-50" />
                        <p className="text-[var(--tooltip-text-color-muted)]">
                            {`Advantage: `}
                            <span className="font-semibold" style={{color: 'var(--tooltip-text-color-positive)'}}>
                                {formatter(difference)}
                            </span>
                        </p>
                    </>
                )}
            </div>
        );
    }
    // Fallback logic for safety
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


const Tab_In2Wealth: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { 
      bankLoanCalculation, 
      crownMoneyLoanCalculation, 
      retirementWealthProjection, 
      netWorthProjection,
      homeValueAtRetirement,
      bankDebtAtRetirement,
      bankEquityAtRetirement,
      bankCashAvailableAtRetirement,
      totalBankNetPositionAtRetirement,
      surplus,
  } = calculations;
  
  const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
  const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;
  
  const youngestPerson = appState.people.reduce((prev, curr) => (prev.age < curr.age ? prev : curr), appState.people[0] || { age: 0 });
  const minRetirementAge = Math.ceil(youngestPerson.age + crownMoneyLoanCalculation.termInYears);

  useEffect(() => {
    if (isCrownLoanValid && isFinite(minRetirementAge) && appState.idealRetirementAge < minRetirementAge) {
        setAppState(prev => ({ ...prev, idealRetirementAge: minRetirementAge }));
    }
  }, [minRetirementAge, appState.idealRetirementAge, setAppState, isCrownLoanValid]);


  if (!isBankLoanValid || !isCrownLoanValid) {
    return (
      <Card>
        <div className="text-center text-yellow-400 p-4 bg-yellow-900/50 rounded-lg">
          <p className="font-bold text-lg">Calculations Not Available</p>
          <p>Please ensure both the Bank and Crown Money scenarios can be calculated on the 'OODC' tab to view wealth projections.</p>
        </div>
      </Card>
    );
  }

  const handleStateChange = (field: keyof AppState, value: any) => {
    setAppState(prev => ({ ...prev, [field]: value }));
  };

  const monthlySavings = surplus;
  const monthlyInvestment = monthlySavings * (appState.investmentAmountPercentage / 100);
  const monthlyCashInHand = monthlySavings - monthlyInvestment;
  
  const bankDebtFreeAge = Math.ceil(youngestPerson.age + bankLoanCalculation.termInYears);

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const quickPercentages = [25, 50, 75, 100];
  
  const yearsSaved = bankLoanCalculation.termInYears - crownMoneyLoanCalculation.termInYears;
  const weeklySavings = (monthlySavings * 12) / 52;
  const annualSavings = monthlySavings * 12;
  const totalPotentialInvestment = annualSavings * yearsSaved;

  const totalNetPositionAtRetirement = retirementWealthProjection.wealth + retirementWealthProjection.cashInHand + retirementWealthProjection.homeEquity;
  
  const barChartData = [
      { 
        name: 'Net Worth', 
        'Bank': Math.max(0, totalBankNetPositionAtRetirement),
        'Crown Money': Math.max(0, totalNetPositionAtRetirement)
      },
  ];
  
  const sliderMin = isFinite(minRetirementAge) ? minRetirementAge : youngestPerson.age;
  const sliderMax = Math.max(sliderMin + 5, 85); 
  const sliderValue = Math.max(sliderMin, appState.idealRetirementAge); 
  
  // Graph Breakpoint Calculations
  const crownPayoffAge = minRetirementAge;
  const retirementAge = sliderValue;

  const getNetWorthAtAge = (age: number, scenario: 'crown' | 'bank') => {
      const dataPoint = netWorthProjection.find((p: any) => p.age === age);
      return dataPoint ? dataPoint[scenario] : 0;
  };
  
  const crownNetWorthAtCrownPayoff = getNetWorthAtAge(crownPayoffAge, 'crown');
  const crownNetWorthAtBankPayoff = getNetWorthAtAge(bankDebtFreeAge, 'crown');
  const crownNetWorthAtRetirement = getNetWorthAtAge(retirementAge, 'crown');

  return (
    <div className="animate-fade-in space-y-6">
      <Card title="Step 1: Plan Your Investment & Retirement">
         <div className="mb-8">
            <SliderInput 
                label={
                    <div className='flex items-center gap-2'>
                        <span>Ideal Retirement Age</span>
                        <Tooltip text="Set your target retirement age. The calculator will project your potential wealth at this age if you start investing after paying off your home loan with Crown Money.">
                            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                    </div>
                }
                value={sliderValue}
                onChange={val => handleStateChange('idealRetirementAge', val)}
                min={sliderMin} 
                max={sliderMax} 
                step={1}
            />
         </div>
         <div className="mb-6 p-4 border border-dashed border-[var(--border-color)] rounded-lg">
            <div className="flex items-center justify-center gap-1">
                <h4 className="font-semibold text-[var(--title-color)] text-center mb-3">Your Investment Power</h4>
                 <Tooltip text="This is your total monthly surplus (Income - Expenses) that becomes available for investing once your loan is paid off with the Crown Money strategy.">
                    <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)] -translate-y-1.5"/>
                </Tooltip>
            </div>
            <p className="text-center text-sm text-[var(--text-color-muted)] mb-4">
                By paying off your loan {yearsSaved.toFixed(1)} years earlier, your entire monthly surplus becomes free cash. This is the amount you can now invest.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                    <p className="text-xs text-[var(--text-color-muted)]">Weekly Savings</p>
                    <p className="font-bold text-lg text-[var(--text-color)]">{formatCurrency(weeklySavings)}</p>
                </div>
                <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                    <p className="text-xs text-[var(--text-color-muted)]">Monthly Savings</p>
                    <p className="font-bold text-lg text-[var(--text-color)]">{formatCurrency(monthlySavings)}</p>
                </div>
                <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                    <p className="text-xs text-[var(--text-color-muted)]">Annual Savings</p>
                    <p className="font-bold text-lg text-[var(--text-color)]">{formatCurrency(annualSavings)}</p>
                </div>
                <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                    <p className="text-xs text-[var(--text-color-muted)]">Total Over {yearsSaved.toFixed(1)} Yrs</p>
                    <p className="font-bold text-lg text-[var(--text-color)]">{formatCurrency(totalPotentialInvestment)}</p>
                </div>
            </div>
             <p className="text-xs text-center text-[var(--text-color-muted)] mt-3 italic print:hidden">*Your 'Investment Power' is your monthly surplus (Total Income - Living Expenses), which is available for investing once the loan is paid off.</p>
        </div>
        <div className="space-y-6">
            <div>
                <SliderInput 
                label="Percentage of Savings to Invest"
                value={appState.investmentAmountPercentage}
                onChange={val => handleStateChange('investmentAmountPercentage', val)}
                min={0} max={100} step={1} unit="%"
                />
                <p className="text-center text-xs text-[var(--text-color-muted)] mt-2">
                    Select what percentage of your freed-up monthly surplus ({formatCurrency(monthlySavings)}/month) you would like to invest.
                </p>
                <div className="flex gap-2 justify-center mt-2">
                    {quickPercentages.map(p => (
                        <button 
                            key={p} 
                            onClick={() => handleStateChange('investmentAmountPercentage', p)}
                            className={`px-3 py-1 text-sm rounded-full transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--card-bg-color)] focus:ring-[var(--input-border-focus-color)] ${appState.investmentAmountPercentage === p ? 'bg-[var(--title-color)] text-white' : 'bg-[var(--input-bg-color)] hover:bg-[var(--input-bg-color)]/80'}`}
                        >
                            {p}%
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center mt-4">
                <div className="p-3 bg-[var(--color-positive-bg)] rounded-lg">
                    <h4 className="text-sm text-[var(--color-positive-text)]">Monthly Investment</h4>
                    <p className="text-xl font-bold text-[var(--color-positive-text)]">{formatCurrency(monthlyInvestment)}</p>
                </div>
                 <div className="p-3 bg-[var(--color-surplus-bg)] rounded-lg">
                    <h4 className="text-sm text-[var(--color-surplus-text)]">Monthly Cash In Hand</h4>
                    <p className="text-xl font-bold text-[var(--color-surplus-text)]">{formatCurrency(monthlyCashInHand)}</p>
                </div>
            </div>
        </div>
        <div className="mt-8 pt-6 border-t border-dashed border-[var(--border-color)] space-y-6">
            <SliderInput 
                label={
                    <div className='flex items-center gap-2'>
                        <span>Average Annual Investment Growth Rate</span>
                        <Tooltip text="The estimated average annual return on your investments. A higher rate leads to faster wealth accumulation.">
                            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                    </div>
                }
                value={appState.investmentGrowthRate}
                onChange={val => handleStateChange('investmentGrowthRate', val)}
                min={0} max={20} step={0.25} unit="%"
            />
             <p className="text-center text-xs text-[var(--text-color-muted)] -mt-2 p-2 bg-black/10 dark:bg-white/5 rounded-md">
                Investing in a diversified portfolio of assets like property, the stock market, or index funds has historically produced average returns of 7% or more over the long term.
                <br/>
                <strong className="font-semibold">Disclaimer:</strong> This is for illustrative purposes only and does not constitute financial advice. Past performance is not indicative of future results.
            </p>
            <SliderInput 
                label={
                    <div className='flex items-center gap-2'>
                        <span>Annual Property Growth Rate</span>
                        <Tooltip text="The estimated annual increase in value for your primary residence. This is used for net worth projections.">
                            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                    </div>
                }
                value={appState.propertyGrowthRate}
                onChange={val => handleStateChange('propertyGrowthRate', val)}
                min={0} max={15} step={0.25} unit="%"
            />
        </div>
      </Card>

      <Card title="Step 2: Your Wealth Projections">
         <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center space-y-4 p-4 rounded-lg bg-black/10 dark:bg-white/10">
                <h4 className="text-lg font-semibold text-[var(--text-color)]">Your Bank's Path</h4>
                <p className="text-sm text-[var(--text-color-muted)] -mt-3">At Retirement Age {appState.idealRetirementAge}</p>
                 <div className="border-t border-[var(--border-color)] pt-2">
                    <p className="text-sm text-[var(--text-color-muted)] flex items-center justify-center gap-1">
                        <span>Projected Home Equity</span>
                        <Tooltip text="CALCULATION: (Home Value at Retirement) - (Remaining Loan Balance). This is the portion of your home you own.">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </p>
                    <p className="text-2xl font-bold" style={{color: 'var(--chart-color-bank)'}}>{formatCurrency(bankEquityAtRetirement)}</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--text-color-muted)] flex items-center justify-center gap-1">
                        <span>Wealth from Investments</span>
                        <Tooltip text="In the bank's scenario, you are still paying your mortgage at this point, so there is no surplus cash from freed-up repayments to invest.">
                             <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </p>
                    <p className="text-2xl font-bold" style={{color: 'var(--chart-color-bank)'}}>{formatCurrency(0)}</p>
                </div>
                 <div>
                    <p className="text-sm text-[var(--text-color-muted)] uppercase">CASH SPENT ON LIFESTYLE since being debt free</p>
                    <p className="text-2xl font-bold text-[var(--text-color-muted)]">{formatCurrency(bankCashAvailableAtRetirement)}</p>
                </div>
                <hr className="border-[var(--border-color)] border-dashed"/>
                 <div>
                    <p className="text-md font-semibold text-[var(--text-color)] flex items-center justify-center gap-1">
                        <span>Total Net Position</span>
                         <Tooltip text="CALCULATION: Home Equity + Investment Wealth + Cash. This is your total projected financial position at retirement with the bank's plan.">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </p>
                    <p className="text-4xl font-extrabold" style={{color: 'var(--chart-color-bank)'}}>{formatCurrency(totalBankNetPositionAtRetirement)}</p>
                </div>
            </div>
             <div className="text-center space-y-4 p-4 rounded-lg bg-black/10 dark:bg-white/10">
                <h4 className="text-lg font-semibold text-[var(--text-color)]">The Crown Money Path 🏆</h4>
                <p className="text-sm text-[var(--text-color-muted)] -mt-3">At Retirement Age {appState.idealRetirementAge}</p>
                 <div className="border-t border-[var(--border-color)] pt-2">
                    <p className="text-sm text-[var(--text-color-muted)] flex items-center justify-center gap-1">
                        <span>Projected Home Equity</span>
                        <Tooltip text="CALCULATION: Initial Property Value compounded by the Property Growth Rate. As the loan is paid off, your equity is the home's full value.">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </p>
                    <p className="text-2xl font-bold" style={{color: 'var(--chart-color-wealth)'}}>{formatCurrency(retirementWealthProjection.homeEquity)}</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--text-color-muted)] flex items-center justify-center gap-1">
                        <span>Wealth from Investments</span>
                        <Tooltip text="This is the projected value of your investment portfolio, calculated by compounding your 'Monthly Investment' amount at the 'Average Annual Investment Growth Rate' from the time your loan is paid off until retirement.">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </p>
                    <p className="text-2xl font-bold" style={{color: 'var(--chart-color-wealth)'}}>{formatCurrency(retirementWealthProjection.wealth)}</p>
                </div>
                <div>
                    <p className="text-sm text-[var(--text-color-muted)] uppercase">CASH SPENT ON LIFESTYLE since being debt free</p>
                    <p className="text-2xl font-bold text-[var(--text-color-muted)]">{formatCurrency(retirementWealthProjection.cashInHand)}</p>
                </div>
                <hr className="border-[var(--border-color)] border-dashed"/>
                <div>
                    <p className="text-md font-semibold text-[var(--text-color)] flex items-center justify-center gap-1">
                        <span>Total Net Position</span>
                         <Tooltip text="CALCULATION: Home Equity + Investment Wealth + Cash. This is your total projected financial position with Crown Money at retirement.">
                            <InfoIcon className="h-4 w-4" />
                        </Tooltip>
                    </p>
                    <p className="text-4xl font-extrabold" style={{color: 'var(--chart-color-wealth)'}}>{formatCurrency(totalNetPositionAtRetirement)}</p>
                </div>
            </div>
        </div>
        <p className="text-xs text-center text-[var(--text-color-muted)] -mt-4 italic print:hidden">*Total Net Position = Projected Home Equity + Wealth from Investments + Cash. Projections assume constant growth rates and investment amounts.</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center pt-6 border-t border-dashed border-[var(--border-color)]">
            <div className="lg:col-span-3">
                <h4 className="text-center font-semibold text-lg text-[var(--text-color)] mb-4">Net Worth Growth Comparison</h4>
                <div style={{ width: '100%', height: 400 }}>
                   <ResponsiveContainer>
                        <AreaChart data={netWorthProjection} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="age" name="Age" stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Age', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }}/>
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                            <RechartsTooltip content={<CustomAreaTooltip formatter={formatCurrency} />} />
                            <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <defs>
                                <linearGradient id="colorBankNetWorth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-color-bank)" stopOpacity={0.7}/>
                                    <stop offset="95%" stopColor="var(--chart-color-bank)" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCrownNetWorth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-color-crown)" stopOpacity={0.7}/>
                                    <stop offset="95%" stopColor="var(--chart-color-crown)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            {isCrownLoanValid && isBankLoanValid && bankDebtFreeAge > crownPayoffAge && (
                                <ReferenceArea
                                    x1={crownPayoffAge}
                                    x2={bankDebtFreeAge}
                                    fill="var(--chart-color-wealth)"
                                    fillOpacity={0.1}
                                    stroke="var(--chart-color-wealth)"
                                    strokeOpacity={0.3}
                                    ifOverflow="extendDomain"
                                    label={{ value: "Investment Headstart", angle: 90, position: "insideTopLeft", fill: "var(--chart-color-wealth)", offset: 20 }}
                                />
                            )}
                            <Area type="monotone" dataKey="bank" name="Bank Net Worth" stroke="var(--chart-color-bank)" fillOpacity={1} fill="url(#colorBankNetWorth)" strokeWidth={2} dot={false}/>
                            <Area type="monotone" dataKey="crown" name="Crown Money Net Worth 🏆" stroke="var(--chart-color-crown)" fillOpacity={1} fill="url(#colorCrownNetWorth)" strokeWidth={2} dot={false}/>

                            {/* Breakpoint Dots */}
                            {isFinite(crownPayoffAge) && crownNetWorthAtCrownPayoff > 0 && (
                                <ReferenceDot
                                    x={crownPayoffAge}
                                    y={crownNetWorthAtCrownPayoff}
                                    r={6}
                                    fill="var(--chart-color-crown)"
                                    stroke="var(--bg-color)"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                    label={{ value: "Home Paid Off 🏆", position: 'top', fill: 'var(--chart-color-crown)', fontSize: 12, dy: -10, fontWeight: 'bold' }}
                                />
                            )}
                            {isFinite(bankDebtFreeAge) && crownNetWorthAtBankPayoff > 0 && bankDebtFreeAge > crownPayoffAge && (
                                <ReferenceDot
                                    x={bankDebtFreeAge}
                                    y={crownNetWorthAtBankPayoff}
                                    r={6}
                                    fill="var(--chart-color-crown)"
                                    stroke="var(--bg-color)"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                    label={{ value: `vs. Bank Payoff (${formatCurrency(crownNetWorthAtBankPayoff)})`, position: 'top', fill: 'var(--text-color)', fontSize: 12, dy: 15 }}
                                />
                            )}
                            {isFinite(retirementAge) && crownNetWorthAtRetirement > 0 && retirementAge > crownPayoffAge && (
                                <ReferenceDot
                                    x={retirementAge}
                                    y={crownNetWorthAtRetirement}
                                    r={8}
                                    fill="var(--chart-color-wealth)"
                                    stroke="var(--bg-color)"
                                    strokeWidth={2}
                                    ifOverflow="extendDomain"
                                    label={{
                                        value: `Retirement (${formatCurrency(crownNetWorthAtRetirement)})`,
                                        position: 'top',
                                        fill: 'var(--chart-color-wealth)',
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        dy: 20,
                                        dx: -15,
                                        textAnchor: 'end'
                                    }}
                                />
                            )}
                        </AreaChart>
                   </ResponsiveContainer>
                </div>
            </div>
            <div className="lg:col-span-2">
                <h4 className="text-center font-semibold text-lg text-[var(--text-color)] mb-4">Net Worth at Retirement Age {retirementAge}</h4>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={barChartData} layout="vertical" margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)"/>
                            <XAxis type="number" stroke="var(--text-color)" tickFormatter={formatChartCurrency} />
                            <YAxis type="category" dataKey="name" hide />
                            <RechartsTooltip content={<CustomBarTooltip formatter={formatCurrency} />} cursor={{fill: 'var(--card-bg-color)'}}/>
                            <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <Bar dataKey="Bank" name="Bank Net Worth" fill="var(--chart-color-bank)" barSize={40} />
                            <Bar dataKey="Crown Money" name="Crown Money Net Worth 🏆" fill="var(--chart-color-crown)" barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

      </Card>
    </div>
  );
};

export default React.memo(Tab_In2Wealth);