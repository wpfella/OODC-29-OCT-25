
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, IncomeItem, ExpenseItem, FutureChange, FutureLumpSum, LoanDetails, LoanSummary } from '../types';
import Card from './common/Card';
import Tooltip from './common/Tooltip';
import { InfoIcon, CalendarIcon } from './common/IconComponents';
import { calculateAmortization } from '../hooks/useMortgageCalculations';

const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return '';
    }
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

// --- New Component for FutureChange Impact Analysis ---
const FutureChangeImpactDisplay: React.FC<{
    appState: AppState;
    futureChange: FutureChange;
    calculations: any;
}> = React.memo(({ appState, futureChange, calculations }) => {
    const [showExplanation, setShowExplanation] = useState(false);
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    const formatYears = (value: number) => {
        if (!isFinite(value) || isNaN(value)) return 'N/A';
        return `${value.toFixed(1)} years`;
    };

    const impact = useMemo(() => {
        if (!futureChange.startDate || futureChange.changeAmount === 0 || !futureChange.description) {
            return { bankText: '', crownText: '', isCalculable: false };
        }

        const { loan, futureChanges, futureLumpSums, crownMoneyInterestRate, otherDebts } = appState;
        const { crownSurplus } = calculations; // Uses Crown Surplus

        // The "impacted" calculation is the main one from the app, which includes everything.
        const crownImpactedCalc = calculations.crownMoneyLoanCalculation;

        // To get the "baseline", we manually calculate the scenario WITHOUT this specific future change.
        const baselineFutureChanges = futureChanges.filter(c => c.id !== futureChange.id);

        const consolidatedAmount = otherDebts.reduce((sum, d) => sum + d.amount, 0);
        const crownLoanForCalc = {
            amount: (loan.amount + consolidatedAmount) - (loan.offsetBalance || 0),
            interestRate: crownMoneyInterestRate,
            repayment: crownSurplus,
            frequency: 'monthly' as const,
            offsetBalance: 0,
        };

        const crownBaselineCalc = calculateAmortization(crownLoanForCalc, {
            futureChanges: baselineFutureChanges,
            futureLumpSums: futureLumpSums,
            strategy: 'crown'
        });

        if (crownBaselineCalc.termInYears === Infinity || crownImpactedCalc.termInYears === Infinity) {
            return { bankText: 'Impact cannot be calculated (loan may not be payable).', crownText: '', isCalculable: false };
        }

        const createImpactText = (baseline: LoanSummary, impacted: LoanSummary, scenario: string) => {
            const termDiff = baseline.termInYears - impacted.termInYears;
            const interestDiff = baseline.totalInterest - impacted.totalInterest;

            if (Math.abs(termDiff) < 1/24 && Math.abs(interestDiff) < 100) {
                return `No significant impact for ${scenario}.`;
            }

            const termText = termDiff > 0 ? `saves ${formatYears(termDiff)}` : `adds ${formatYears(Math.abs(termDiff))}`;
            const interestText = interestDiff > 0 ? `saves ${formatCurrency(interestDiff)}` : `costs ${formatCurrency(Math.abs(interestDiff))}`;

            return `${scenario}: ${termText} & ${interestText}.`;
        };

        const bankText = "Bank: No significant impact."; // Hardcoded as bank scenario is unaffected by surplus changes.
        const crownText = createImpactText(crownBaselineCalc, crownImpactedCalc, "Crown");
        
        return { bankText, crownText, isCalculable: true };

    }, [appState, futureChange, calculations]);
    
    if (!impact.isCalculable) return null;

    // Determine if the change is positive (more surplus) or negative (less surplus)
    // Increase Income -> Positive
    // Decrease Expense -> Positive
    // Decrease Income -> Negative
    // Increase Expense -> Negative
    const isIncreaseAction = futureChange.changeAmount >= 0;
    const isPositiveChange = (futureChange.type === 'income' && isIncreaseAction) || (futureChange.type === 'expense' && !isIncreaseAction);

    const color = isPositiveChange ? 'var(--color-positive-text)' : 'var(--color-negative-text)';
    const bgColor = isPositiveChange ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)';

    return (
        <div className="mt-2 p-3 text-left rounded-lg text-sm" style={{ backgroundColor: bgColor }}>
            <p className="font-bold text-center mb-2" style={{ color }}>Impact Analysis</p>
            <ul className="space-y-1 text-xs">
                <li style={{ color }}>{impact.bankText}</li>
                <li style={{ color }}>{impact.crownText}</li>
            </ul>
            <button 
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs text-center w-full mt-2 font-semibold underline decoration-dotted"
                style={{ color }}
            >
                {showExplanation ? 'Hide Explanation' : 'Why are the impacts different?'}
            </button>
            {showExplanation && (
                <div className="mt-2 text-xs border-t pt-2 space-y-2" style={{ borderColor: `${color}80`, color }}>
                    <p className="font-bold">Why the Bank Scenario is unaffected:</p>
                    <p className="mt-1">
                        The Bank scenario assumes you continue to make only your standard, fixed repayments. Any extra income or expenses are handled separately and do not automatically affect the loan.
                    </p>
                    <p className="font-bold mt-2">Why the Crown Money Scenario changes:</p>
                    <p className="mt-1">
                        The Crown strategy uses your <strong>entire</strong> budget surplus to aggressively pay down debt. Any change to your income or expenses directly alters your monthly surplus, which in turn changes the repayment amount. This has a powerful and direct effect on how quickly you pay off the loan and how much interest you save.
                    </p>
                </div>
            )}
        </div>
    );
});


// --- Extracted Component for Future Changes ---
interface FutureChangesSectionProps {
    futureChanges: FutureChange[];
    incomes: IncomeItem[];
    expenses: ExpenseItem[];
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    appState: AppState;
    calculations: any;
}

const FutureChangesSection: React.FC<FutureChangesSectionProps> = React.memo(({ futureChanges, incomes, expenses, setAppState, appState, calculations }) => {
    const [customEvent, setCustomEvent] = useState<Record<number, boolean>>({});
    const [focusedDateField, setFocusedDateField] = useState<string | null>(null);

    useEffect(() => {
        const allItems = new Set([...incomes.map(i => i.name), ...expenses.map(e => e.name)]);
        const initialCustomState = futureChanges.reduce((acc, change) => {
            if (!allItems.has(change.description)) {
                acc[change.id] = true;
            } else {
                acc[change.id] = false;
            }
            return acc;
        }, {} as Record<number, boolean>);
        setCustomEvent(initialCustomState);
    }, [futureChanges, incomes, expenses]);

    const handleListChange = (index: number, field: keyof FutureChange, value: any) => {
        setAppState(prev => {
            const newList = [...prev.futureChanges];
            const item = newList[index];
            let processedValue = value;
            if (field === 'isPermanent') {
                processedValue = Boolean(value);
            }
            newList[index] = { ...item, [field]: processedValue };
            return { ...prev, futureChanges: newList };
        });
    };

    const removeListItem = (id: number) => {
        setAppState(prev => ({
            ...prev,
            futureChanges: prev.futureChanges.filter(item => item.id !== id)
        }));
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
        const value = e.target.value;
        const isCustom = value === 'custom';

        setCustomEvent(prev => ({ ...prev, [futureChanges[index].id]: isCustom }));

        if (isCustom) {
            handleListChange(index, 'description', '');
        } else {
            const [type, name] = value.split(':');
            const newDescription = name || '';
            const newType = (type === 'income' || type === 'expense') ? type : 'expense';

            setAppState(prev => {
                const newList = [...prev.futureChanges];
                newList[index] = { ...newList[index], description: newDescription, type: newType };
                return { ...prev, futureChanges: newList };
            });
        }
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    
    const inputClasses = "w-full bg-[var(--input-bg-color)] p-2 rounded border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]";
    const selectClasses = `custom-select ${inputClasses}`;

    return (
        <div className="space-y-4">
            <p className="text-sm text-[var(--text-color-muted)] mb-4 -mt-2 print:hidden">
                Plan for known, ongoing changes to your budget. For example: a pay rise, a child's daycare fees stopping, or a temporary change in income. This helps create a more accurate long-term forecast.
            </p>
            {futureChanges.map((change, index) => {
                const startDateKey = `start-${change.id}`;
                const isStartDateFocused = focusedDateField === startDateKey;
                
                const endDateKey = `end-${change.id}`;
                const isEndDateFocused = focusedDateField === endDateKey;

                return (
                    <div key={change.id} className="p-4 bg-black/10 dark:bg-white/5 rounded-lg relative space-y-4 print:hidden">
                        <button onClick={() => removeListItem(change.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-2xl font-bold z-10">×</button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Description</label>
                                <select
                                    value={customEvent[change.id] ? 'custom' : `${change.type}:${change.description}`}
                                    onChange={e => handleDescriptionChange(e, index)}
                                    className={selectClasses}
                                >
                                    <option value="" disabled>Select or create an event...</option>
                                    <optgroup label="Incomes">
                                        {incomes.map(i => <option key={`inc-${i.id}`} value={`income:${i.name}`}>{i.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Expenses">
                                        {expenses.map(e => <option key={`exp-${e.id}`} value={`expense:${e.name}`}>{e.name}</option>)}
                                    </optgroup>
                                    <option value="custom">— New Custom Event —</option>
                                </select>
                            </div>
                            {customEvent[change.id] && (
                                 <div>
                                    <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Custom Description</label>
                                    <input
                                        type="text"
                                        value={change.description}
                                        onChange={e => handleListChange(index, 'description', e.target.value)}
                                        className={inputClasses}
                                        placeholder="e.g. New Side Hustle"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Type</label>
                                <select
                                    value={change.type}
                                    onChange={e => handleListChange(index, 'type', e.target.value)}
                                    className={selectClasses}
                                    disabled={!customEvent[change.id]}
                                >
                                    <option value="income">Income</option>
                                    <option value="expense">Expense</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Action</label>
                                <select
                                    value={change.changeAmount >= 0 ? 'increase' : 'decrease'}
                                    onChange={e => {
                                        const newSign = e.target.value === 'increase' ? 1 : -1;
                                        const currentAmount = Math.abs(change.changeAmount);
                                        handleListChange(index, 'changeAmount', currentAmount * newSign);
                                    }}
                                    className={selectClasses}
                                >
                                    <option value="increase">Starts / Increases</option>
                                    <option value="decrease">Stops / Decreases</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">By Amount</label>
                                <input
                                    type="number"
                                    value={Math.abs(change.changeAmount)}
                                    onChange={e => {
                                        const newAmount = parseFloat(e.target.value) || 0;
                                        const sign = change.changeAmount >= 0 ? 1 : -1;
                                        handleListChange(index, 'changeAmount', newAmount * sign);
                                    }}
                                    className={inputClasses}
                                    placeholder="e.g., 800"
                                    min="0"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Frequency</label>
                                <select
                                    value={change.frequency}
                                    onChange={e => handleListChange(index, 'frequency', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="fortnightly">Fortnightly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                             <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Start Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <CalendarIcon className="h-5 w-5 text-[var(--text-color-muted)]" />
                                    </div>
                                    <input
                                        type={isStartDateFocused ? 'date' : 'text'}
                                        value={isStartDateFocused ? change.startDate : formatDateForDisplay(change.startDate)}
                                        onFocus={() => setFocusedDateField(startDateKey)}
                                        onBlur={() => setFocusedDateField(null)}
                                        onChange={e => handleListChange(index, 'startDate', e.target.value)}
                                        placeholder="DD/MM/YYYY"
                                        className={`${inputClasses} custom-date-input pl-10`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">End Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <CalendarIcon className="h-5 w-5 text-[var(--text-color-muted)]" />
                                    </div>
                                    <input
                                        type={isEndDateFocused ? 'date' : 'text'}
                                        value={isEndDateFocused ? change.endDate : formatDateForDisplay(change.endDate)}
                                        onFocus={() => setFocusedDateField(endDateKey)}
                                        onBlur={() => setFocusedDateField(null)}
                                        onChange={e => handleListChange(index, 'endDate', e.target.value)}
                                        placeholder="DD/MM/YYYY"
                                        className={`${inputClasses} custom-date-input pl-10 disabled:opacity-50`}
                                        disabled={change.isPermanent}
                                    />
                                </div>
                            </div>
                            <div className="pt-5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={change.isPermanent}
                                        onChange={e => handleListChange(index, 'isPermanent', e.target.checked)}
                                        className="h-4 w-4 rounded accent-[var(--input-border-focus-color)]"
                                    />
                                    <span className="text-sm font-medium text-[var(--text-color-muted)]">Permanent</span>
                                </label>
                            </div>
                        </div>
                        <FutureChangeImpactDisplay appState={appState} futureChange={change} calculations={calculations} />
                    </div>
                );
            })}
            <div className="hidden print:block space-y-2">
                {futureChanges.map(change => (
                    <div key={`print-${change.id}`} className="grid grid-cols-12 text-black py-1 border-b border-gray-200 text-sm">
                        <span className="col-span-3">{change.description}</span>
                        <span className="col-span-1 capitalize">{change.type}</span>
                        <span className="col-span-3">
                            {change.changeAmount >= 0 ? 'Increase of ' : 'Decrease of '}
                            {formatCurrency(Math.abs(change.changeAmount))} / {change.frequency}
                        </span>
                        <span className="col-span-5">From: {change.startDate} To: {change.isPermanent ? 'Permanent' : change.endDate}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

// --- New Component for Impact Analysis ---
const LumpSumImpactDisplay: React.FC<{
    appState: AppState;
    lumpSum: FutureLumpSum;
    calculations: any;
}> = React.memo(({ appState, lumpSum, calculations }) => {
    const [showExplanation, setShowExplanation] = useState(false);
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    const formatYears = (value: number) => {
        if (!isFinite(value) || isNaN(value)) return 'N/A';
        return `${value.toFixed(1)} years`;
    };

    const impact = useMemo(() => {
        if (!lumpSum.date || !lumpSum.amount || !lumpSum.description) {
            return { bankText: '', crownText: '', isCalculable: false };
        }

        const { loan, futureChanges, futureLumpSums, crownMoneyInterestRate, otherDebts } = appState;
        const { crownSurplus } = calculations; // Use Crown Surplus

        // The "impacted" calculation is the main one from the app, which includes everything.
        const crownImpactedCalc = calculations.crownMoneyLoanCalculation;

        // To get the "baseline", we manually calculate the scenario WITHOUT this specific lump sum.
        const baselineLumpSums = futureLumpSums.filter(l => l.id !== lumpSum.id);

        const consolidatedAmount = otherDebts.reduce((sum, d) => sum + d.amount, 0);
        const crownLoanForCalc = {
            amount: (loan.amount + consolidatedAmount) - (loan.offsetBalance || 0),
            interestRate: crownMoneyInterestRate,
            repayment: crownSurplus,
            frequency: 'monthly' as const,
            offsetBalance: 0,
        };
        
        const crownBaselineCalc = calculateAmortization(crownLoanForCalc, {
            futureChanges: futureChanges,
            futureLumpSums: baselineLumpSums,
            strategy: 'crown'
        });
        
        if (crownBaselineCalc.termInYears === Infinity || crownImpactedCalc.termInYears === Infinity) {
            return { bankText: 'Impact cannot be calculated (loan may not be payable).', crownText: '', isCalculable: false };
        }

        // --- Helper to create text ---
        const createImpactText = (baseline: LoanSummary, impacted: LoanSummary, scenario: string) => {
            const termDiff = baseline.termInYears - impacted.termInYears;
            const interestDiff = baseline.totalInterest - impacted.totalInterest;

            if (Math.abs(termDiff) < 1/24 && Math.abs(interestDiff) < 100) {
                return `No significant impact for ${scenario}.`;
            }

            const termText = termDiff > 0 ? `saves ${formatYears(termDiff)}` : `adds ${formatYears(Math.abs(termDiff))}`;
            const interestText = interestDiff > 0 ? `saves ${formatCurrency(interestDiff)}` : `costs ${formatCurrency(Math.abs(interestDiff))}`;

            return `${scenario}: ${termText} & ${interestText}.`;
        };
        
        const bankText = "Bank: No significant impact."; // Hardcoded as per business logic
        const crownText = createImpactText(crownBaselineCalc, crownImpactedCalc, "Crown");
        
        return { bankText, crownText, isCalculable: true };

    }, [appState, lumpSum, calculations]);
    
    if (!impact.isCalculable) return null;

    const color = lumpSum.type === 'income' ? 'var(--color-positive-text)' : 'var(--color-negative-text)';
    const bgColor = lumpSum.type === 'income' ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)';

    return (
        <div className="mt-2 p-3 text-left rounded-lg text-sm" style={{ backgroundColor: bgColor }}>
            <p className="font-bold text-center mb-2" style={{ color }}>Impact Analysis</p>
            <ul className="space-y-1 text-xs">
                <li style={{ color }}>{impact.bankText}</li>
                <li style={{ color }}>{impact.crownText}</li>
            </ul>
            <button 
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs text-center w-full mt-2 font-semibold underline decoration-dotted"
                style={{ color }}
            >
                {showExplanation ? 'Hide Explanation' : 'Why are the impacts different?'}
            </button>
            {showExplanation && (
                <div className="mt-2 text-xs border-t pt-2 space-y-2" style={{ borderColor: `${color}80`, color }}>
                    <p className="font-bold">Why the Bank Scenario is unaffected:</p>
                    <p className="mt-1">
                        The Bank scenario assumes any lump sum events are handled with funds outside of your home loan. This means these one-off events do not impact the loan's repayment timeline or the total interest paid to the bank.
                    </p>
                    <p className="font-bold mt-2">Why the Crown Money Scenario changes:</p>
                    <p className="mt-1">
                        The Crown strategy uses your <strong>entire</strong> financial picture. An income event is used to pay down the loan principal <strong>immediately</strong>, making a big, instant impact on your interest costs. An expense directly increases the loan balance. This direct-to-principal approach is why you see a significant change in the Crown scenario.
                    </p>
                </div>
            )}
        </div>
    );
});

// --- Component for Future Lump Sums ---
interface FutureLumpSumSectionProps {
    futureLumpSums: FutureLumpSum[];
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    appState: AppState;
    calculations: any;
}

const FutureLumpSumSection: React.FC<FutureLumpSumSectionProps> = React.memo(({ futureLumpSums, setAppState, appState, calculations }) => {
    const [focusedDateField, setFocusedDateField] = useState<string | null>(null);

    const handleListChange = (index: number, field: keyof FutureLumpSum, value: any) => {
        setAppState(prev => {
            const newList = [...prev.futureLumpSums];
            let processedValue = value;
            if (field === 'amount') {
                processedValue = Math.abs(parseFloat(value) || 0);
            }
            newList[index] = { ...newList[index], [field]: processedValue };
            return { ...prev, futureLumpSums: newList };
        });
    };

    const removeListItem = (id: number) => {
        setAppState(prev => ({
            ...prev,
            futureLumpSums: prev.futureLumpSums.filter(item => item.id !== id)
        }));
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    
    const inputClasses = "w-full bg-[var(--input-bg-color)] p-2 rounded border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]";
    const selectClasses = `custom-select ${inputClasses}`;

    return (
        <div className="space-y-4">
            {futureLumpSums.map((lump, index) => {
                const dateKey = `lump-date-${lump.id}`;
                const isDateFocused = focusedDateField === dateKey;

                return (
                    <div key={lump.id} className="p-4 bg-black/10 dark:bg-white/5 rounded-lg relative space-y-4 print:hidden">
                        <button onClick={() => removeListItem(lump.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-2xl font-bold z-10">×</button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Description</label>
                                <input
                                    type="text"
                                    value={lump.description}
                                    onChange={e => handleListChange(index, 'description', e.target.value)}
                                    className={inputClasses}
                                    placeholder="e.g., Car Purchase, Inheritance"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Type</label>
                                <select
                                    value={lump.type}
                                    onChange={e => handleListChange(index, 'type', e.target.value)}
                                    className={selectClasses}
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1 flex items-center gap-1">
                                    Amount
                                    <Tooltip text="Enter the value of the event. Select 'Income' for money in (e.g., inheritance) or 'Expense' for money out (e.g., car purchase). This amount will be added to or removed from your offset/savings on the specified date.">
                                        <InfoIcon className="h-3 w-3" />
                                    </Tooltip>
                                </label>
                                <input
                                    type="number"
                                    value={lump.amount}
                                    onChange={e => handleListChange(index, 'amount', e.target.value)}
                                    className={inputClasses}
                                    placeholder="30000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Date of Event</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <CalendarIcon className="h-5 w-5 text-[var(--text-color-muted)]" />
                                    </div>
                                    <input
                                        type={isDateFocused ? 'date' : 'text'}
                                        value={isDateFocused ? lump.date : formatDateForDisplay(lump.date)}
                                        onFocus={() => setFocusedDateField(dateKey)}
                                        onBlur={() => setFocusedDateField(null)}
                                        onChange={e => handleListChange(index, 'date', e.target.value)}
                                        placeholder="DD/MM/YYYY"
                                        className={`${inputClasses} custom-date-input pl-10`}
                                    />
                                </div>
                            </div>
                        </div>
                        <LumpSumImpactDisplay appState={appState} lumpSum={lump} calculations={calculations} />
                    </div>
                );
            })}
             <div className="hidden print:block space-y-2">
                {futureLumpSums.map(lump => (
                    <div key={`print-lump-${lump.id}`} className="grid grid-cols-12 text-black py-1 border-b border-gray-200 text-sm">
                        <span className="col-span-5">{lump.description}</span>
                        <span className="col-span-2 capitalize">{lump.type}</span>
                        <span className={`col-span-2 ${lump.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(lump.amount)}
                        </span>
                        <span className="col-span-3">On: {lump.date}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab3_IncomeExpenses: React.FC<Props> = ({ appState, setAppState, calculations }) => {
  const { incomes, expenses, futureChanges, futureLumpSums, loan, otherDebts } = appState;
  // Use bankSurplus (Current Situation) as the primary surplus display on this tab
  const { totalMonthlyIncome, totalMonthlyExpenses, investmentPropertiesNetCashflow, getMonthlyAmount, bankSurplus } = calculations;

  const handleListChange = <T,>(list: T[], setList: (list: T[]) => void, index: number, field: keyof T, value: any) => {
    const newList = [...list];
    const item = newList[index];

    let processedValue = value;
    if (field === 'isPermanent') {
        processedValue = Boolean(value);
    }

    newList[index] = { ...item, [field]: processedValue };
    setList(newList);
  };
  
  const addListItem = <T extends {id: number}>(list: T[], setList: (list: T[]) => void, newItem: Omit<T, 'id'>) => {
    const fullNewItem = { ...newItem, id: Date.now() } as T;
    setList([...list, fullNewItem]);
  };
  
  const removeListItem = <T extends {id: number}>(list: T[], setList: (list: T[]) => void, id: number) => {
    setList(list.filter(item => item.id !== id));
  };

  const formatCurrency = (value: number, digits = 0) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

  const monthlyLoanRepayment = getMonthlyAmount(loan.repayment, loan.frequency);
  const surplusForDebtReduction = bankSurplus; // Display current surplus
  const netMonthlyCashflow = surplusForDebtReduction - monthlyLoanRepayment;

  const inputClasses = "bg-[var(--input-bg-color)] p-2 rounded border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]";
  
  const expenseCategories: ExpenseItem['category'][] = ['FFF', 'Hard Expenses', 'Soft Expenses', 'Other'];

  const renderIncomeRows = () => (
    <>
      {incomes.map((income, index) => (
        <div key={income.id} className="items-center">
            <div className="grid grid-cols-12 gap-2 print:hidden">
              <input type="text" value={income.name} onChange={e => handleListChange(incomes, (l) => setAppState(s => ({...s, incomes: l})), index, 'name', e.target.value)} className={`col-span-4 ${inputClasses}`} placeholder="Income Source"/>
              <input type="number" value={income.amount} onChange={e => handleListChange(incomes, (l) => setAppState(s => ({...s, incomes: l})), index, 'amount', parseFloat(e.target.value) || 0)} className={`col-span-4 ${inputClasses}`} placeholder="Amount"/>
              <select value={income.frequency} onChange={e => handleListChange(incomes, (l) => setAppState(s => ({...s, incomes: l})), index, 'frequency', e.target.value)} className={`custom-select col-span-3 ${inputClasses}`}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
              <button onClick={() => removeListItem(incomes, (l) => setAppState(s => ({...s, incomes: l})), income.id)} className="col-span-1 text-red-400 hover:text-red-600 self-center justify-self-center text-2xl font-bold">×</button>
            </div>
             <div className="hidden print:grid print:grid-cols-12 col-span-12 text-black py-1 border-b border-gray-200">
                <span className="col-span-6">{income.name}</span>
                <span className="col-span-4 text-left">{formatCurrency(income.amount)}</span>
                <span className="col-span-2 text-left capitalize">{income.frequency}</span>
            </div>
        </div>
      ))}
    </>
  );

  const renderExpenseRows = (category: ExpenseItem['category']) => (
    <>
      {expenses.filter(e => e.category === category).map((expense) => {
          const originalIndex = expenses.findIndex(e => e.id === expense.id);
          return (
            <div key={expense.id} className="items-center">
                <div className="grid grid-cols-12 gap-2 print:hidden">
                  <input type="text" value={expense.name} onChange={e => handleListChange(expenses, (l) => setAppState(s => ({...s, expenses: l})), originalIndex, 'name', e.target.value)} className={`col-span-4 ${inputClasses}`} placeholder="Expense Item"/>
                  <input type="number" value={expense.amount} onChange={e => handleListChange(expenses, (l) => setAppState(s => ({...s, expenses: l})), originalIndex, 'amount', parseFloat(e.target.value) || 0)} className={`col-span-4 ${inputClasses}`} placeholder="Amount"/>
                  <select value={expense.frequency} onChange={e => handleListChange(expenses, (l) => setAppState(s => ({...s, expenses: l})), originalIndex, 'frequency', e.target.value)} className={`custom-select col-span-3 ${inputClasses}`}>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                  <button onClick={() => removeListItem(expenses, (l) => setAppState(s => ({...s, expenses: l})), expense.id)} className="col-span-1 text-red-400 hover:text-red-600 self-center justify-self-center text-2xl font-bold">×</button>
                </div>
                <div className="hidden print:grid print:grid-cols-12 col-span-12 text-black py-1 border-b border-gray-200">
                    <span className="col-span-6">{expense.name}</span>
                    <span className="col-span-3 text-left">{formatCurrency(expense.amount)}</span>
                    <span className="col-span-3 text-left capitalize">{expense.frequency}</span>
                </div>
            </div>
          );
      })}
    </>
  );
  
  const handleAddFutureChange = () => {
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(today.getFullYear() + 1);
    
    const newChange: Omit<FutureChange, 'id'> = {
        description: '', 
        type: 'expense', 
        changeAmount: 0,
        frequency: 'monthly',
        startDate: today.toISOString().split('T')[0],
        endDate: oneYearFromNow.toISOString().split('T')[0],
        isPermanent: false
    };
    addListItem(futureChanges, l => setAppState(s => ({...s, futureChanges: l})), newChange);
  };

  const handleAddFutureLumpSum = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(new Date().getFullYear() + 1);

    const newLumpSum: Omit<FutureLumpSum, 'id'> = {
        description: 'Car Purchase',
        type: 'expense',
        amount: 30000,
        date: oneYearFromNow.toISOString().split('T')[0],
    };
    addListItem(futureLumpSums, l => setAppState(s => ({...s, futureLumpSums: l})), newLumpSum);
  };
  
  const PlannedChangesCardTitle = () => (
      <div className="flex items-center gap-2">
          <span>Plan for Future Budget Changes</span>
          <Tooltip text="Use this to model future events, like a pay rise or a child finishing daycare. These changes will affect the Crown Money calculation from the specified date onwards.">
              <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
          </Tooltip>
      </div>
  );

  const LumpSumCardTitle = () => (
    <div className="flex items-center gap-2">
        <span>Future Lump Sum Events</span>
        <Tooltip text="Model one-off capital events like a car purchase, inheritance, or large holiday. This will directly impact your offset/savings on the specified date, affecting both the Bank and Crown Money calculations. Select the event type and enter a positive amount.">
            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)]"/>
        </Tooltip>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Left Column */}
      <div className="space-y-6">
        <Card title="Income (Net)">
          <div className="space-y-2">{renderIncomeRows()}</div>
          <button onClick={() => addListItem(incomes, (l) => setAppState(s => ({...s, incomes: l})), {name: '', amount: 0, frequency: 'weekly'})} className="mt-4 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add Income</button>
        </Card>
        <Card title="Expenses">
            <h4 className="text-md font-semibold text-[var(--text-color-muted)] mt-4 mb-2 print:text-black">FFF (Food, Fun, Fuel)</h4>
            <div className="space-y-2">{renderExpenseRows('FFF')}</div>
            <button onClick={() => addListItem(expenses, (l) => setAppState(s => ({...s, expenses: l})), {name: '', amount: 0, category: 'FFF', frequency: 'weekly'})} className="mt-2 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add FFF</button>
            
            <h4 className="text-md font-semibold text-[var(--text-color-muted)] mt-4 mb-2 print:text-black">Hard Expenses</h4>
            <div className="space-y-2">{renderExpenseRows('Hard Expenses')}</div>
            <button onClick={() => addListItem(expenses, (l) => setAppState(s => ({...s, expenses: l})), {name: '', amount: 0, category: 'Hard Expenses', frequency: 'monthly'})} className="mt-2 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add Hard Expense</button>

            <h4 className="text-md font-semibold text-[var(--text-color-muted)] mt-4 mb-2 print:text-black">Soft Expenses</h4>
            <div className="space-y-2">{renderExpenseRows('Soft Expenses')}</div>
            <button onClick={() => addListItem(expenses, (l) => setAppState(s => ({...s, expenses: l})), {name: '', amount: 0, category: 'Soft Expenses', frequency: 'monthly'})} className="mt-2 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add Soft Expense</button>
            
            <h4 className="text-md font-semibold text-[var(--text-color-muted)] mt-4 mb-2 print:text-black">Other</h4>
            <div className="space-y-2">{renderExpenseRows('Other')}</div>
            <button onClick={() => addListItem(expenses, (l) => setAppState(s => ({...s, expenses: l})), {name: '', amount: 0, category: 'Other', frequency: 'monthly'})} className="mt-2 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add Other</button>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <Card title="Cashflow Summary">
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-positive-bg)' }}>
                    <span className="font-medium" style={{ color: 'var(--color-positive-text)'}}>Total Monthly Income</span>
                    <span className="font-semibold" style={{ color: 'var(--color-positive-text)'}}>{formatCurrency(totalMonthlyIncome)}</span>
                </div>
                 {investmentPropertiesNetCashflow !== 0 && (
                    <div className={`flex justify-between items-center p-2 rounded-lg text-xs ${investmentPropertiesNetCashflow > 0 ? 'print:bg-green-100' : 'print:bg-red-100'}`} style={{ backgroundColor: investmentPropertiesNetCashflow > 0 ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)' }}>
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${investmentPropertiesNetCashflow > 0 ? 'print:text-green-800' : 'print:text-red-800'}`} style={{ color: investmentPropertiesNetCashflow > 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>Net Investment Cashflow</span>
                        <Tooltip text="The combined monthly cashflow (income minus all expenses) from your investment properties, based on your Current/Bank settings. This is automatically factored into your total income/expenses below.">
                            <InfoIcon className="h-4 w-4 text-[var(--text-color-muted)] print:hidden"/>
                        </Tooltip>
                    </div>
                    <span className={`font-semibold ${investmentPropertiesNetCashflow > 0 ? 'print:text-green-800' : 'print:text-red-800'}`} style={{ color: investmentPropertiesNetCashflow > 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>{formatCurrency(investmentPropertiesNetCashflow)}</span>
                    </div>
                )}
                <div>
                    <div className="text-xs text-[var(--text-color-muted)] mt-1 pr-2 space-y-2 border-l-2 border-[var(--border-color)] pl-2 ml-auto w-fit text-right">
                        {expenseCategories.map(category => {
                            const categoryExpenses = expenses.filter(exp => exp.category === category);
                            if (categoryExpenses.length === 0) return null;

                            const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + getMonthlyAmount(exp.amount, exp.frequency), 0);
                            const categoryPercentage = totalMonthlyIncome > 0 ? (categoryTotal / totalMonthlyIncome) * 100 : 0;

                            return (
                                <div key={category} className="pl-2 pb-2">
                                    <h5 className="font-semibold text-[var(--text-color)] text-left mb-1 capitalize">{category.replace(' Expenses', '')}</h5>
                                    {categoryExpenses.map(exp => {
                                        const monthlyAmount = getMonthlyAmount(exp.amount, exp.frequency);
                                        const percentage = totalMonthlyIncome > 0 ? (monthlyAmount / totalMonthlyIncome) * 100 : 0;
                                        return (
                                            <div key={exp.id} className="flex justify-between gap-4 italic items-center">
                                                <span>{exp.name} ({formatCurrency(exp.amount,0)}/{exp.frequency.charAt(0)})</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-medium text-[var(--text-color-muted)] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full min-w-[40px] text-center">
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                    <span>{formatCurrency(monthlyAmount, 2)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between gap-4 font-semibold text-[var(--text-color)] pt-1 mt-1 border-t border-dashed border-[var(--border-color)] items-center">
                                        <span>Subtotal</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-[var(--text-color-muted)] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full min-w-[40px] text-center">
                                                {categoryPercentage.toFixed(1)}%
                                            </span>
                                            <span>{formatCurrency(categoryTotal, 2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {investmentPropertiesNetCashflow < 0 && (() => {
                            const shortfall = Math.abs(investmentPropertiesNetCashflow);
                            const percentage = totalMonthlyIncome > 0 ? (shortfall / totalMonthlyIncome) * 100 : 0;
                            return (
                                <div className="flex justify-between gap-4 font-semibold text-[var(--text-color)] pt-2 border-t border-dashed border-[var(--border-color)] pl-2 items-center">
                                    <span>Investment Shortfall</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-[var(--text-color-muted)] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full min-w-[40px] text-center">
                                            {percentage.toFixed(1)}%
                                        </span>
                                        <span>{formatCurrency(shortfall, 2)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg mt-2" style={{ backgroundColor: 'var(--color-negative-bg)' }}>
                        <span className="font-medium" style={{ color: 'var(--color-negative-text)' }}>Total Monthly Expenses</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium opacity-80 bg-white/50 px-1.5 py-0.5 rounded-full" style={{ color: 'var(--color-negative-text)' }}>
                                {totalMonthlyIncome > 0 ? ((totalMonthlyExpenses / totalMonthlyIncome) * 100).toFixed(1) : '0.0'}%
                            </span>
                            <span className="font-semibold" style={{ color: 'var(--color-negative-text)' }}>{formatCurrency(totalMonthlyExpenses)}</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <div className="flex justify-between items-center p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-surplus-bg)', borderColor: 'var(--color-surplus-text)' }}>
                        <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: 'var(--color-surplus-text)' }}>Surplus for Debt Reduction</span>
                            <Tooltip text="CALCULATION: Total Monthly Income - Total Monthly Expenses (including investment shortfalls). This is the key figure for the Crown Money strategy. This entire amount is used to accelerate your debt reduction.">
                                <InfoIcon className="h-4 w-4 text-blue-300 print:hidden"/>
                            </Tooltip>
                        </div>
                        <span className="font-bold text-lg" style={{ color: 'var(--color-surplus-text)' }}>{formatCurrency(surplusForDebtReduction)}</span>
                    </div>
                    <div className="text-right text-xs text-[var(--text-color-muted)] mt-1 pr-2 italic">
                        ( {formatCurrency(totalMonthlyIncome)} - {formatCurrency(totalMonthlyExpenses)} )
                    </div>
                </div>

                <hr className="border-[var(--border-color)] border-dashed my-2" />

                <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-negative-bg)' }}>
                    <span className="font-medium" style={{ color: 'var(--color-negative-text)' }}>Current Loan Repayment</span>
                    <span className="font-semibold" style={{ color: 'var(--color-negative-text)' }}>{formatCurrency(monthlyLoanRepayment)}</span>
                </div>
                 <div>
                    <div className="flex justify-between items-center p-3 rounded-lg border-2" style={{ borderColor: netMonthlyCashflow >= 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-base" style={{ color: 'var(--text-color)' }}>Final Net Monthly Cashflow</span>
                            <Tooltip text="CALCULATION: Surplus for Debt Reduction - Current Loan Repayment. This shows your leftover cashflow each month after paying living expenses and your primary home loan, but *before* other debt repayments. This figure represents the cashflow available under your bank's current structure.">
                                <InfoIcon className="h-4 w-4 text-[var(--text-color)] print:hidden"/>
                            </Tooltip>
                        </div>
                        <span className="font-extrabold text-2xl" style={{ color: netMonthlyCashflow >= 0 ? 'var(--color-positive-text)' : 'var(--color-negative-text)' }}>{formatCurrency(netMonthlyCashflow)}</span>
                    </div>
                    <div className="text-right text-xs text-[var(--text-color-muted)] mt-1 pr-2 italic">
                        ( {formatCurrency(surplusForDebtReduction)} - {formatCurrency(monthlyLoanRepayment)} )
                    </div>
                </div>
            </div>
        </Card>
         <Card title={<PlannedChangesCardTitle />}>
            <FutureChangesSection
              futureChanges={futureChanges}
              incomes={incomes}
              expenses={expenses}
              setAppState={setAppState}
              appState={appState}
              calculations={calculations}
            />
            <button onClick={handleAddFutureChange} className="mt-4 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add Future Change</button>
        </Card>
        <Card title={<LumpSumCardTitle />}>
            <FutureLumpSumSection
                futureLumpSums={futureLumpSums}
                setAppState={setAppState}
                appState={appState}
                calculations={calculations}
            />
            <button onClick={handleAddFutureLumpSum} className="mt-4 text-sm text-[var(--title-color)] hover:opacity-80 transition-opacity font-semibold print:hidden">+ Add Lump Sum Event</button>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(Tab3_IncomeExpenses);
