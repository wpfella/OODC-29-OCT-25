import React, { useMemo, useEffect, useState } from 'react';
import { AppState, AmortizationDataPoint } from '../types';
import Card from './common/Card';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Line, ReferenceLine, Label } from 'recharts';
import Tooltip from './common/Tooltip';
import { InfoIcon, HomeIcon, BriefcaseIcon, CalendarIcon, ArrowPathIcon, TrendingUpIcon, BanknotesIcon, SparklesIcon } from './common/IconComponents';
import { calculateIOPayment } from '../hooks/useMortgageCalculations';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const formatChartCurrency = (tick: number): string => {
  if (Math.abs(tick) >= 1000000) return `$${(tick / 1000000).toFixed(1)}M`;
  if (Math.abs(tick) >= 1000) return `$${Math.round(tick / 1000)}k`;
  return `$${tick}`;
};

const formatCurrency = (value: number) => {
    if (!isFinite(value) || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const getExactDate = (years: number): string => {
    if (!isFinite(years) || years <= 0) return 'N/A';
    const totalMonths = Math.ceil(years * 12);
    const date = new Date();
    date.setMonth(date.getMonth() + totalMonths);
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
};

const PHASE_COLORS = [
    '#5B21B6', // Primary (Purple)
    '#10B981', // Inv 1 (Emerald)
    '#F59E0B', // Inv 2 (Amber)
    '#3B82F6', // Inv 3 (Blue)
    '#EF4444', // Inv 4 (Red)
    '#EC4899', // Pink
    '#8B5CF6', // Purple-Blue
];

const CrownRoadmap: React.FC<{ properties: any[] }> = ({ properties }) => {
    return (
        <div className="py-10 max-w-4xl mx-auto px-4">
            <div className="relative">
                {/* Center vertical line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 -translate-x-1/2 rounded-full hidden md:block"></div>
                
                <div className="space-y-24 relative">
                    {properties.map((prop, idx) => {
                        const isEven = idx % 2 === 0;
                        const crownYear = prop.endYear;
                        const bankYear = prop.bankYears;
                        const yearsSaved = Math.max(0, bankYear - crownYear);
                        
                        return (
                            <div key={prop.id || idx} className="relative">
                                {/* Desktop Milestone Connector Line */}
                                <div className="absolute left-1/2 top-1/2 w-8 h-1 bg-slate-100 -translate-y-1/2 hidden md:block" 
                                     style={{ left: isEven ? 'auto' : 'calc(50% + 4px)', right: isEven ? 'calc(50% + 4px)' : 'auto' }}></div>

                                <div className={`flex flex-col md:flex-row items-center gap-8 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                                    {/* Content Card */}
                                    <div className="w-full md:w-1/2">
                                        <div className={`bg-white dark:bg-slate-900 border-2 rounded-[2rem] p-6 shadow-xl transition-all duration-300 hover:shadow-2xl relative overflow-hidden group`} style={{ borderColor: prop.phaseColor }}>
                                            {/* Corner Badge */}
                                            <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: prop.phaseColor }}>
                                                {prop.type === 'primary' ? 'Home Base' : `Asset #${idx}`}
                                            </div>

                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="p-3 rounded-2xl text-white shadow-lg" style={{ backgroundColor: prop.phaseColor }}>
                                                    {prop.type === 'primary' ? <HomeIcon className="h-6 w-6" /> : <BriefcaseIcon className="h-6 w-6" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{prop.title}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sequential Payoff Phase</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Bank Outcome */}
                                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Strategy</p>
                                                        <p className="text-sm font-bold text-slate-600">{getExactDate(bankYear)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Year</p>
                                                        <p className="text-sm font-bold text-slate-600">{bankYear.toFixed(1)}</p>
                                                    </div>
                                                </div>

                                                {/* The Gap Line */}
                                                <div className="flex flex-col items-center py-1">
                                                    <div className="w-px h-6 border-l-2 border-dashed border-slate-200"></div>
                                                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">
                                                        Accelerated by {yearsSaved.toFixed(1)} Years
                                                    </div>
                                                    <div className="w-px h-6 border-l-2 border-dashed border-slate-200"></div>
                                                </div>

                                                {/* Crown Outcome */}
                                                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border-2 border-emerald-500/20 shadow-inner">
                                                    <div>
                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Crown Strategy 🏆</p>
                                                        <p className="text-lg font-black text-emerald-700 leading-tight">{prop.debtFreeDate}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Year</p>
                                                        <p className="text-lg font-black text-emerald-700 leading-tight">{crownYear.toFixed(1)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Interest Saving</p>
                                                <p className="text-lg font-black text-emerald-600 tracking-tight">{formatCurrency(prop.interestSaved)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Milestone Central Marker */}
                                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 hidden md:block">
                                        <div className="w-12 h-12 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundColor: prop.phaseColor }}>
                                            <div className="text-white font-black text-xs">{idx + 1}</div>
                                        </div>
                                    </div>

                                    {/* Empty Spacer for desktop alignment */}
                                    <div className="hidden md:block md:w-1/2"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const PropertyAttackAnalysisCard: React.FC<{
    title: string;
    type: 'primary' | 'investment';
    color: string;
    startYear: number;
    endYear: number;
    debtFreeDate: string;
    householdSurplus: number;
    freedUpRepayments: number;
    propertyNetCashflow: number;
    totalAttack: number;
    extraCapitalUsed: number;
    chartData: any[];
    bankYears: number;
}> = ({ title, type, color, startYear, endYear, debtFreeDate, householdSurplus, freedUpRepayments, propertyNetCashflow, totalAttack, extraCapitalUsed, chartData, bankYears }) => {
    return (
        <Card className="overflow-hidden border-l-8" style={{ borderLeftColor: color }}>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg text-white" style={{ backgroundColor: color }}>
                            {type === 'primary' ? <HomeIcon className="h-6 w-6" /> : <BriefcaseIcon className="h-6 w-6" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">{title}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                <CalendarIcon className="h-3 w-3" />
                                <span>Starts: Year {startYear.toFixed(1)}</span>
                                <span className="opacity-30">•</span>
                                <span>Ends: Year {endYear.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="inline-block px-3 py-1 bg-green-50 rounded-md border border-green-200">
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Debt Free By: {debtFreeDate.toUpperCase()}</p>
                    </div>

                    <div className="bg-black/5 p-5 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUpIcon className="h-4 w-4 text-slate-700" />
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Redirection Firepower</h4>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 font-bold">Standard Household Surplus</span>
                                <span className="font-black text-green-600">+{formatCurrency(householdSurplus)}</span>
                            </div>
                            {freedUpRepayments > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600 font-bold">Freed-up Debt Repayments</span>
                                    <span className="font-black text-green-600">+{formatCurrency(freedUpRepayments)}</span>
                                </div>
                            )}
                            {type === 'investment' && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600 font-bold">Property Net Cashflow</span>
                                    <span className="font-black text-green-600">+{formatCurrency(propertyNetCashflow)}</span>
                                </div>
                            )}
                            <div className="pt-3 mt-1 border-t border-dashed border-slate-300 flex justify-between items-center">
                                <span className="text-sm font-black text-slate-900">Total Monthly Attack</span>
                                <div className="text-right">
                                    <span className="text-xl font-black text-slate-900">{formatCurrency(totalAttack)}</span>
                                    <span className="text-[10px] block font-bold text-slate-500">/mo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                            <BanknotesIcon className="h-4 w-4 text-slate-600" />
                            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Total Extra Capital Used</h4>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{formatCurrency(extraCapitalUsed)}</p>
                        <p className="text-[9px] text-slate-500 font-medium italic mt-1">*Total amount of surplus and redirected repayments used to clear this specific debt.</p>
                    </div>
                </div>

                <div className="flex-grow">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Acceleration Comparison</h4>
                    </div>
                    <div className="h-64 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis 
                                    dataKey="year" 
                                    type="number" 
                                    domain={['auto', Math.max(endYear, bankYears)]}
                                    stroke="#64748b"
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    tickFormatter={(val) => `Yr ${val.toFixed(0)}`}
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="#64748b"
                                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                                    tickFormatter={formatChartCurrency}
                                    axisLine={false}
                                    label={{ value: 'Balance', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }, offset: 10 }}
                                />
                                <RechartsTooltip 
                                    formatter={(val: number) => [formatCurrency(val), 'Debt Balance']}
                                    labelFormatter={(val: number) => `Year ${val.toFixed(1)}`}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area 
                                    type="linear" 
                                    dataKey="balance" 
                                    name="Crown Path"
                                    stroke={color} 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill={`url(#gradient-${title})`} 
                                    dot={false}
                                />
                                <Line 
                                    type="linear" 
                                    dataKey="bankBalance" 
                                    name="Bank Path"
                                    stroke="#94a3b8" 
                                    strokeWidth={2} 
                                    strokeDasharray="4 4"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const Tab_InvestmentOODC: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { 
    investmentLoanCalculations, 
    crownMoneyLoanCalculation, 
    bankLoanCalculation, 
    totalDebtData, 
    surplus: livingSurplus,
    getMonthlyAmount
  } = calculations;
  const { investmentProperties, payoffStrategy, loan } = appState;

  const [selectedAssetId, setSelectedAssetId] = useState<string>('portfolio');

  useEffect(() => {
      if (payoffStrategy !== 'snowball') {
          setAppState(prev => ({ ...prev, payoffStrategy: 'snowball' }));
      }
  }, [payoffStrategy, setAppState]);

  const individualPropertyData = useMemo(() => {
    if (!crownMoneyLoanCalculation.amortizationSchedule || crownMoneyLoanCalculation.termInYears === Infinity) return [];

    const results = [];
    let cumulativeFreedUp = 0;

    // 1. Primary Home
    const primaryTitle = "Primary Home Loan";
    const primaryFirepower = livingSurplus;
    const primaryExtraUsed = primaryFirepower * (crownMoneyLoanCalculation.termInYears * 12);
    
    const maxPrimaryMonths = Math.max(crownMoneyLoanCalculation.amortizationSchedule.length, bankLoanCalculation.amortizationSchedule.length);
    const primaryChart = [];
    for (let m = 0; m <= maxPrimaryMonths; m++) {
        const idx = m === 0 ? 0 : m - 1;
        primaryChart.push({
            year: m / 12,
            balance: m > crownMoneyLoanCalculation.amortizationSchedule.length ? 0 : (m === 0 ? (loan.amount - (loan.offsetBalance || 0)) : (crownMoneyLoanCalculation.amortizationSchedule[idx]?.totalRemainingBalance ?? 0)),
            bankBalance: m === 0 ? (loan.amount - (loan.offsetBalance || 0)) : (bankLoanCalculation.amortizationSchedule[idx]?.remainingBalance ?? 0)
        });
    }

    results.push({
        id: 'primary',
        title: primaryTitle,
        type: 'primary' as const,
        startYear: 0,
        endYear: crownMoneyLoanCalculation.termInYears,
        debtFreeDate: getExactDate(crownMoneyLoanCalculation.termInYears),
        householdSurplus: livingSurplus,
        freedUpRepayments: 0,
        propertyNetCashflow: 0,
        totalAttack: primaryFirepower,
        extraCapitalUsed: primaryExtraUsed,
        chartData: primaryChart,
        phaseColor: PHASE_COLORS[0],
        bankYears: bankLoanCalculation.termInYears,
        interestSaved: Math.max(0, bankLoanCalculation.totalInterest - crownMoneyLoanCalculation.totalInterest)
    });

    cumulativeFreedUp += getMonthlyAmount(loan.repayment, loan.frequency);

    // 2. Investments
    const sortedInv = [...investmentLoanCalculations.investmentPayoffSchedule].sort((a, b) => (a.crown.startYear || 0) - (b.crown.startYear || 0));
    
    sortedInv.forEach((inv: any, idx: number) => {
        const prop = investmentProperties.find(p => p.id === inv.propertyId);
        if (!prop) return;

        const rentalIncome = getMonthlyAmount(prop.rentalIncome, prop.rentalIncomeFrequency);
        const propExpenses = (prop.expenses || []).reduce((sum, e) => sum + getMonthlyAmount(e.amount, e.frequency), 0);
        const netPropCashflow = rentalIncome - propExpenses;
        
        const crownRate = prop.crownSettings?.interestRate ?? prop.interestRate;
        const currentPropPayment = calculateIOPayment(Math.max(0, prop.loanAmount - (prop.offsetBalance || 0)), crownRate, 'monthly');

        const totalAttackPower = livingSurplus + cumulativeFreedUp + currentPropPayment;
        const attackDurationMonths = (inv.crown.termInYears - inv.crown.startYear) * 12;
        const extraCapitalUsed = totalAttackPower * attackDurationMonths;

        const maxMonths = Math.max(Math.ceil(inv.crown.termInYears * 12), inv.bank.amortizationSchedule.length);
        const attackPhaseChart = [];
        const startMonthIndex = Math.floor((inv.crown.startYear || 0) * 12);

        for (let m = startMonthIndex; m <= maxMonths; m++) {
            const idx = m === 0 ? 0 : m - 1;
            const crownPoint = inv.crown.amortizationSchedule[idx];
            
            attackPhaseChart.push({
                year: m / 12,
                balance: m > Math.ceil(inv.crown.termInYears * 12) ? 0 : (crownPoint?.remainingBalance ?? 0),
                bankBalance: inv.bank.amortizationSchedule[idx]?.remainingBalance ?? 0
            });
        }

        results.push({
            id: String(prop.id),
            title: prop.address,
            type: 'investment' as const,
            startYear: inv.crown.startYear || 0,
            endYear: inv.crown.termInYears,
            debtFreeDate: getExactDate(inv.crown.termInYears),
            householdSurplus: livingSurplus,
            freedUpRepayments: cumulativeFreedUp,
            propertyNetCashflow: netPropCashflow,
            totalAttack: totalAttackPower,
            extraCapitalUsed: extraCapitalUsed,
            chartData: attackPhaseChart,
            phaseColor: PHASE_COLORS[(idx + 1) % PHASE_COLORS.length],
            bankYears: inv.bank.termInYears,
            interestSaved: Math.max(0, inv.bank.totalInterest - inv.crown.totalInterest)
        });

        cumulativeFreedUp += currentPropPayment;
    });

    return results;
  }, [crownMoneyLoanCalculation, bankLoanCalculation, investmentLoanCalculations, livingSurplus, loan, investmentProperties, getMonthlyAmount]);

  const selectedData = useMemo(() => {
    if (selectedAssetId === 'portfolio') return null;
    return individualPropertyData.find(d => d.id === selectedAssetId);
  }, [selectedAssetId, individualPropertyData]);

  if (investmentProperties.length === 0) {
    return (
      <Card><div className="text-center text-slate-500 p-8"><h3 className="text-xl font-bold mb-2 text-slate-900">No Investment Properties Added</h3><p>Add a property on the 'Investments' tab to see portfolio payoff comparisons.</p></div></Card>
    );
  }
  
  const totalDebtFreeYears = individualPropertyData.length > 0 ? individualPropertyData[individualPropertyData.length - 1].endYear : 0;
  const totalInterestSaved = (bankLoanCalculation.totalInterest + investmentLoanCalculations.totalBankInterest) - (crownMoneyLoanCalculation.totalInterest + investmentLoanCalculations.totalCrownInterest);
  const primaryHomePayoffYear = crownMoneyLoanCalculation.termInYears;

  return (
    <div className="animate-fade-in space-y-12">
        {/* Milestone Header */}
        <div className="pt-6">
            <div className="flex flex-col items-center gap-2 mb-8 bg-green-50 p-8 rounded-[2.5rem] border-2 border-green-500/20 shadow-xl max-w-4xl mx-auto text-center">
                <p className="text-sm font-black text-green-700 uppercase tracking-[0.4em] mb-2">Entire Portfolio Debt-Free By:</p>
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-green-600 rounded-2xl shadow-lg shadow-green-600/30">
                        <CalendarIcon className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-6xl sm:text-8xl font-black text-green-800 tracking-tighter">{getExactDate(totalDebtFreeYears)}</p>
                </div>
            </div>
        </div>

        {/* View Switcher / Asset Toggle */}
        <div className="max-w-4xl mx-auto">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setSelectedAssetId('portfolio')}
                    className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedAssetId === 'portfolio' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Full Portfolio 🏔️
                </button>
                {individualPropertyData.map(asset => (
                    <button 
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedAssetId === asset.id ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.phaseColor }}></div>
                            <span className="truncate max-w-[100px]">{asset.title}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Dynamic Chart Container */}
        <Card title={
            <div className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-slate-900">
                {selectedAssetId === 'portfolio' ? (
                    <>
                        <span>Visualising the Snowball</span>
                        <Tooltip text="See how your portfolio debt is crushed sequentially. Grey area shows Bank simultaneous path, Purple area shows targeted loan currently being paid, Green dashed line is the strategy total debt.">
                            <InfoIcon className="h-5 w-5 text-slate-400"/>
                        </Tooltip>
                    </>
                ) : (
                    <>
                        <span>Focus: {selectedData?.title} Trajectory</span>
                        <Tooltip text={`Showing specific payoff comparison for ${selectedData?.title}. The chart starts from Year ${selectedData?.startYear.toFixed(1)}, when the sequential attack focuses on this loan.`}>
                            <InfoIcon className="h-5 w-5 text-slate-400"/>
                        </Tooltip>
                    </>
                )}
            </div>
        }>
            <div className="h-[500px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    {selectedAssetId === 'portfolio' ? (
                        <ComposedChart data={totalDebtData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                            <defs>
                                <linearGradient id="colorBankArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.6}/>
                                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.2}/>
                                </linearGradient>
                                <linearGradient id="colorTargetedArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.7}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} vertical={false} />
                            <XAxis dataKey="year" type="number" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 'bold' }} tickFormatter={(val) => `${val.toFixed(0)}`} />
                            <YAxis stroke="#64748b" tickFormatter={formatChartCurrency} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                            <RechartsTooltip 
                                formatter={(val: number) => formatCurrency(val)} 
                                labelFormatter={(val) => `Year ${Number(val).toFixed(1)}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="center"
                                wrapperStyle={{ paddingBottom: '30px', fontSize: '13px', fontWeight: '800' }} 
                            />
                            <Area type="linear" dataKey="Bank" name="Bank Total Debt" stroke="#94a3b8" fill="url(#colorBankArea)" strokeWidth={2} dot={false} />
                            <Area type="linear" dataKey="StrategyAttack" name="Crown Targeted Loan" stroke="#5B21B6" fill="url(#colorTargetedArea)" strokeWidth={3} dot={false} connectNulls={false} />
                            <Line type="linear" dataKey="Crown Money" name="Crown Total Debt" stroke="#10b981" strokeWidth={4} strokeDasharray="8 6" dot={false} />
                            <ReferenceLine x={primaryHomePayoffYear} stroke="#5B21B6" strokeDasharray="6 4" strokeWidth={1.5}>
                                <Label value="PRIMARY HOME PAID OFF" angle={-90} position="insideTopLeft" style={{ fontSize: '12px', fontWeight: '900', fill: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.1em' }} offset={20} />
                            </ReferenceLine>
                        </ComposedChart>
                    ) : (
                        <ComposedChart data={selectedData?.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                             <defs>
                                <linearGradient id="colorTargetedSingle" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={selectedData?.phaseColor} stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor={selectedData?.phaseColor} stopOpacity={0.6}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} vertical={false} />
                            <XAxis 
                                dataKey="year" 
                                type="number" 
                                domain={['auto', Math.max(selectedData?.endYear || 0, selectedData?.bankYears || 0)]}
                                stroke="#64748b" 
                                tick={{ fontSize: 11, fontWeight: 'bold' }} 
                                tickFormatter={(val) => `Yr ${val.toFixed(1)}`} 
                            />
                            <YAxis stroke="#64748b" tickFormatter={formatChartCurrency} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                            <RechartsTooltip 
                                formatter={(val: number) => formatCurrency(val)} 
                                labelFormatter={(val) => `Year ${Number(val).toFixed(1)}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '30px', fontSize: '13px', fontWeight: '800' }} />
                            <Line type="linear" dataKey="bankBalance" name="Bank Loan Path" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                            <Area type="linear" dataKey="balance" name={`Crown ${selectedData?.title} Attack`} stroke={selectedData?.phaseColor} fill="url(#colorTargetedSingle)" strokeWidth={4} dot={false} />
                            <ReferenceLine x={selectedData?.startYear} stroke="#64748b" strokeDasharray="3 3">
                                <Label value="ATTACK START" position="insideTopLeft" style={{ fontSize: '10px', fontWeight: '900', fill: '#64748b', textTransform: 'uppercase' }} offset={10} />
                            </ReferenceLine>
                        </ComposedChart>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>

        {/* Strategy Roadmap Section - Updated to Vertical Comparison journey */}
        <Card title={<div className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-slate-900">Portfolio Payoff Roadmap Journey</div>}>
            <CrownRoadmap properties={individualPropertyData} />
        </Card>

        {/* Milestone Table - Updated for Visibility */}
        <Card title={<div className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-slate-900">Milestone Table</div>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left pb-4 font-black uppercase text-slate-600">Property Asset</th>
                  <th className="text-center pb-4 font-black uppercase text-slate-600">Bank Date</th>
                  <th className="text-center pb-4 font-black uppercase text-indigo-600">Crown Date</th>
                  <th className="text-right pb-4 font-black uppercase text-emerald-600 pr-4">Interest Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {individualPropertyData.map((prop, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-5 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: prop.phaseColor }}></div>
                      <span className="font-bold text-slate-900">{prop.title}</span>
                    </td>
                    <td className="py-5 text-center text-slate-700 font-medium">{getExactDate(prop.bankYears)}</td>
                    <td className="py-5 text-center font-black text-indigo-700">{prop.debtFreeDate}</td>
                    <td className="py-5 text-right font-black text-emerald-700 pr-4">{formatCurrency(prop.interestSaved)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                  <td className="py-6 pl-4 font-black text-lg uppercase tracking-tight text-emerald-900">Portfolio Total</td>
                  <td className="py-6 text-center font-bold text-slate-700">{getExactDate(Math.max(...individualPropertyData.map(p => p.bankYears)))}</td>
                  <td className="py-6 text-center font-black text-xl text-indigo-800">{getExactDate(totalDebtFreeYears)}</td>
                  <td className="py-6 text-right font-black text-2xl text-emerald-800 pr-4">{formatCurrency(totalInterestSaved)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detailed Property Attack Analysis Sections */}
        <div className="space-y-12">
            <div className="text-center border-b border-slate-200 pb-6 max-w-2xl mx-auto">
                <h2 className="text-4xl font-black text-slate-900 mb-3 uppercase tracking-tight">Property Attack Analysis</h2>
                <p className="text-sm text-slate-500 font-bold italic tracking-wide">A deep-dive breakdown of the firepower used to crush each individual loan.</p>
            </div>

            <div className="space-y-8">
                {individualPropertyData.map((prop, idx) => (
                    <PropertyAttackAnalysisCard 
                        key={idx}
                        title={prop.title}
                        type={prop.type}
                        color={prop.phaseColor}
                        startYear={prop.startYear}
                        endYear={prop.endYear}
                        debtFreeDate={prop.debtFreeDate}
                        householdSurplus={prop.householdSurplus}
                        freedUpRepayments={prop.freedUpRepayments}
                        propertyNetCashflow={prop.propertyNetCashflow}
                        totalAttack={prop.totalAttack}
                        extraCapitalUsed={prop.extraCapitalUsed}
                        chartData={prop.chartData}
                        bankYears={prop.bankYears}
                    />
                ))}
            </div>
        </div>

        {/* Lifetime Summary */}
        <div className="pt-8 pb-12">
            <Card className="bg-indigo-900 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <SparklesIcon className="h-64 w-64 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-3xl font-black uppercase tracking-tight">Crown Strategy Impact Summary</h3>
                        <p className="text-indigo-200 font-medium">By shifting to the Crown Money sequential attack, you've optimized every dollar of your cashflow.</p>
                    </div>
                    <div className="flex gap-4 sm:gap-12">
                        <div className="text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Total Interest Saved</p>
                            <p className="text-4xl font-black">{formatCurrency(totalInterestSaved)}</p>
                        </div>
                        <div className="text-center border-l border-white/20 pl-4 sm:pl-12">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Net Portfolio Milestone</p>
                            <p className="text-4xl font-black">{getExactDate(totalDebtFreeYears).toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  );
};

export default React.memo(Tab_InvestmentOODC);