
import React, { useMemo } from 'react';
import { AppState, AmortizationDataPoint, InvestmentProperty, Frequency } from '../types';
import Card from './common/Card';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
  onUploadRecord: () => void;
  zapierStatus: 'idle' | 'loading' | 'success' | 'error';
}

interface SummaryItemProps {
  label: string;
  value: string | number;
  valueClassName?: string;
}
const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, valueClassName = '' }) => (
  <div className="flex justify-between py-2 border-b border-[var(--border-color)] print:border-gray-200">
    <span className="text-[var(--text-color-muted)] print:text-gray-600 text-sm">{label}</span>
    <span className={`font-semibold text-[var(--text-color)] print:text-black text-sm text-right ${valueClassName}`}>{value}</span>
  </div>
);

// Helper to calculate monthly cashflow for individual properties, needed for detailed summary
const getMonthlyFromAnyFrequency = (amount: number, frequency: Frequency ): number => {
    switch (frequency) {
      case 'weekly': return amount * (52/12);
      case 'fortnightly': return amount * (26/12);
      case 'quarterly': return amount / 3;
      case 'annually': return amount / 12;
      case 'monthly':
      default: return amount;
    }
};

const calculatePropertyCashflow = (prop: InvestmentProperty): number => {
    const monthlyRental = getMonthlyFromAnyFrequency(prop.rentalIncome, prop.rentalIncomeFrequency);
    const monthlyRepayment = getMonthlyFromAnyFrequency(prop.repayment, prop.repaymentFrequency);
    const monthlyExpenses = prop.expenses.reduce((sum, exp) => sum + getMonthlyFromAnyFrequency(exp.amount, exp.frequency), 0);
    return monthlyRental - monthlyRepayment - monthlyExpenses;
};


const Tab5_Summary: React.FC<Props> = ({ appState, setAppState, calculations, onUploadRecord, zapierStatus }) => {
  const { 
    loan, people, incomes, expenses, clientEmail, clientPhone, 
    investmentProperties, idealRetirementAge,
    investmentAmountPercentage, payoffStrategy, investmentGrowthRate,
    crownMoneyInterestRate, propertyGrowthRate, futureChanges, futureLumpSums,
    currentLender, allPartiesInAttendance, numberOfKids
  } = appState;
  
  const { 
    bankLoanCalculation, crownMoneyLoanCalculation, wealthProjection, 
    totalMonthlyIncome, totalMonthlyExpenses, investmentLoanCalculations,
    retirementWealthProjection, getMonthlyAmount, bankSurplus
  } = calculations;
  
  const handleStateChange = (field: keyof AppState, value: any) => {
    setAppState(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number, digits = 0) => {
    if (isNaN(value) || !isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
  };
  const formatYears = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 'N/A';
    return `${value.toFixed(1)} Years`;
  };
  
  const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
  const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;
  
  // Primary Loan Savings
  const primaryInterestSaved = isBankLoanValid && isCrownLoanValid ? bankLoanCalculation.totalInterest - crownMoneyLoanCalculation.totalInterest : 0;
  const netLoanAmount = loan.amount - (loan.offsetBalance || 0);

  // Investment Properties
  const hasInvestments = investmentProperties.length > 0;
  const totalPropertyValue = investmentProperties.reduce((sum, prop) => sum + prop.propertyValue, 0);
  const totalInvestmentOffset = investmentProperties.reduce((sum, p) => sum + (p.offsetBalance || 0), 0);
  const totalNetInvestmentDebt = investmentLoanCalculations.totalInvestmentDebt - totalInvestmentOffset;
  const isAnyInvestmentUnpayable = investmentLoanCalculations.investmentPayoffSchedule.some((p: any) => p.bank.termInYears === Infinity || p.crown.termInYears === Infinity);
  const canCalculateInvestmentSavings = hasInvestments && isCrownLoanValid && !isAnyInvestmentUnpayable;
  
  const investmentInterestSaved = canCalculateInvestmentSavings ? investmentLoanCalculations.totalBankInterest - investmentLoanCalculations.totalCrownInterest : 0;
  const totalCrownPayoffYears = canCalculateInvestmentSavings ? crownMoneyLoanCalculation.termInYears + investmentLoanCalculations.totalCrownTerm : crownMoneyLoanCalculation.termInYears;

  // Total Savings
  const totalInterestSaved = primaryInterestSaved + investmentInterestSaved;
  
  // Wealth
  const monthlySavings = getMonthlyAmount(appState.loan.repayment, appState.loan.frequency);
  const totalNetPositionAtRetirement = retirementWealthProjection.wealth + retirementWealthProjection.cashInHand + (retirementWealthProjection.homeEquity || 0);

  // Year 1 Calculation
  const { bankYear1, crownYear1 } = useMemo(() => {
    const getYear1Data = (schedule: AmortizationDataPoint[]) => {
      if (!schedule) return { interest: 0, principal: 0, total: 0 };
      const year1Schedule = schedule.slice(0, 12);
      const interest = year1Schedule.reduce((sum, item) => sum + item.interestPaid, 0);
      const principal = year1Schedule.reduce((sum, item) => sum + item.principalPaid, 0);
      return { interest, principal, total: interest + principal };
    };

    return {
      bankYear1: getYear1Data(bankLoanCalculation.amortizationSchedule),
      crownYear1: getYear1Data(crownMoneyLoanCalculation.amortizationSchedule)
    };
  }, [bankLoanCalculation, crownMoneyLoanCalculation]);

  // Progress Visual Helper
  const ProgressVisual = ({ principal, interest }: { principal: number, interest: number }) => {
    const total = principal + interest;
    if (total === 0) return <div className="h-2 rounded-full bg-gray-500" />;
    const principalPercent = (principal / total) * 100;
    return (
      <div className="w-full flex h-2 rounded-full overflow-hidden bg-[var(--chart-color-interest)]">
        <div style={{ width: `${principalPercent}%` }} className="bg-[var(--chart-color-principal)]"></div>
      </div>
    );
  };
  
  const inputClasses = "w-full bg-[var(--input-bg-color)] text-[var(--text-color)] p-2 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)] print:hidden";

  const zapierButtonText = useMemo(() => {
    switch (zapierStatus) {
        case 'loading': return 'Uploading...';
        case 'success': return 'Uploaded Successfully!';
        case 'error': return 'Upload Failed';
        default: return 'Upload Record to Zapier';
    }
  }, [zapierStatus]);

  return (
    <div className="animate-fade-in space-y-6 print:space-y-4">
      <Card>
        <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--title-color)]">Client Financial Summary</h2>
            <p className="text-[var(--text-color-muted)] mt-2">This report summarizes the client's current financial situation and the potential benefits of the Crown Money strategy. See other tabs for detailed breakdowns.</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
        {/* --- LEFT COLUMN --- */}
        <div className="space-y-6">
            <Card title="Client & Loan Overview">
                <h4 className="font-semibold text-sm mb-2 text-[var(--text-color)] print:text-black">Borrowers</h4>
                {people.map(p => <SummaryItem key={p.id} label={p.name} value={`Age ${p.age}`} />)}
                
                <h4 className="font-semibold text-sm mt-4 mb-2 text-[var(--text-color)] print:text-black">Contact & Meeting Details</h4>
                <div className="space-y-4 py-2">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-color-muted)]">Email Address</label>
                        <input type="email" value={clientEmail} onChange={e => handleStateChange('clientEmail', e.target.value)} className={inputClasses}/>
                        <span className="hidden print:block text-sm text-black pt-1">{clientEmail || 'N/A'}</span>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-color-muted)]">Phone Number</label>
                        <input type="tel" value={clientPhone} onChange={e => handleStateChange('clientPhone', e.target.value)} className={inputClasses}/>
                        <span className="hidden print:block text-sm text-black pt-1">{clientPhone || 'N/A'}</span>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-color-muted)]">Number of Kids</label>
                        <input 
                            type="number" 
                            value={numberOfKids} 
                            onChange={e => handleStateChange('numberOfKids', Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className={inputClasses}
                            min="0"
                        />
                        <span className="hidden print:block text-sm text-black pt-1">{numberOfKids}</span>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-color-muted)]">Current Lender (Bank Name)</label>
                        <input type="text" value={currentLender} onChange={e => handleStateChange('currentLender', e.target.value)} className={inputClasses}/>
                        <span className="hidden print:block text-sm text-black pt-1">{currentLender || 'N/A'}</span>
                    </div>
                    <div className="pt-2">
                        <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">All Parties In Attendance</label>
                        <select 
                            value={allPartiesInAttendance} 
                            onChange={e => handleStateChange('allPartiesInAttendance', e.target.value as typeof allPartiesInAttendance)} 
                            className={`custom-select ${inputClasses}`}
                        >
                            <option value="Yes- Couple">Yes- Couple</option>
                            <option value="Yes- Single">Yes- Single</option>
                            <option value="Yes- Other">Yes- Other</option>
                            <option value="Only 1 of 2 Showed">Only 1 of 2 Showed</option>
                        </select>
                        <span className="hidden print:block text-sm text-black pt-1">{allPartiesInAttendance}</span>
                    </div>
                    <div className="pt-2 print:hidden">
                        <button 
                            onClick={onUploadRecord} 
                            disabled={zapierStatus === 'loading'}
                            className="w-full p-2 bg-orange-500 text-white rounded-md font-semibold hover:bg-orange-600 transition-colors disabled:bg-orange-400/50 disabled:cursor-not-allowed"
                        >
                            {zapierButtonText}
                        </button>
                    </div>
                </div>

                <h4 className="font-semibold text-sm mt-4 mb-2 text-[var(--text-color)] print:text-black">Current Loan</h4>
                <SummaryItem label="Loan Amount" value={formatCurrency(loan.amount)} />
                <SummaryItem label="Offset Account Balance" value={formatCurrency(loan.offsetBalance || 0)} />
                <SummaryItem label="Net Loan Amount" value={formatCurrency(netLoanAmount)} valueClassName="font-bold" />
                <SummaryItem label="Interest Rate" value={`${loan.interestRate.toFixed(2)}%`} />
                <SummaryItem label="Repayment" value={`${formatCurrency(loan.repayment)} / ${loan.frequency}`} />
            </Card>

            <Card title="Budget Summary">
                <SummaryItem label="Total Monthly Income" value={formatCurrency(totalMonthlyIncome)} valueClassName="text-[var(--color-positive-text)] print:text-green-700" />
                <SummaryItem label="Total Monthly Expenses" value={formatCurrency(totalMonthlyExpenses)} valueClassName="text-[var(--color-negative-text)] print:text-red-700" />
                <div className="flex justify-between py-3 mt-2 rounded-lg px-3 print:bg-blue-100" style={{ backgroundColor: 'var(--color-surplus-bg)'}}>
                <span className="font-bold text-sm print:text-blue-800" style={{ color: 'var(--color-surplus-text)' }}>Monthly Surplus</span>
                <span className="font-bold text-sm print:text-blue-800" style={{ color: 'var(--color-surplus-text)' }}>{formatCurrency(bankSurplus)}</span>
                </div>
            </Card>
            
            {(futureChanges.length > 0 || futureLumpSums.length > 0) && (
              <Card title="Future Financial Events">
                  {futureChanges.length > 0 && (
                      <>
                          <h4 className="font-semibold text-sm mb-2 text-[var(--text-color)] print:text-black">Scheduled Changes</h4>
                          {futureChanges.map(change => (
                              <SummaryItem 
                                  key={change.id} 
                                  label={`${change.description} (${change.type})`}
                                  value={`${change.changeAmount >= 0 ? '+' : ''}${formatCurrency(change.changeAmount)} / ${change.frequency} from ${change.startDate}`} 
                                  valueClassName={change.changeAmount >= 0 ? 'text-[var(--color-positive-text)] print:text-green-700' : 'text-[var(--color-negative-text)] print:text-red-700'}
                              />
                          ))}
                      </>
                  )}
                  {futureLumpSums.length > 0 && (
                      <>
                          <h4 className="font-semibold text-sm mt-4 mb-2 text-[var(--text-color)] print:text-black">Lump Sum Events</h4>
                          {futureLumpSums.map(lump => (
                              <SummaryItem 
                                  key={lump.id} 
                                  label={`${lump.description} (${lump.type})`}
                                  value={`${lump.type === 'income' ? '+' : '-'}${formatCurrency(lump.amount)} on ${lump.date}`}
                                  valueClassName={lump.type === 'income' ? 'text-[var(--color-positive-text)] print:text-green-700' : 'text-[var(--color-negative-text)] print:text-red-700'}
                              />
                          ))}
                      </>
                  )}
              </Card>
            )}

            {hasInvestments && (
              <Card title="Investment Portfolio Details">
                  {investmentProperties.map(prop => {
                      const propCashflow = calculatePropertyCashflow(prop);
                      return (
                          <div key={prop.id} className="mb-4 pb-4 border-b border-[var(--border-color)] print:border-gray-200 last:border-b-0 last:pb-0 last:mb-0">
                              <h4 className="font-semibold text-base mb-2 text-[var(--text-color)] print:text-black">{prop.address}</h4>
                              <SummaryItem label="Property Value" value={formatCurrency(prop.propertyValue)} />
                              <SummaryItem label="Loan Amount" value={formatCurrency(prop.loanAmount)} />
                              <SummaryItem label="Net Monthly Cashflow (Current)" value={formatCurrency(propCashflow)} valueClassName={propCashflow >= 0 ? 'text-[var(--color-positive-text)] print:text-green-700' : 'text-[var(--color-negative-text)] print:text-red-700'} />
                          </div>
                      );
                  })}
                   <div className="mt-4 pt-4 border-t border-[var(--border-color)] print:border-gray-300">
                        <SummaryItem label="Total Portfolio Value" value={formatCurrency(totalPropertyValue)} valueClassName="font-bold"/>
                        <SummaryItem label="Total Net Investment Debt" value={formatCurrency(totalNetInvestmentDebt)} valueClassName="font-bold" />
                        <SummaryItem label="Total Net Monthly Cashflow (Current)" value={formatCurrency(calculations.investmentPropertiesNetCashflow)} valueClassName={`font-bold ${calculations.investmentPropertiesNetCashflow >= 0 ? 'text-[var(--color-positive-text)] print:text-green-700' : 'text-[var(--color-negative-text)] print:text-red-700'}`} />
                   </div>
              </Card>
            )}
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="space-y-6">
            
            <Card title="Key Outcomes: Savings & Timeline">
              <div className="space-y-4">
                  <div>
                      <h4 className="font-semibold text-center text-base text-[var(--text-color-muted)] mb-2">Total Interest Saved</h4>
                      <div className="text-center">
                          <p className="text-3xl font-bold my-1 text-[var(--chart-color-crown)] print:text-green-700">{formatCurrency(totalInterestSaved)}</p>
                      </div>
                      <div className="mt-2 text-sm">
                          <SummaryItem label="Primary Home Interest Saved" value={formatCurrency(primaryInterestSaved)} />
                          {hasInvestments && canCalculateInvestmentSavings && <SummaryItem label="Investment Interest Saved" value={formatCurrency(investmentInterestSaved)} />}
                      </div>
                  </div>
                  <hr className="border-[var(--border-color)] border-dashed" />
                  <div>
                      <h4 className="font-semibold text-center text-base text-[var(--text-color-muted)] mb-2">Final Debt-Free Timeline</h4>
                      <div className="text-center">
                          <p className="text-3xl font-bold my-1 text-[var(--chart-color-crown)] print:text-green-700">{formatYears(totalCrownPayoffYears)}</p>
                      </div>
                      <div className="mt-2 text-sm">
                          <SummaryItem label="Primary Home Payoff" value={`${crownMoneyLoanCalculation.termInYears.toFixed(1)} Years`} />
                          {hasInvestments && canCalculateInvestmentSavings && <SummaryItem label="All Investments Payoff" value={`${investmentLoanCalculations.totalCrownTerm.toFixed(1)} Years`} />}
                      </div>
                  </div>
              </div>
            </Card>
            
            <Card title="Key Assumptions">
                <SummaryItem label="Crown Money Interest Rate" value={`${crownMoneyInterestRate.toFixed(2)}%`} />
                <SummaryItem label="Investment Growth Rate" value={`${investmentGrowthRate}%`} />
                <SummaryItem label="Property Growth Rate" value={`${propertyGrowthRate}%`} />
                <SummaryItem label="Investment Payoff Strategy" value={payoffStrategy.charAt(0).toUpperCase() + payoffStrategy.slice(1)} />
            </Card>
            
            {isCrownLoanValid && (
              <Card title="Wealth Projection Summary">
                  <SummaryItem label="Investment Strategy" value={`Investing ${investmentAmountPercentage}% of ${formatCurrency(monthlySavings)}/m`} />
                  <SummaryItem label="Assumed Annual Growth" value={`${investmentGrowthRate}%`} />
                  <div className="text-center p-4 mt-3 bg-black/10 dark:bg-white/5 rounded-lg">
                      <p className="text-[var(--text-color-muted)] print:text-gray-600 text-sm">Projected Net Position by Retirement Age {idealRetirementAge}</p>
                      <p className="text-3xl font-bold my-1 text-[var(--chart-color-wealth)] print:text-yellow-700">{formatCurrency(totalNetPositionAtRetirement)}</p>
                  </div>
              </Card>
            )}

            { isBankLoanValid && isCrownLoanValid && (
              <Card title="Year 1 Progress: Bank vs. Crown Money">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 print:grid-cols-2 print:gap-x-4">
                      {/* Bank Side */}
                      <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 space-y-2 print:p-2">
                          <h4 className="font-bold text-center text-lg text-[var(--chart-color-bank)] print:text-base">Bank Plan (Year 1)</h4>
                          <div className="flex justify-between text-sm"><span>Principal Paid</span><span className="font-semibold">{formatCurrency(bankYear1.principal)}</span></div>
                          <div className="flex justify-between text-sm"><span>Interest Paid</span><span className="font-semibold">{formatCurrency(bankYear1.interest)}</span></div>
                          <ProgressVisual principal={bankYear1.principal} interest={bankYear1.interest} />
                          <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-color)] print:border-gray-200"><strong>Total Paid</strong><strong>{formatCurrency(bankYear1.total)}</strong></div>
                      </div>
                      {/* Crown Money Side */}
                      <div className="p-4 rounded-lg bg-[var(--chart-color-crown)]/10 space-y-2 print:p-2">
                          <h4 className="font-bold text-center text-lg text-[var(--chart-color-crown)] print:text-base">Crown Money Plan (Year 1) 🏆</h4>
                           <div className="flex justify-between text-sm"><span>Principal Paid</span><span className="font-semibold">{formatCurrency(crownYear1.principal)}</span></div>
                          <div className="flex justify-between text-sm"><span>Interest Paid</span><span className="font-semibold">{formatCurrency(crownYear1.interest)}</span></div>
                          <ProgressVisual principal={crownYear1.principal} interest={crownYear1.interest} />
                          <div className="flex justify-between text-sm pt-2 border-t border-[var(--border-color)] print:border-gray-200"><strong>Total Paid</strong><strong>{formatCurrency(crownYear1.total)}</strong></div>
                      </div>
                  </div>
                   {crownYear1.principal > 0 && bankYear1.principal > 0 && (
                      <div className="text-center mt-4 p-3 rounded-lg bg-black/10 dark:bg-white/5 print:p-2 print:mt-2">
                          <p className="font-semibold text-base print:text-sm">In the first year, the Crown Money strategy pays off <span className="text-[var(--chart-color-crown)] text-xl print:text-lg">{(crownYear1.principal / bankYear1.principal).toFixed(1)}x more</span> principal on your loan.</p>
                      </div>
                  )}
              </Card>
            )}
        </div>
      </div>

      <Card title="Scenario Comparison: Your Bank vs. Crown Money">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2">
            <div>
                <h3 className="text-lg font-bold text-center mb-2 text-[var(--chart-color-bank)]">Primary Home Loan</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-center">
                    <div className="font-bold">Metric</div>
                    <div className="font-bold">Bank</div>
                    <div className="col-span-2 my-1 border-b border-[var(--border-color)] print:border-gray-200"></div>
                    <div>Payoff Time</div>
                    <div>{formatYears(bankLoanCalculation.termInYears)}</div>
                    <div>Total Interest</div>
                    <div>{formatCurrency(bankLoanCalculation.totalInterest)}</div>
                    {people.map(p => <React.Fragment key={p.id}><div>{p.name} Debt Free</div><div>Age {isBankLoanValid ? Math.ceil(p.age + bankLoanCalculation.termInYears) : 'N/A'}</div></React.Fragment>)}
                </div>
            </div>
             <div>
                <h3 className="text-lg font-bold text-center mb-2 text-[var(--chart-color-crown)]">Primary Home Loan</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-center">
                    <div className="font-bold">Metric</div>
                    <div className="font-bold">Crown 🏆</div>
                    <div className="col-span-2 my-1 border-b border-[var(--border-color)] print:border-gray-200"></div>
                    <div>Payoff Time</div>
                    <div className="font-bold text-[var(--chart-color-crown)]">{formatYears(crownMoneyLoanCalculation.termInYears)}</div>
                    <div>Total Interest</div>
                    <div className="font-bold text-[var(--chart-color-crown)]">{formatCurrency(crownMoneyLoanCalculation.totalInterest)}</div>
                    {people.map(p => <React.Fragment key={p.id}><div>{p.name} Debt Free</div><div className="font-bold text-[var(--chart-color-crown)]">Age {isCrownLoanValid ? Math.ceil(p.age + crownMoneyLoanCalculation.termInYears) : 'N/A'}</div></React.Fragment>)}
                </div>
            </div>
        </div>
        {canCalculateInvestmentSavings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2 pt-6 mt-6 border-t border-[var(--border-color)] print:border-gray-300">
              <div>
                  <h3 className="text-lg font-bold text-center mb-2 text-[var(--chart-color-bank)]">Investment Properties</h3>
                   <div className="grid grid-cols-2 gap-2 text-sm text-center">
                      <div className="font-bold">Metric</div>
                      <div className="font-bold">Bank</div>
                      <div className="col-span-2 my-1 border-b border-[var(--border-color)] print:border-gray-200"></div>
                      <div>Payoff Time</div>
                      <div>{formatYears(investmentLoanCalculations.totalBankTerm)}</div>
                      <div>Total Interest</div>
                      <div>{formatCurrency(investmentLoanCalculations.totalBankInterest)}</div>
                  </div>
              </div>
              <div>
                  <h3 className="text-lg font-bold text-center mb-2 text-[var(--chart-color-crown)]">Investment Properties</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-center">
                      <div className="font-bold">Metric</div>
                      <div className="font-bold">Crown 🏆</div>
                      <div className="col-span-2 my-1 border-b border-[var(--border-color)] print:border-gray-200"></div>
                      <div>Payoff Time</div>
                      <div className="font-bold text-[var(--chart-color-crown)]">{formatYears(investmentLoanCalculations.totalCrownTerm)}</div>
                      <div>Total Interest</div>
                      <div className="font-bold text-[var(--chart-color-crown)]">{formatCurrency(investmentLoanCalculations.totalCrownInterest)}</div>
                  </div>
              </div>
          </div>
        )}
      </Card>

      <Card title="Income & Expense Details">
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8">
              <div>
                  <h4 className="font-semibold text-sm mb-2 text-[var(--text-color)] print:text-black">Incomes</h4>
                  {incomes.map(i => <SummaryItem key={i.id} label={i.name} value={`${formatCurrency(i.amount)} / ${i.frequency}`} />)}
              </div>
              <div>
                  <h4 className="font-semibold text-sm mb-2 text-[var(--text-color)] print:text-black">Expenses</h4>
                  {expenses.map(e => <SummaryItem key={e.id} label={e.name} value={`${formatCurrency(e.amount)} / ${e.frequency}`} />)}
              </div>
          </div>
      </Card>
       
    </div>
  );
};

export default React.memo(Tab5_Summary);
