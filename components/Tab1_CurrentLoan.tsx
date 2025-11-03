import React from 'react';
import { AppState, OtherDebt } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import EditableField from './common/EditableField';
import { UsersIcon, BanknotesIcon, ChartBarIcon, InfoIcon } from './common/IconComponents';
import Tooltip from './common/Tooltip';
import { calculatePIPayment } from '../hooks/useMortgageCalculations';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const OtherDebtsSection: React.FC<Props> = ({ appState, setAppState }) => {
    const { otherDebts } = appState;

    const handleDebtChange = (id: number, field: keyof OtherDebt, value: any) => {
        setAppState(prev => ({
            ...prev,
            otherDebts: prev.otherDebts.map(debt => debt.id === id ? { ...debt, [field]: value } : debt)
        }));
    };

    const addDebt = () => {
        const newDebt: OtherDebt = {
            id: Date.now(),
            name: 'Car Loan',
            amount: 25000,
            interestRate: 8.5,
            repayment: 500,
            frequency: 'monthly',
            remainingTerm: 5,
        };
        setAppState(prev => ({ ...prev, otherDebts: [...prev.otherDebts, newDebt] }));
    };

    const removeDebt = (id: number) => {
        setAppState(prev => ({ ...prev, otherDebts: prev.otherDebts.filter(debt => debt.id !== id) }));
    };

    const inputClasses = "w-full bg-[var(--input-bg-color)] p-2 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]";
    const selectClasses = `custom-select ${inputClasses}`;

    return (
        <Card title={
            <div className="flex items-center gap-2">
                <span>Other Debts (e.g., Car Loans, Credit Cards)</span>
                <Tooltip text="Add any other debts here. For the Bank scenario, these are paid off separately. For the Crown scenario, these debts are automatically consolidated into your primary home loan to be paid off aggressively.">
                    <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                </Tooltip>
            </div>
        }>
            <div className="space-y-4">
                {otherDebts.map(debt => (
                    <div key={debt.id} className="p-4 bg-black/10 dark:bg-white/5 rounded-lg relative space-y-4">
                        <button onClick={() => removeDebt(debt.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-2xl font-bold z-10">×</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Debt Name</label>
                                <input type="text" value={debt.name} onChange={e => handleDebtChange(debt.id, 'name', e.target.value)} className={inputClasses} placeholder="e.g., Car Loan"/>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Amount Owing</label>
                                <input type="number" value={debt.amount} onChange={e => handleDebtChange(debt.id, 'amount', parseFloat(e.target.value) || 0)} className={inputClasses} placeholder="Amount"/>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Interest Rate (%)</label>
                                <input type="number" value={debt.interestRate} onChange={e => handleDebtChange(debt.id, 'interestRate', parseFloat(e.target.value) || 0)} className={inputClasses}/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Remaining Term (Years)</label>
                                <input type="number" value={debt.remainingTerm} onChange={e => handleDebtChange(debt.id, 'remainingTerm', parseFloat(e.target.value) || 0)} className={inputClasses}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Repayment</label>
                                <input type="number" value={debt.repayment} onChange={e => handleDebtChange(debt.id, 'repayment', parseFloat(e.target.value) || 0)} className={inputClasses}/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Frequency</label>
                                <select value={debt.frequency} onChange={e => handleDebtChange(debt.id, 'frequency', e.target.value)} className={selectClasses}>
                                    <option value="weekly">Weekly</option>
                                    <option value="fortnightly">Fortnightly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
                <button onClick={addDebt} className="mt-2 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold">+ Add Debt</button>
            </div>
        </Card>
    );
};


const Tab1_CurrentLoan: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { loan, people } = appState;
  const { bankLoanCalculation } = calculations;

  const handleLoanChange = (field: keyof typeof loan, value: any) => {
    setAppState(prev => ({ ...prev, loan: { ...prev.loan, [field]: value } }));
  };

  const handlePersonChange = (index: number, field: keyof typeof people[0], value: any) => {
    const newPeople = [...people];
    const person = newPeople[index];
    
    let processedValue = value;
    if (field === 'age') {
        processedValue = parseInt(value, 10) || 0;
    }
    
    newPeople[index] = { ...person, [field]: processedValue };
    setAppState(prev => ({ ...prev, people: newPeople }));
  };

  const toggleBorrowers = () => {
    setAppState(prev => {
      if (prev.people.length > 1) {
        // Switch to one borrower
        return { ...prev, people: [prev.people[0]] };
      } else {
        // Switch to two borrowers
        const currentPeople = prev.people.length > 0 ? [...prev.people] : [{ id: 1, name: 'Person 1', age: 35 }];
        return {
          ...prev,
          people: [...currentPeople, { id: Date.now(), name: 'Person 2', age: 34 }]
        };
      }
    });
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const netLoanAmount = Math.max(0, loan.amount - (loan.offsetBalance || 0));
  const minPIRepayment = calculatePIPayment(netLoanAmount, loan.interestRate, 30, loan.frequency);

  const handleRepaymentBlur = () => {
    if (loan.repayment < minPIRepayment) {
      handleLoanChange('repayment', Math.ceil(minPIRepayment));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Left Column: Inputs */}
      <div className="flex flex-col gap-6">
        <Card title="Loan Details">
          <div className="space-y-6">
            <SliderInput label="Property Value" value={loan.propertyValue} onChange={val => handleLoanChange('propertyValue', val)} min={100000} max={4000000} step={10000} unit="$" />
            <SliderInput label="Loan Amount" value={loan.amount} onChange={val => handleLoanChange('amount', val)} min={50000} max={2000000} step={1000} unit="$" />
            <SliderInput label="Offset / Redraw / Savings Account Balance" value={loan.offsetBalance || 0} onChange={val => handleLoanChange('offsetBalance', val)} min={0} max={loan.amount} step={1000} unit="$" />
            <div className="text-right -mt-4 text-sm text-[var(--text-color-muted)] print:hidden flex items-center justify-end gap-1">
              <span>Net Loan Amount:</span>
              <span className="font-bold text-[var(--text-color)]">{formatCurrency(netLoanAmount)}</span>
              <Tooltip text="This is the actual amount you're paying interest on (Loan Amount - Offset Balance).">
                  <InfoIcon className="h-4 w-4"/>
              </Tooltip>
            </div>
            <SliderInput label="Interest Rate" value={loan.interestRate} onChange={val => handleLoanChange('interestRate', val)} min={1} max={15} step={0.05} unit="%" />
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-[var(--text-color)]">Repayments</label>
                <div className="hidden print:block text-sm text-black font-medium">
                    {formatCurrency(loan.repayment)} / {loan.frequency}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative flex-grow">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-color-muted)]">$</span>
                  <input 
                    type="number" 
                    value={loan.repayment} 
                    onChange={e => handleLoanChange('repayment', parseFloat(e.target.value) || 0)} 
                    onBlur={handleRepaymentBlur}
                    className="w-full bg-[var(--input-bg-color)] p-2 pl-7 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]" 
                  />
                </div>
                <select value={loan.frequency} onChange={e => handleLoanChange('frequency', e.target.value)} className="custom-select bg-[var(--input-bg-color)] p-2 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]">
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {loan.repayment < minPIRepayment && (
                <p className="text-xs text-yellow-400 mt-1 print:hidden">
                    Repayment is below the minimum for a 30-year term ({formatCurrency(Math.ceil(minPIRepayment))}). It will be adjusted.
                </p>
              )}
            </div>
          </div>
        </Card>
        <Card title="Borrowers">
          <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
            <span className={`text-sm font-medium transition-colors ${people.length === 1 ? 'text-[var(--text-color)]' : 'text-[var(--text-color-muted)]'}`}>One Borrower</span>
            <button
                onClick={toggleBorrowers}
                type="button"
                role="switch"
                aria-checked={people.length > 1}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--card-bg-color)] focus:ring-[var(--title-color)] ${
                    people.length > 1 ? 'bg-[var(--title-color)]' : 'bg-[var(--input-border-color)]'
                }`}
                aria-label="Toggle number of borrowers"
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        people.length > 1 ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
            <span className={`text-sm font-medium transition-colors ${people.length > 1 ? 'text-[var(--text-color)]' : 'text-[var(--text-color-muted)]'}`}>Two Borrowers</span>
          </div>
          <div className={`grid grid-cols-1 ${people.length > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
            {people.map((person, index) => (
              <div key={person.id} className="space-y-4 p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                <EditableField label="Name" value={person.name} onSave={val => handlePersonChange(index, 'name', val)} inputClassName="text-lg" />
                <SliderInput label="Age" value={person.age} onChange={val => handlePersonChange(index, 'age', val)} min={18} max={100} step={1} />
              </div>
            ))}
          </div>
        </Card>
        <OtherDebtsSection appState={appState} setAppState={setAppState} calculations={calculations} />
      </div>

      {/* Right Column: Outputs */}
      <div className="flex flex-col gap-6">
        <Card title="Loan Summary" className="border-indigo-500/30">
            {bankLoanCalculation.termInYears === Infinity ? (
                <div className="text-center text-yellow-400 p-4 bg-yellow-900/50 rounded-lg">
                    <p className="font-bold">Warning</p>
                    <p>Repayment amount is too low to cover interest. The loan will never be paid off with current settings.</p>
                </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg">
                        <ChartBarIcon className="h-8 w-8 mx-auto text-[var(--title-color)] mb-2"/>
                        <h4 className="text-sm text-[var(--text-color-muted)] print:text-gray-600">Loan Payoff Time</h4>
                        <p className="text-3xl font-bold text-[var(--text-color)] print:text-black">{bankLoanCalculation.termInYears.toFixed(1)}</p>
                        <p className="text-[var(--text-color-muted)] print:text-gray-600">Years</p>
                    </div>
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg">
                        <UsersIcon className="h-8 w-8 mx-auto text-[var(--title-color)] mb-2"/>
                        <div className='flex items-center justify-center gap-2'>
                           <h4 className="text-sm text-[var(--text-color-muted)] print:text-gray-600">Debt Free By Age</h4>
                           <Tooltip text="The calculated age of each borrower when the loan will be fully paid off based on the current settings.">
                                <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                           </Tooltip>
                        </div>
                        <div className="mt-1 space-y-1">
                          {people.map(p => (
                             <p key={p.id} className="text-xl font-bold text-[var(--text-color)] print:text-black">{p.name}: {Math.ceil(p.age + bankLoanCalculation.termInYears)}</p>
                          ))}
                        </div>
                    </div>
                    <div className="p-4 bg-black/10 dark:bg-white/5 rounded-lg col-span-1 sm:col-span-2">
                        <BanknotesIcon className="h-8 w-8 mx-auto text-[var(--title-color)] mb-2"/>
                        <div className='flex items-center justify-center gap-2'>
                          <h4 className="text-sm text-[var(--text-color-muted)] print:text-gray-600">Total Interest Paid</h4>
                          <Tooltip text="The total amount of interest paid to the bank over the entire life of the loan.">
                              <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                          </Tooltip>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-color)] print:text-black">{formatCurrency(bankLoanCalculation.totalInterest)}</p>
                        <hr className="my-2 border-[var(--border-color)] print:border-gray-300" />
                        <h4 className="text-sm text-[var(--text-color-muted)] print:text-gray-600">Total Repayments (Principal + Interest)</h4>
                        <p className="text-xl font-semibold text-[var(--text-color)] print:text-black">{formatCurrency(bankLoanCalculation.totalPaid)}</p>
                    </div>
                </div>
                <p className="text-xs text-center text-[var(--text-color-muted)] mt-4 italic print:hidden">
                  *Calculations are based on a standard principal and interest amortization formula using the loan details provided.
                </p>
              </>
            )}
        </Card>
      </div>
    </div>
  );
};

export default React.memo(Tab1_CurrentLoan);