
import React, { useState, useEffect } from 'react';
import { AppState, InvestmentProperty, InvestmentPropertyExpense, Frequency } from '../types';
import Card from './common/Card';
import SliderInput from './common/SliderInput';
import EditableField from './common/EditableField';
import Tooltip from './common/Tooltip';
import { InfoIcon, CalendarIcon, ArrowPathIcon } from './common/IconComponents';
import { calculatePIPayment, calculateIOPayment } from '../hooks/useMortgageCalculations';
import { useDebounce } from '../hooks/useDebounce';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
  setWarningToast: (message: string) => void;
}

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

const InvestmentPropertyCard: React.FC<{
    property: InvestmentProperty;
    onUpdate: (id: number, field: keyof InvestmentProperty, value: any) => void;
    onRemove: (id: number) => void;
    setWarningToast: (message: string) => void;
    displayScenario: 'bank' | 'crown';
}> = React.memo(({ property, onUpdate, onRemove, setWarningToast, displayScenario }) => {
    const [isStartDateFocused, setIsStartDateFocused] = React.useState(false);
    const [isPurchaseDateFocused, setIsPurchaseDateFocused] = React.useState(false);
    const [repaymentInput, setRepaymentInput] = useState(String(property.repayment));
    const [crownRepaymentInput, setCrownRepaymentInput] = useState(String(property.crownSettings?.repayment ?? property.repayment));

    const debouncedProperty = useDebounce(property, 500);

    const formatDateForDisplay = (isoDate: string | undefined): string => {
        if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
            return '';
        }
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleExpenseChange = (expId: number, field: keyof InvestmentPropertyExpense, value: any) => {
        const newExpenses = property.expenses.map(exp => 
            exp.id === expId ? { ...exp, [field]: value } : exp
        );
        onUpdate(property.id, 'expenses', newExpenses);
    };

    const addExpense = () => {
        const newExpense: InvestmentPropertyExpense = { id: Date.now(), name: 'New Expense', amount: 0, frequency: 'monthly' };
        onUpdate(property.id, 'expenses', [...property.expenses, newExpense]);
    };
    
    const removeExpense = (expId: number) => {
        const newExpenses = property.expenses.filter(exp => exp.id !== expId);
        onUpdate(property.id, 'expenses', newExpenses);
    };

    const getRemainingTerm = () => {
        const startDate = new Date(property.loanStartDate);
        const today = new Date();
         if (isNaN(startDate.getTime())) return property.loanTerm;

        const yearsElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return Math.max(0.1, property.loanTerm - yearsElapsed);
    };
    
    // --- Bank Calculators ---
    const handleCalculatePI = () => {
        const remainingTerm = getRemainingTerm();
        const netLoanAmount = Math.max(0, property.loanAmount - (property.offsetBalance || 0));
        const newRepayment = calculatePIPayment(netLoanAmount, property.interestRate, remainingTerm, property.repaymentFrequency);
        onUpdate(property.id, 'repayment', Math.round(newRepayment));
        onUpdate(property.id, 'loanType', 'P&I');
        onUpdate(property.id, 'interestOnlyTerm', 0);
    };

    const handleCalculateIO = () => {
        const netLoanAmount = Math.max(0, property.loanAmount - (property.offsetBalance || 0));
        const newRepayment = calculateIOPayment(netLoanAmount, property.interestRate, property.repaymentFrequency);
        onUpdate(property.id, 'repayment', Math.round(newRepayment));
        onUpdate(property.id, 'loanType', 'IO');
    };

    const handleRefreshRepayment = () => {
        if (property.loanType === 'IO') {
            handleCalculateIO();
        } else {
            handleCalculatePI();
        }
    };

    // --- Crown Calculators ---
    const updateCrownSettings = (field: keyof NonNullable<InvestmentProperty['crownSettings']>, value: any) => {
        const currentSettings = property.crownSettings || {
            loanType: property.loanType,
            repayment: property.repayment,
            interestOnlyTerm: property.interestOnlyTerm || 0,
            interestRate: property.interestRate,
            repaymentFrequency: property.repaymentFrequency
        };
        onUpdate(property.id, 'crownSettings', { ...currentSettings, [field]: value });
    };

    const handleCalculateCrownPI = () => {
        const remainingTerm = getRemainingTerm();
        const netLoanAmount = Math.max(0, property.loanAmount - (property.offsetBalance || 0));
        const crownRate = property.crownSettings?.interestRate ?? property.interestRate;
        const crownFreq = property.crownSettings?.repaymentFrequency ?? property.repaymentFrequency;
        const newRepayment = calculatePIPayment(netLoanAmount, crownRate, remainingTerm, crownFreq);
        
        const currentSettings = property.crownSettings || {
            interestRate: property.interestRate,
            interestOnlyTerm: 0,
            loanType: 'P&I',
            repayment: 0,
            repaymentFrequency: property.repaymentFrequency
        };
        
        onUpdate(property.id, 'crownSettings', {
            ...currentSettings,
            repayment: Math.round(newRepayment),
            loanType: 'P&I',
            interestOnlyTerm: 0
        });
        setCrownRepaymentInput(String(Math.round(newRepayment)));
    };

    const handleCalculateCrownIO = () => {
        const netLoanAmount = Math.max(0, property.loanAmount - (property.offsetBalance || 0));
        const crownRate = property.crownSettings?.interestRate ?? property.interestRate;
        const crownFreq = property.crownSettings?.repaymentFrequency ?? property.repaymentFrequency;
        const newRepayment = calculateIOPayment(netLoanAmount, crownRate, crownFreq);
        
        const currentSettings = property.crownSettings || {
            interestRate: property.interestRate,
            interestOnlyTerm: property.interestOnlyTerm || 5,
            loanType: 'IO',
            repayment: 0,
            repaymentFrequency: property.repaymentFrequency
        };

        onUpdate(property.id, 'crownSettings', {
            ...currentSettings,
            repayment: Math.round(newRepayment),
            loanType: 'IO'
        });
        setCrownRepaymentInput(String(Math.round(newRepayment)));
    };

    const handleRefreshCrownRepayment = () => {
        const currentType = property.crownSettings?.loanType ?? property.loanType;
        if (currentType === 'IO') {
            handleCalculateCrownIO();
        } else {
            handleCalculateCrownPI();
        }
    };

    const monthlyRental = getMonthlyFromAnyFrequency(property.rentalIncome, property.rentalIncomeFrequency);
    
    // Choose repayment based on scenario
    let monthlyRepayment = 0;
    if (displayScenario === 'crown') {
        const crownRate = property.crownSettings?.interestRate ?? property.interestRate;
        const netLoan = Math.max(0, property.loanAmount - (property.offsetBalance || 0));
        monthlyRepayment = calculateIOPayment(netLoan, crownRate, 'monthly');
    } else {
        monthlyRepayment = getMonthlyFromAnyFrequency(property.repayment, property.repaymentFrequency);
    }

    const monthlyExpenses = property.expenses.reduce((sum, exp) => sum + getMonthlyFromAnyFrequency(exp.amount, exp.frequency), 0);
    const netCashflow = monthlyRental - monthlyRepayment - monthlyExpenses;

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    // Sync inputs
    useEffect(() => {
        setRepaymentInput(String(property.repayment));
    }, [property.repayment]);

    useEffect(() => {
        setCrownRepaymentInput(String(property.crownSettings?.repayment ?? property.repayment));
    }, [property.crownSettings?.repayment, property.repayment]);

    // Ensure crown settings exist and default to IO
    useEffect(() => {
        if (!property.crownSettings) {
            const netLoanAmount = Math.max(0, property.loanAmount - (property.offsetBalance || 0));
            const ioRepayment = calculateIOPayment(netLoanAmount, property.interestRate, property.repaymentFrequency);
            
            onUpdate(property.id, 'crownSettings', {
                loanType: 'IO',
                repayment: Math.round(ioRepayment),
                interestOnlyTerm: property.loanTerm,
                interestRate: property.interestRate,
                repaymentFrequency: property.repaymentFrequency
            });
        }
    }, []); // Run once on mount

    const handleRepaymentBlur = () => {
        const numericValue = parseFloat(repaymentInput);
        if (repaymentInput.trim() === '' || isNaN(numericValue)) {
            setRepaymentInput(String(property.repayment));
            return;
        }
        onUpdate(property.id, 'repayment', numericValue);
    };

    const handleCrownRepaymentBlur = () => {
        const numericValue = parseFloat(crownRepaymentInput);
        if (crownRepaymentInput.trim() === '' || isNaN(numericValue)) {
            setCrownRepaymentInput(String(property.crownSettings?.repayment ?? property.repayment));
            return;
        }
        updateCrownSettings('repayment', numericValue);
    };
    
    const titleClasses = "text-lg font-bold text-[var(--title-color)]";
    const inputClasses = "w-full bg-[var(--input-bg-color)] p-2 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]";
    const selectClasses = `custom-select ${inputClasses}`;

    const crownSettings = property.crownSettings || { loanType: property.loanType, repayment: property.repayment, interestOnlyTerm: property.interestOnlyTerm || 0, interestRate: property.interestRate, repaymentFrequency: property.repaymentFrequency };

    return (
        <Card className="mb-6">
            <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-grow">
                     <EditableField 
                        label="Property Address" 
                        value={property.address} 
                        onSave={(val) => onUpdate(property.id, 'address', val)} 
                        inputClassName={titleClasses}
                        valueClassName={titleClasses}
                     />
                </div>
                <div className="flex-shrink-0 flex items-center gap-4 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer print:hidden">
                        <input
                            type="checkbox"
                            checked={property.isFuture || false}
                            onChange={e => onUpdate(property.id, 'isFuture', e.target.checked)}
                            className="h-4 w-4 rounded accent-[var(--input-border-focus-color)]"
                        />
                        <span className="text-sm font-medium text-[var(--text-color-muted)] whitespace-nowrap">Future Purchase?</span>
                    </label>
                    <button onClick={() => onRemove(property.id)} className="text-red-400 hover:text-red-600 text-2xl font-bold z-10 print:hidden leading-none -translate-y-1">×</button>
                </div>
            </div>

            {/* Common Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-black/5 dark:bg-white/5 rounded-lg">
                 <div>
                    <SliderInput label="Property Value" value={property.propertyValue} onChange={val => onUpdate(property.id, 'propertyValue', val)} min={100000} max={3000000} step={10000} unit="$" />
                 </div>
                 <div>
                    <SliderInput label="Loan Amount" value={property.loanAmount} onChange={val => onUpdate(property.id, 'loanAmount', val)} min={0} max={3000000} step={10000} unit="$" />
                 </div>
                 <div>
                    <SliderInput label="Offset Balance" value={property.offsetBalance || 0} onChange={val => onUpdate(property.id, 'offsetBalance', val)} min={0} max={property.loanAmount} step={1000} unit="$" />
                 </div>
            </div>

            {/* Split Loan Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                {/* Bank / Current Column */}
                <div className="space-y-6 p-4 border border-[var(--border-color)] rounded-lg relative">
                    <div className="absolute top-0 left-0 bg-[var(--card-bg-color)] px-2 -mt-3 ml-2 text-sm font-bold text-[var(--text-color-muted)]">Current / Bank Loan Details</div>
                    
                    {property.isFuture && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Target Purchase Date</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <CalendarIcon className="h-5 w-5 text-[var(--text-color-muted)]" />
                                </div>
                                <input
                                    type={isPurchaseDateFocused ? 'date' : 'text'}
                                    value={isPurchaseDateFocused ? property.purchaseDate : formatDateForDisplay(property.purchaseDate)}
                                    onFocus={() => setIsPurchaseDateFocused(true)}
                                    onBlur={() => setIsPurchaseDateFocused(false)}
                                    onChange={e => onUpdate(property.id, 'purchaseDate', e.target.value)}
                                    placeholder="DD/MM/YYYY"
                                    className={`${inputClasses} custom-date-input pl-10`}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <div className='flex items-center gap-1 mb-1'>
                            <label className="block text-sm font-medium text-[var(--text-color)]">Bank Interest Rate</label>
                            <Tooltip text="The interest rate currently offered by your bank for this investment property.">
                                <InfoIcon className="h-3 w-3 text-[var(--text-color-muted)]"/>
                            </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="15"
                                step="0.05"
                                value={property.interestRate}
                                onChange={(e) => onUpdate(property.id, 'interestRate', parseFloat(e.target.value))}
                                className="w-full h-2 bg-[var(--slider-track-color)] rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: 'var(--input-border-focus-color)' }}
                            />
                            <div className="w-24 relative">
                                <input
                                    type="number"
                                    value={property.interestRate}
                                    onChange={(e) => onUpdate(property.id, 'interestRate', parseFloat(e.target.value))}
                                    className={`${inputClasses} text-right pr-6`}
                                />
                                <span className="absolute inset-y-0 right-2 flex items-center text-[var(--text-color-muted)] pointer-events-none">%</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Loan Term (Years)</label>
                        <input
                            type="number"
                            value={property.loanTerm}
                            onChange={e => onUpdate(property.id, 'loanTerm', parseInt(e.target.value) || 0)}
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Loan Start Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <CalendarIcon className="h-5 w-5 text-[var(--text-color-muted)]" />
                            </div>
                            <input
                                type={isStartDateFocused ? 'date' : 'text'}
                                value={isStartDateFocused ? property.loanStartDate : formatDateForDisplay(property.loanStartDate)}
                                onFocus={() => setIsStartDateFocused(true)}
                                onBlur={() => setIsStartDateFocused(false)}
                                onChange={e => onUpdate(property.id, 'loanStartDate', e.target.value)}
                                placeholder="DD/MM/YYYY"
                                className={`${inputClasses} custom-date-input pl-10`}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-[var(--text-color)]">Current Repayments</label>
                            <button 
                                onClick={handleRefreshRepayment}
                                className="flex items-center gap-1 text-[10px] font-bold text-[var(--title-color)] hover:underline uppercase tracking-tight"
                            >
                                <ArrowPathIcon className="h-3 w-3" />
                                Recalculate
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-color-muted)]">$</span>
                                <input 
                                    type="text" 
                                    value={repaymentInput} 
                                    onChange={e => setRepaymentInput(e.target.value.replace(/[^0-9]/g, ''))}
                                    onBlur={handleRepaymentBlur}
                                    className={`${inputClasses} pl-7`} 
                                />
                            </div>
                            <select value={property.repaymentFrequency} onChange={e => onUpdate(property.id, 'repaymentFrequency', e.target.value)} className={selectClasses}>
                                <option value="weekly">Weekly</option>
                                <option value="fortnightly">Fortnightly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </div>
                         <div className="mt-2 flex gap-2">
                            <button
                                onClick={handleCalculateIO}
                                className={`w-full p-2 text-xs rounded-md font-semibold transition-colors border ${property.loanType === 'IO' ? 'bg-gray-600 text-white border-gray-600 shadow-md' : 'bg-transparent text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Set to Interest Only
                            </button>
                            <button
                                onClick={handleCalculatePI}
                                className={`w-full p-2 text-xs rounded-md font-semibold transition-colors border ${property.loanType === 'P&I' ? 'bg-gray-600 text-white border-gray-600 shadow-md' : 'bg-transparent text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Set to P & I
                            </button>
                        </div>
                    </div>
                     {property.loanType === 'IO' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Interest Only Term (Years)</label>
                            <input
                                type="number"
                                value={property.interestOnlyTerm || 0}
                                onChange={e => onUpdate(property.id, 'interestOnlyTerm', parseInt(e.target.value) || 0)}
                                className={inputClasses}
                                min={0}
                                max={property.loanTerm}
                            />
                        </div>
                    )}
                </div>

                {/* Crown Strategy Column */}
                <div className="space-y-6 p-4 border border-[var(--title-color)]/50 bg-[var(--title-color)]/5 rounded-lg relative">
                    <div className="absolute top-0 left-0 bg-[var(--card-bg-color)] px-2 -mt-3 ml-2 text-sm font-bold text-[var(--title-color)] flex items-center gap-1">Crown Money Strategy 🏆</div>
                    
                    <div className="mt-2">
                        <div className='flex items-center gap-1 mb-1'>
                            <label className="block text-sm font-medium text-[var(--title-color)]">Crown Interest Rate</label>
                            <Tooltip text="The interest rate you could achieve with the Crown Money strategy. Defaults to the Bank rate unless changed.">
                                <InfoIcon className="h-3 w-3 text-[var(--title-color)]"/>
                            </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="15"
                                step="0.05"
                                value={crownSettings.interestRate ?? property.interestRate}
                                onChange={(e) => updateCrownSettings('interestRate', parseFloat(e.target.value))}
                                className="w-full h-2 bg-[var(--slider-track-color)] rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: 'var(--title-color)' }}
                            />
                            <div className="w-24 relative">
                                <input
                                    type="number"
                                    value={crownSettings.interestRate ?? property.interestRate}
                                    onChange={(e) => updateCrownSettings('interestRate', parseFloat(e.target.value))}
                                    className={`${inputClasses} text-right pr-6 border-[var(--title-color)]/30 focus:border-[var(--title-color)]`}
                                />
                                <span className="absolute inset-y-0 right-2 flex items-center text-[var(--text-color-muted)] pointer-events-none">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-[var(--title-color)]">Target Repayments</label>
                            <button 
                                onClick={handleRefreshCrownRepayment}
                                className="flex items-center gap-1 text-[10px] font-bold text-[var(--title-color)] hover:underline uppercase tracking-tight"
                            >
                                <ArrowPathIcon className="h-3 w-3" />
                                Recalculate
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-color-muted)]">$</span>
                                <input 
                                    type="text" 
                                    value={crownRepaymentInput} 
                                    onChange={e => setCrownRepaymentInput(e.target.value.replace(/[^0-9]/g, ''))}
                                    onBlur={handleCrownRepaymentBlur}
                                    className={`${inputClasses} pl-7 border-[var(--title-color)]/30 focus:border-[var(--title-color)]`} 
                                />
                            </div>
                            <select 
                                value={crownSettings.repaymentFrequency || property.repaymentFrequency} 
                                onChange={e => updateCrownSettings('repaymentFrequency', e.target.value)}
                                className={`${selectClasses} w-32 border-[var(--title-color)]/30 focus:border-[var(--title-color)]`}
                            >
                                <option value="weekly">Weekly</option>
                                <option value="fortnightly">Fortnightly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </div>
                         <div className="mt-2 flex gap-2">
                            <button
                                onClick={handleCalculateCrownIO}
                                className={`w-full p-2 text-xs rounded-md font-semibold transition-colors border ${crownSettings.loanType === 'IO' ? 'bg-[var(--title-color)] text-white border-[var(--title-color)] shadow-md' : 'bg-transparent text-[var(--title-color)] border-[var(--title-color)]/30 hover:bg-[var(--title-color)]/10'}`}
                            >
                                Set to Interest Only
                            </button>
                            <button
                                onClick={handleCalculateCrownPI}
                                className={`w-full p-2 text-xs rounded-md font-semibold transition-colors border ${crownSettings.loanType === 'P&I' ? 'bg-[var(--title-color)] text-white border-[var(--title-color)] shadow-md' : 'bg-transparent text-[var(--title-color)] border-[var(--title-color)]/30 hover:bg-[var(--title-color)]/10'}`}
                            >
                                Set to P & I
                            </button>
                        </div>
                    </div>
                     {crownSettings.loanType === 'IO' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--title-color)] mb-1">Interest Only Term (Years)</label>
                            <input
                                type="number"
                                value={crownSettings.interestOnlyTerm || 0}
                                onChange={e => updateCrownSettings('interestOnlyTerm', parseInt(e.target.value) || 0)}
                                className={`${inputClasses} border-[var(--title-color)]/30 focus:border-[var(--title-color)]`}
                                min={0}
                                max={property.loanTerm}
                            />
                        </div>
                    )}
                    <div className="p-3 bg-[var(--input-bg-color)] rounded text-xs text-[var(--title-color)] font-semibold border border-[var(--title-color)]/20 italic">
                        Crown strategy uses Interest Only (IO) on investments to maximize debt-reduction firepower for your primary home.
                    </div>
                </div>
            </div>

            {/* Income & Expenses */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Rental Income</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-color-muted)]">$</span>
                                <input type="number" value={property.rentalIncome} onChange={e => onUpdate(property.id, 'rentalIncome', parseFloat(e.target.value))} className={`${inputClasses} pl-7`} />
                            </div>
                            <select value={property.rentalIncomeFrequency} onChange={e => onUpdate(property.id, 'rentalIncomeFrequency', e.target.value)} className={selectClasses}>
                                <option value="weekly">Weekly</option>
                                <option value="fortnightly">Fortnightly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-color)] mb-1">Annual Rental Growth</label>
                        <div className="relative">
                             <input type="number" value={property.rentalGrowthRate || 0} onChange={e => onUpdate(property.id, 'rentalGrowthRate', parseFloat(e.target.value))} className={`${inputClasses} pr-8`} />
                             <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-color-muted)]">%</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium text-[var(--text-color)]">Expenses</label>
                        <Tooltip text="Enter all known expenses for this property.">
                            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                        </Tooltip>
                    </div>
                    <div className="space-y-2">
                        {property.expenses.map(exp => (
                            <div key={exp.id} className="flex items-center gap-2">
                                <input type="text" value={exp.name} onChange={e => handleExpenseChange(exp.id, 'name', e.target.value)} className={`flex-grow ${inputClasses}`} placeholder="Expense Name"/>
                                <div className="relative w-36">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-color-muted)]">$</span>
                                    <input type="number" value={exp.amount} onChange={e => handleExpenseChange(exp.id, 'amount', parseFloat(e.target.value) || 0)} className={`${inputClasses} w-full pl-7`} placeholder="Amount"/>
                                </div>
                                <select value={exp.frequency} onChange={e => handleExpenseChange(exp.id, 'frequency', e.target.value)} className={`${selectClasses} w-32`}>
                                    <option value="weekly">Weekly</option>
                                    <option value="fortnightly">Fortnightly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                </select>
                                <button onClick={() => removeExpense(exp.id)} className="text-red-400 hover:text-red-600 font-bold text-lg">×</button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addExpense} className="mt-2 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold">+ Add Expense</button>
                </div>

                <div className={`p-4 rounded-lg border ${netCashflow >= 0 ? 'border-[var(--color-positive-text)]' : 'border-[var(--color-negative-text)]'}`} style={{ backgroundColor: netCashflow >= 0 ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)' }}>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-lg" style={{ color: netCashflow >= 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>Net Monthly Cashflow ({displayScenario === 'crown' ? 'Strategy (Optimized IO)' : 'Current Situation'})</span>
                        <span className="font-extrabold text-2xl" style={{ color: netCashflow >= 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>{formatCurrency(netCashflow)}</span>
                    </div>
                    <div className="mt-3 text-xs space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                        <div className="flex justify-between items-center text-[var(--text-color-muted)]">
                            <span>Rental Income (Monthly):</span>
                            <span className="text-[var(--color-positive-text)] font-medium">+{formatCurrency(monthlyRental)}</span>
                        </div>
                         <div className="flex justify-between items-center text-[var(--text-color-muted)]">
                            <span>{displayScenario === 'crown' ? 'Optimized Repayments (IO)' : 'Current Repayments'} (Monthly):</span>
                            <span className="text-[var(--color-negative-text)] font-medium">-{formatCurrency(monthlyRepayment)}</span>
                        </div>
                         <div className="flex justify-between items-center text-[var(--text-color-muted)]">
                            <span>Total Expenses (Monthly):</span>
                            <span className="text-[var(--color-negative-text)] font-medium">-{formatCurrency(monthlyExpenses)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
});


const Tab_InvestmentProperties: React.FC<Props> = ({ appState, setAppState, calculations, setWarningToast }) => {
    const { investmentCashflowScenario = 'crown' } = appState;

    const handleAddProperty = () => {
        const today = new Date().toISOString().split('T')[0];
        
        const propDefaults = {
            propertyValue: 500000,
            loanAmount: 400000,
            offsetBalance: 0,
            loanType: 'IO' as 'P&I' | 'IO',
            interestRate: 6.5,
            loanTerm: 30,
            repaymentFrequency: 'monthly' as Frequency,
        };
        
        const netLoanAmount = Math.max(0, propDefaults.loanAmount - (propDefaults.offsetBalance || 0));
        const ioRepayment = calculateIOPayment(netLoanAmount, propDefaults.interestRate, propDefaults.repaymentFrequency);

        const newProperty: InvestmentProperty = {
            id: Date.now(),
            address: 'New Property',
            ...propDefaults,
            loanStartDate: today,
            repayment: Math.ceil(ioRepayment),
            interestOnlyTerm: 5,
            rentalIncome: 500,
            rentalIncomeFrequency: 'weekly',
            isFuture: false,
            purchaseDate: today,
            rentalGrowthRate: 3.5,
            crownSettings: {
                loanType: 'IO',
                repayment: Math.ceil(ioRepayment),
                interestOnlyTerm: 30,
                interestRate: 6.5,
                repaymentFrequency: 'monthly'
            },
            expenses: [
                { id: 1, name: 'Rates', amount: 500, frequency: 'quarterly' },
                { id: 2, name: 'Body Corp / Strata', amount: 600, frequency: 'quarterly' },
                { id: 3, name: 'Insurance', amount: 1200, frequency: 'annually' },
                { id: 4, name: 'Real Estate Fees', amount: 200, frequency: 'monthly' },
                { id: 5, name: 'Maintenance Expense', amount: 1000, frequency: 'annually' },
            ],
        };
        setAppState(prev => ({...prev, investmentProperties: [...prev.investmentProperties, newProperty]}));
    };

    const handleRemoveProperty = (id: number) => {
        setAppState(prev => ({
            ...prev,
            investmentProperties: prev.investmentProperties.filter(p => p.id !== id)
        }));
    };

    const handlePropertyUpdate = (id: number, field: keyof InvestmentProperty, value: any) => {
        setAppState(prev => ({
            ...prev,
            investmentProperties: prev.investmentProperties.map(p => 
                p.id === id ? { ...p, [field]: value } : p
            )
        }));
    };

    const { bankInvestmentNetCashflow, crownInvestmentNetCashflow } = calculations;
    const activeCashflow = investmentCashflowScenario === 'crown' ? crownInvestmentNetCashflow : bankInvestmentNetCashflow;
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-[var(--card-bg-color)] p-4 rounded-xl border border-[var(--border-color)] gap-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[var(--title-color)]">Cashflow Analysis Scenario:</h3>
                    <Tooltip text="Switch between viewing cashflow based on current Bank settings or proposed Crown Money Strategy settings (always optimized with Interest Only at the Crown Rate).">
                        <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
                    </Tooltip>
                </div>
                <div className="flex bg-gray-100 dark:bg-black/20 p-1.5 rounded-xl border border-[var(--border-color)] shadow-inner">
                    <button 
                        onClick={() => setAppState(prev => ({...prev, investmentCashflowScenario: 'crown'}))}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${investmentCashflowScenario === 'crown' ? 'bg-[var(--title-color)] text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-[var(--title-color)]'}`}
                    >
                        Strategy (Optimized) 🏆
                    </button>
                    <button 
                        onClick={() => setAppState(prev => ({...prev, investmentCashflowScenario: 'bank'}))}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${investmentCashflowScenario === 'bank' ? 'bg-gray-500 text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Current / Bank
                    </button>
                </div>
            </div>

            {appState.investmentProperties.map(prop => (
                <InvestmentPropertyCard
                    key={prop.id}
                    property={prop}
                    onUpdate={handlePropertyUpdate}
                    onRemove={handleRemoveProperty}
                    setWarningToast={setWarningToast}
                    displayScenario={investmentCashflowScenario}
                />
            ))}

            <div className="flex flex-col items-center gap-6">
                <button onClick={handleAddProperty} className="w-full md:w-1/2 p-3 bg-[var(--button-bg-color)] text-white rounded-md font-semibold hover:bg-[var(--button-bg-hover-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-color)] focus:ring-[var(--button-bg-color)]">
                    + Add Investment Property
                </button>

                {appState.investmentProperties.length > 0 && (
                    <Card title="Total Investment Summary" className="w-full">
                        <div className={`p-4 rounded-lg border ${activeCashflow >= 0 ? 'border-[var(--color-positive-text)]' : 'border-[var(--color-negative-text)]'}`} style={{ backgroundColor: activeCashflow >= 0 ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)' }}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xl" style={{ color: activeCashflow >= 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>Total Net Monthly Cashflow ({investmentCashflowScenario === 'crown' ? 'Strategy Optimized IO' : 'Current Bank'})</span>
                                    <Tooltip text="This is the combined cashflow from all investment properties. The Crown scenario assumes Interest Only payments to maximize your primary home loan payoff speed.">
                                        <InfoIcon className="h-5 w-5 text-[var(--text-color-muted)]"/>
                                    </Tooltip>
                                </div>
                                <span className="font-extrabold text-3xl" style={{ color: activeCashflow >= 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>{formatCurrency(activeCashflow)}</span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default React.memo(Tab_InvestmentProperties);
