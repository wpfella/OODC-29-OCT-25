
import React, { useMemo } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, LabelList, ComposedChart, Line } from 'recharts';
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
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${Number(label).toFixed(2)}`}</p>
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
    const { debtRecyclingCalculation, crownMoneyLoanCalculation } = calculations;
    const { debtRecyclingEnabled, debtRecyclingInvestmentRate, debtRecyclingLoanInterestRate, marginalTaxRate, debtRecyclingPercentage } = appState;

    const handleStateChange = (field: keyof AppState, value: any) => {
        setAppState(prev => ({ ...prev, [field]: value }));
    };

    const snowballChartData = useMemo(() => {
        const { loan } = appState;
        // Safety check for invalid calculation state to prevent infinite loops
        if (!debtRecyclingCalculation || 
            !debtRecyclingCalculation.termInYears || 
            !isFinite(debtRecyclingCalculation.termInYears) ||
            !debtRecyclingCalculation.amortizationSchedule) {
            return [];
        }
    
        const homeLoanSchedule = debtRecyclingCalculation.amortizationSchedule;
        const portfolioSchedule = debtRecyclingCalculation.investmentPortfolioSchedule || [];
        const termInYears = debtRecyclingCalculation.termInYears;
        
        const netLoanAmount = loan.amount - (loan.offsetBalance || 0);
        
        const data = [];
        const lastYear = Math.min(Math.ceil(termInYears), 100); // Limit to 100 years max to be safe

        for (let year = 0; year <= lastYear; year++) {
             if (year === 0) {
                data.push({
                    label: 'Start',
                    'Home Loan Balance': netLoanAmount,
                    'Investment Portfolio': 0,
                });
                continue;
            }
            
            const monthIndex = year * 12 - 1;
            const isAfterPayoff = (monthIndex + 1) / 12 > termInYears;
            const homeLoan = isAfterPayoff ? 0 : (homeLoanSchedule[monthIndex]?.remainingBalance ?? 0);
            
            const portfolio = isAfterPayoff 
                ? portfolioSchedule[portfolioSchedule.length - 1]?.value ?? 0
                : (portfolioSchedule[monthIndex]?.value ?? 0);
            
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
        if (maxMonths === 0 || maxMonths > 1200) return []; // Limit to 100 years

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
            title: "2. Configuration & Assumptions",
            content: (
                <div className="space-y-6">
                    <SliderInput 
                        label="Percentage of Principal to Recycle" 
                        value={debtRecyclingPercentage} 
                        onChange={val => handleStateChange('debtRecyclingPercentage', val)} 
                        min={0} max={100} step={5} unit="%" 
                    />
                    <SliderInput 
                        label="Investment Growth Rate" 
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
            title: "3. The Snowball Effect: Year-by-Year Growth",
            content: (
                <div className="w-full h-[400px]">
                    <ResponsiveContainer minWidth={0} minHeight={0}>
                        <BarChart data={snowballChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey="label" stroke="var(--text-color)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                            <Legend iconType="square" wrapperStyle={{ fontSize: "14px", color: "var(--text-color-muted)", paddingTop: '20px' }} />
                            <Bar dataKey="Home Loan Balance" name="Home Loan Balance" stackId="a" fill="#ec4899" />
                            <Bar dataKey="Investment Portfolio" name="Investment Portfolio" stackId="a" fill="#6d28d9" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            title: "4. Debt Composition (Debt Recycling Strategy)",
            content: (
                <div className="w-full h-[400px]">
                    <ResponsiveContainer minWidth={0} minHeight={0}>
                        <ComposedChart data={debtCompositionData} stackOffset="none" margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="year" type="number" stroke="var(--text-color)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)"}} verticalAlign="top" />
                            <Area type="monotone" dataKey="Home Loan" name="Home Loan (Bad Debt)" stackId="1" stroke="var(--chart-color-crown)" fill="var(--chart-color-crown)" fillOpacity={0.6} />
                            <Area type="monotone" dataKey="Investment Loan" name="Investment Loan (Good Debt)" stackId="1" stroke="var(--chart-color-interest)" fill="var(--chart-color-interest)" fillOpacity={0.6} />
                            <Line type="monotone" dataKey="Total Debt" stroke="#facc15" strokeWidth={3} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )
        }
    ];

    // Moved early return to end
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
            <Accordion items={accordionItems} defaultOpenIndex={0} />
        </div>
    );
};

export default React.memo(Tab_DebtRecycling);
