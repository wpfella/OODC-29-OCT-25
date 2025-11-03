import React from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Bar, Line } from 'recharts';
import Tooltip from './common/Tooltip';
import { InfoIcon } from './common/IconComponents';
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

const CustomTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string, formatter: (value: number) => string }> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${label}`}</p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: pld.stroke || pld.fill }}></div>
                        <p className="font-semibold" style={{ color: 'var(--tooltip-text-color)' }}>{`${pld.name}: ${formatter(pld.value)}`}</p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};


const Tab_DebtRecycling: React.FC<Props> = ({ appState, setAppState, calculations }) => {
    const { crownMoneyLoanCalculation, debtRecyclingCalculation } = calculations;

    if (crownMoneyLoanCalculation.termInYears === Infinity) {
        return (
            <Card>
                <div className="text-center text-yellow-400 p-4 bg-yellow-900/50 rounded-lg">
                    <p className="font-bold text-lg">Cannot Calculate Scenarios</p>
                    <p>Your primary home loan must be payable under the standard Crown Money strategy first. Check your budget on the 'Income & Expenses' tab.</p>
                </div>
            </Card>
        );
    }

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    const handleStateChange = (field: keyof AppState, value: any) => {
        setAppState(prev => ({ ...prev, [field]: value }));
    };

    const debtCompositionData = React.useMemo(() => {
        const homeLoanSchedule = debtRecyclingCalculation.amortizationSchedule || [];
        const invLoanSchedule = debtRecyclingCalculation.investmentLoanSchedule || [];
        const maxMonths = Math.max(homeLoanSchedule.length, invLoanSchedule.length);
        if (maxMonths === 0) return [];

        const data = [];
        for (let i = 0; i < maxMonths; i++) {
            data.push({
                year: (i + 1) / 12,
                'Home Loan': homeLoanSchedule[i]?.remainingBalance || 0,
                'Investment Loan': invLoanSchedule[i]?.balance || 0,
            });
        }
        return data;
    }, [debtRecyclingCalculation]);

    const netWorthData = React.useMemo(() => {
        const { bankLoanCalculation, crownMoneyLoanCalculation, debtRecyclingCalculation, people } = calculations;
        const { loan } = appState;
        const startAge = Math.min(...people.map((p: any) => p.age));
        const initialHomeValue = loan.amount / 0.8; // Assume 80% LVR

        const homeEquityOverTime = (schedule: any[], years: number) => {
            const homeValue = initialHomeValue * Math.pow(1 + appState.propertyGrowthRate / 100, years);
            const monthIndex = Math.floor(years * 12);
            const debt = schedule[monthIndex]?.remainingBalance ?? 0;
            return homeValue - debt;
        };

        const maxYears = Math.ceil(bankLoanCalculation.termInYears);
        const data = [];
        for (let i = 0; i <= maxYears; i++) {
            const currentAge = startAge + i;
            
            // Bank Net Worth
            const bankNetWorth = homeEquityOverTime(bankLoanCalculation.amortizationSchedule, i);

            // Crown Net Worth
            const crownNetWorth = homeEquityOverTime(crownMoneyLoanCalculation.amortizationSchedule, i);

            // Debt Recycling Net Worth
            const homeEquityRecycling = homeEquityOverTime(debtRecyclingCalculation.amortizationSchedule, i);
            const monthIndex = Math.floor(i * 12);
            const portfolioValue = debtRecyclingCalculation.investmentPortfolioSchedule?.[monthIndex]?.value ?? 0;
            const investmentLoan = debtRecyclingCalculation.investmentLoanSchedule?.[monthIndex]?.balance ?? 0;
            const recyclingNetWorth = homeEquityRecycling + portfolioValue - investmentLoan;

            data.push({
                age: currentAge,
                'Bank': bankNetWorth,
                'Crown Money': crownNetWorth,
                'Crown + Recycling': recyclingNetWorth,
            });
        }
        return data;

    }, [calculations, appState.propertyGrowthRate, appState.loan]);


    const accordionItems = [
        {
            title: "1. Debt Recycling Setup & Assumptions",
            content: (
                <div className="space-y-6">
                    <p className="text-sm text-[var(--text-color-muted)]">
                        Debt recycling is a strategy where you use the equity in your home to invest. As you pay down your home loan principal, you can borrow back that same amount as a separate, tax-deductible investment loan. The goal is to generate investment returns that are higher than the cost of the investment loan interest. The net profit is then used to pay off your non-deductible home loan even faster.
                    </p>
                    <SliderInput
                        label={
                            <div className="flex items-center gap-1">
                                <span>Percentage of Principal to Recycle</span>
                                <Tooltip text="Controls what percentage of the paid-down home loan principal is re-borrowed and invested. 100% uses the full amount available, while a lower percentage represents a more conservative approach.">
                                    <InfoIcon className="h-4 w-4" />
                                </Tooltip>
                            </div>
                        }
                        value={appState.debtRecyclingPercentage}
                        onChange={val => handleStateChange('debtRecyclingPercentage', val)}
                        min={0} max={100} step={1} unit="%"
                    />
                    <SliderInput
                        label={
                            <div className="flex items-center gap-1">
                                <span>Assumed Annual Investment Return</span>
                                <Tooltip text="The average annual return you expect from the investment portfolio. Historically, diversified portfolios have returned 7-8% p.a. over the long term.">
                                    <InfoIcon className="h-4 w-4" />
                                </Tooltip>
                            </div>
                        }
                        value={appState.debtRecyclingInvestmentRate}
                        onChange={val => handleStateChange('debtRecyclingInvestmentRate', val)}
                        min={1} max={15} step={0.25} unit="%"
                    />
                    <SliderInput
                        label="Investment Loan Interest Rate"
                        value={appState.debtRecyclingLoanInterestRate}
                        onChange={val => handleStateChange('debtRecyclingLoanInterestRate', val)}
                        min={1} max={15} step={0.05} unit="%"
                    />
                    <SliderInput
                        label={
                            <div className="flex items-center gap-1">
                                <span>Marginal Tax Rate</span>
                                <Tooltip text="Your highest income tax rate. This is used to calculate both the tax payable on investment returns and the tax deduction benefit on the investment loan interest. The final *after-tax* profit/loss is then used to accelerate your home loan payoff. (e.g., $45k-$120k income is 32.5%)">
                                    <InfoIcon className="h-4 w-4" />
                                </Tooltip>
                            </div>
                        }
                        value={appState.marginalTaxRate}
                        onChange={val => handleStateChange('marginalTaxRate', val)}
                        min={0} max={45} step={0.5} unit="%"
                    />
                </div>
            ),
        },
        {
            title: "2. Performance Snapshot: Crown vs Crown + Recycling",
            content: (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg space-y-2">
                        <h4 className="text-base text-[var(--text-color-muted)]">Home Loan Payoff Time</h4>
                        <p className="text-4xl font-bold my-2 text-[var(--chart-color-crown)]">{debtRecyclingCalculation.termInYears.toFixed(1)} Years</p>
                        <p className="text-sm text-[var(--color-positive-text)] font-semibold">
                            {(crownMoneyLoanCalculation.termInYears - debtRecyclingCalculation.termInYears).toFixed(1)} years sooner
                        </p>
                    </div>
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg space-y-2">
                        <h4 className="text-base text-[var(--text-color-muted)]">Total Home Loan Interest Paid</h4>
                        <p className="text-4xl font-bold my-2 text-[var(--chart-color-crown)]">{formatCurrency(debtRecyclingCalculation.totalInterest)}</p>
                        <p className="text-sm text-[var(--color-positive-text)] font-semibold">
                            {formatCurrency(crownMoneyLoanCalculation.totalInterest - debtRecyclingCalculation.totalInterest)} saved
                        </p>
                    </div>
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg space-y-2">
                        <h4 className="text-base text-[var(--text-color-muted)]">Portfolio Value at Payoff</h4>
                        <p className="text-4xl font-bold my-2 text-[var(--chart-color-wealth)]">{formatCurrency(debtRecyclingCalculation.finalInvestmentPortfolioValue)}</p>
                    </div>
                     <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg space-y-2">
                        <div className="flex items-center justify-center gap-1">
                           <h4 className="text-base text-[var(--text-color-muted)]">Net Position at Payoff</h4>
                           <Tooltip text="CALCULATION: Portfolio Value - Investment Loan Balance. This is your net gain from the investment strategy at the moment your home loan is paid off.">
                               <InfoIcon className="h-4 w-4" />
                           </Tooltip>
                        </div>
                        <p className="text-4xl font-bold my-2 text-[var(--chart-color-wealth)]">
                            {formatCurrency(debtRecyclingCalculation.finalInvestmentPortfolioValue - debtRecyclingCalculation.finalInvestmentLoanBalance)}
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: "3. Net Worth Trajectory Comparison",
            content: (
                <>
                    <p className="text-sm text-[var(--text-color-muted)] mb-4">
                        This chart projects your total net worth (Home Equity + Investments) over time, comparing all three scenarios. Note the significant acceleration in wealth creation with the Debt Recycling strategy.
                    </p>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer>
                            <AreaChart data={netWorthData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="age" name="Age" stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Age', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }}/>
                                <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip formatter={formatChartCurrency} />} />
                                <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                                <Area type="monotone" dataKey="Bank" stroke="var(--chart-color-bank)" fill="var(--chart-color-bank)" fillOpacity={0.2} strokeWidth={2} dot={false}/>
                                <Area type="monotone" dataKey="Crown Money" stroke="var(--chart-color-crown)" fill="var(--chart-color-crown)" fillOpacity={0.2} strokeWidth={2} dot={false}/>
                                <Area type="monotone" dataKey="Crown + Recycling" stroke="var(--chart-color-wealth)" fill="var(--chart-color-wealth)" fillOpacity={0.3} strokeWidth={3} dot={false}/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )
        },
        {
            title: "4. Debt Composition (Debt Recycling Strategy)",
            content: (
                <>
                    <p className="text-sm text-[var(--text-color-muted)] mb-4">
                        This chart shows how your debt is transformed. The non-deductible home loan (purple) is paid down, while the tax-deductible investment loan (pink) grows, funded by the principal you've repaid. The total debt remains high initially, but its structure becomes much more efficient for wealth creation.
                    </p>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer>
                            <AreaChart data={debtCompositionData} stackOffset="none" margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="year" type="number" domain={[0, 'dataMax']} stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Years', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }}/>
                                <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip formatter={formatChartCurrency} />} />
                                <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                                <Area type="monotone" dataKey="Home Loan" stackId="1" stroke="var(--chart-color-crown)" fill="var(--chart-color-crown)" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="Investment Loan" stackId="1" stroke="var(--chart-color-interest)" fill="var(--chart-color-interest)" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )
        }
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <Accordion items={accordionItems} />
        </div>
    );
};

export default React.memo(Tab_DebtRecycling);