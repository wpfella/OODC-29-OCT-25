
import React from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { InfoIcon } from './common/IconComponents';
import Tooltip from './common/Tooltip';
import SliderInput from './common/SliderInput';
import Accordion from './common/Accordion';
import { calculateIOPayment } from '../hooks/useMortgageCalculations';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
  setWarningToast: (message: string) => void;
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

const Tab2_InterestBreakdown: React.FC<Props> = ({ appState, setAppState, calculations, setWarningToast }) => {
  const { bankLoanCalculation, getMonthlyAmount } = calculations;
  const { loan } = appState;

  const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  const handleLoanChange = (field: keyof typeof loan, value: any) => {
    let updates: Partial<typeof loan> = { [field]: value };
    if (field === 'interestRate') {
        const netLoan = Math.max(0, loan.amount - (loan.offsetBalance || 0));
        if (netLoan > 0) {
            const minRepayment = calculateIOPayment(netLoan, value, loan.frequency);
            if (loan.repayment < minRepayment) {
                const adjustedRepayment = Math.ceil(minRepayment);
                updates.repayment = adjustedRepayment;
                setWarningToast(`Repayment adjusted to ${formatCurrency(adjustedRepayment)} to cover higher interest.`);
            }
        }
    }
    setAppState(prev => ({ ...prev, loan: { ...prev.loan, ...updates } }));
  };

  const netLoanAmount = Math.max(0, loan.amount - (loan.offsetBalance || 0));
  const monthlyRepayment = getMonthlyAmount(appState.loan.repayment, appState.loan.frequency);
  const annualRepayment = monthlyRepayment * 12;

  const firstYearInterest = (bankLoanCalculation.amortizationSchedule || [])
    .slice(0, 12)
    .reduce((acc: number, curr: any) => acc + curr.interestPaid, 0);
  
  const annualDebtReduction = Math.max(0, annualRepayment - firstYearInterest);
  const weeklyInterestPaid = firstYearInterest / 52;

  const processAmortizationSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return [];
    const yearlyData: { [year: number]: { Interest: number, Principal: number } } = {};
    schedule.forEach((d: any) => {
        const year = Math.ceil(d.month / 12);
        if (!yearlyData[year]) {
            yearlyData[year] = { Interest: 0, Principal: 0 };
        }
        yearlyData[year].Interest += d.interestPaid;
        yearlyData[year].Principal += d.principalPaid;
    });
    return Object.keys(yearlyData).map(yearStr => {
        const year = parseInt(yearStr, 10);
        return {
            year: year,
            Interest: isFinite(yearlyData[year].Interest) ? yearlyData[year].Interest : 0,
            Principal: isFinite(yearlyData[year].Principal) ? yearlyData[year].Principal : 0,
        }
    });
  };
  
  const firstYearPieData = [
    { name: 'Interest Paid', value: isFinite(firstYearInterest) ? firstYearInterest : 0 },
    { name: 'Debt Reduction', value: isFinite(annualDebtReduction) ? annualDebtReduction : 0 },
  ];
  const firstYearPieColors = ['var(--chart-color-interest)', 'var(--chart-color-principal)'];

  const annualBankChartData = React.useMemo(() => {
    if (bankLoanCalculation.termInYears === Infinity) return [];
    return processAmortizationSchedule(bankLoanCalculation.amortizationSchedule);
  }, [bankLoanCalculation.amortizationSchedule, bankLoanCalculation.termInYears]);

  const interestAsPercentageOfPrincipal = netLoanAmount > 0 ? (bankLoanCalculation.totalInterest / netLoanAmount) * 100 : 0;

  // Move the early return check HERE, after all hooks are declared.
  if (bankLoanCalculation.termInYears === Infinity) {
    return (
        <div className="animate-fade-in">
            <Card>
                <div className="text-center text-yellow-400 p-4">
                    <p className="font-bold text-lg">Unable to calculate breakdown.</p>
                    <p>Repayments are not high enough to cover the interest on the loan.</p>
                    <p className="text-sm mt-2 text-black/70">Adjust Repayments or Interest Rate in the Current Loan tab.</p>
                </div>
            </Card>
        </div>
    );
  }
  
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.Principal + data.Interest;
      return (
        <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
          <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{`Year: ${label}`}</p>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-principal)' }}></div>
              <p className="text-[var(--tooltip-text-color)]">{`Principal Paid: ${formatCurrency(data.Principal)}`}</p>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-interest)' }}></div>
              <p className="text-[var(--tooltip-text-color)]">{`Interest Paid: ${formatCurrency(data.Interest)}`}</p>
          </div>
          <hr className="my-1 border-[var(--border-color)] opacity-50" />
          <p className="text-[var(--tooltip-text-color-muted)]">{`Total Paid: ${formatCurrency(total)}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: data.payload.fill }}></div>
                    <p className="label font-bold text-[var(--tooltip-text-color)]">{`${data.name}`}</p>
                </div>
                <p className="text-[var(--tooltip-text-color)] pl-5">{`${formatCurrency(data.value)} (${(data.percent * 100).toFixed(1)}%)`}</p>
            </div>
        );
    }
    return null;
  };

  const accordionItems = [
    {
      title: "1. Loan & First Year Cost Breakdown",
      content: (
        <>
            <h3 className="text-base font-semibold text-center mb-4 text-[var(--text-color)]">Loan Recap</h3>
            <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Loan Amount</h4>
                        <p className="text-lg sm:text-xl font-bold text-[var(--text-color)]">{formatCurrency(loan.amount)}</p>
                    </div>
                    <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Offset Balance</h4>
                        <p className="text-lg sm:text-xl font-bold text-[var(--text-color)]">{formatCurrency(loan.offsetBalance)}</p>
                    </div>
                    <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Net Loan Amount</h4>
                        <p className="text-lg sm:text-xl font-bold text-[var(--text-color)]">{formatCurrency(netLoanAmount)}</p>
                    </div>
                    <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg col-span-2 sm:col-span-1">
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Repayments</h4>
                        <p className="text-lg sm:text-xl font-bold text-[var(--text-color)]">{formatCurrency(loan.repayment)}</p>
                        <p className="text-xs text-[var(--text-color-muted)] capitalize">{loan.frequency}</p>
                    </div>
                    <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Bank Loan Term</h4>
                        <p className="text-lg sm:text-xl font-bold text-[var(--text-color)]">{bankLoanCalculation.termInYears.toFixed(1)}</p>
                        <p className="text-xs text-[var(--text-color-muted)]">Years</p>
                    </div>
                </div>
                <div className="mt-6">
                    <SliderInput label="Interest Rate" value={loan.interestRate} onChange={val => handleLoanChange('interestRate', val)} min={1} max={15} step={0.05} unit="%" />
                </div>
            </div>
            <hr className="my-6 border-[var(--border-color)] border-dashed" />
            <h3 className="text-base font-semibold text-center mb-4 text-[var(--text-color)]">First Year Costs</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg col-span-2">
                    <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Total Annual Repayments</h4>
                    <p className="text-xl sm:text-2xl font-bold text-[var(--text-color)] print:text-black">{formatCurrency(annualRepayment)}</p>
                </div>
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                    <div className='flex items-center justify-center gap-1'>
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Annual Debt Reduction</h4>
                        <Tooltip text="The amount of principal paid off in the first year. (Total Repayments - Interest Paid)">
                            <InfoIcon className="h-3 w-3 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-[var(--chart-color-principal)] print:text-blue-600">{formatCurrency(annualDebtReduction)}</p>
                </div>
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                    <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Annual Interest Paid</h4>
                    <p className="text-lg sm:text-xl font-bold text-[var(--chart-color-interest)] print:text-pink-600">{formatCurrency(firstYearInterest)}</p>
                </div>
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg col-span-2">
                    <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Average Weekly Interest Paid (First Year)</h4>
                    <p className="text-lg sm:text-xl font-bold text-[var(--text-color)] print:text-black">{formatCurrency(weeklyInterestPaid)}</p>
                </div>
            </div>
        </>
      )
    },
    {
      title: "2. The Total Cost Over Life of Loan",
      content: (
        <>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg col-span-2">
                    <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Total Repayments (Principal + Interest)</h4>
                    <p className="text-xl sm:text-2xl font-bold text-[var(--text-color)] print:text-black">{formatCurrency(bankLoanCalculation.totalPaid)}</p>
                </div>
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                    <div className='flex items-center justify-center gap-1'>
                        <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Total Principal Paid</h4>
                        <Tooltip text="The original net loan amount you are repaying.">
                            <InfoIcon className="h-3 w-3 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-[var(--chart-color-principal)] print:text-blue-600">{formatCurrency(netLoanAmount)}</p>
                </div>
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                    <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Total Interest Paid</h4>
                    <p className="text-lg sm:text-xl font-bold text-[var(--chart-color-interest)] print:text-pink-600">{formatCurrency(bankLoanCalculation.totalInterest)}</p>
                </div>
                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-lg col-span-2">
                    <h4 className="text-xs sm:text-sm text-[var(--text-color-muted)]">Interest as a Percentage of Principal Paid</h4>
                    <p className="text-lg sm:text-xl font-bold text-[var(--text-color)] print:text-black">
                        {interestAsPercentageOfPrincipal.toFixed(1)}%
                    </p>
                </div>
            </div>
        </>
      )
    },
    {
      title: "3. Visualizing Your Payments Over Time",
      content: (
        <>
            <p className="text-sm text-[var(--text-color-muted)] mb-4">Notice how the interest (pink) dominates the early years.</p>
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <BarChart data={annualBankChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="year" stroke="var(--text-color)" tick={{ fontSize: 12 }} label={{ value: 'Years', position: 'insideBottom', offset: -10, fill: 'var(--text-color-muted)' }} />
                      <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} tick={{ fontSize: 12 }} />
                      <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                      <Legend iconType="square" wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)", paddingTop: '20px' }} />
                      <Bar dataKey="Principal" name="Principal Paid" stackId="a" fill="var(--chart-color-principal)" />
                      <Bar dataKey="Interest" name="Interest Paid" stackId="a" fill="var(--chart-color-interest)" />
                  </BarChart>
                </ResponsiveContainer>
            </div>
        </>
      )
    },
    {
      title: "4. First Year Allocation",
      content: (
        <>
            <p className="text-sm text-[var(--text-color-muted)] mb-4">Proportion of payments going towards interest vs principal in Year 1.</p>
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={firstYearPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      innerRadius={60}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return (
                            <text x={x} y={y} fill="var(--bg-color)" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize="16">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                      }}
                    >
                      {firstYearPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={firstYearPieColors[index % firstYearPieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                    <Legend iconType="square" wrapperStyle={{fontSize: "14px", color: "var(--text-color-muted)", paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
            </div>
        </>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
        <Accordion items={accordionItems} />
    </div>
  );
};

export default React.memo(Tab2_InterestBreakdown);
