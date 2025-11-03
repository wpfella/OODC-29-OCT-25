
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Tab, ExpenseItem, InvestmentProperty, InvestmentPropertyExpense, FutureChange, FutureLumpSum, Person, IncomeItem, LoanDetails, Frequency, SavedScenario } from './types';
import Tab1_CurrentLoan from './components/Tab1_CurrentLoan';
import Tab2_InterestBreakdown from './components/Tab2_InterestBreakdown';
import Tab3_IncomeExpenses from './components/Tab3_IncomeExpenses';
import Tab_InvestmentProperties from './components/Tab_InvestmentProperties';
import Tab4_OODC from './components/Tab4_OODC';
import Tab_InvestmentOODC from './components/Tab_InvestmentOODC';
import Tab_DebtRecycling from './components/Tab_DebtRecycling';
import Tab_In2Wealth from './components/Tab_In2Wealth';
import Tab5_Summary from './components/Tab5_Summary';
import { CrownLogo, SunIcon, MoonIcon, PrintIcon, DownloadIcon, SpeakerOnIcon, SpeakerOffIcon, CalculatorIcon, CodeBracketIcon, TrashIcon, CameraIcon, UndoIcon, SaveIcon, FolderOpenIcon, UploadIcon } from './components/common/IconComponents';
import { useMortgageCalculations } from './hooks/useMortgageCalculations';
import Toast from './components/common/Toast';
import Modal from './components/common/Modal';
import AdvancedCalculator from './components/common/AdvancedCalculator';
import { useSpeechSynthesizer } from './hooks/useSpeechSynthesizer';
import Assistant from './components/Assistant';
import LoginScreen from './components/LoginScreen';

const darkPalette = {
    '--bg-color': '#250B40',
    '--text-color': '#F8F8F8',
    '--text-color-muted': '#b5a9c9',
    '--card-bg-color': '#2f1850',
    '--input-bg-color': 'rgba(255, 255, 255, 0.05)',
    '--border-color': 'rgba(230, 222, 238, 0.2)',
    '--input-border-color': 'rgba(230, 222, 238, 0.4)',
    '--input-border-focus-color': '#c026d3',
    '--title-color': '#c026d3',
    '--button-bg-color': '#c026d3',
    '--button-bg-hover-color': '#a21caf',
    '--slider-track-color': 'rgba(230, 222, 238, 0.2)',
    '--tooltip-bg-color': '#3e2661',
    '--tooltip-text-color': '#FFFFFF',
    '--tooltip-text-color-muted': '#e2e8f0',
    '--tooltip-text-color-positive': '#86efac',
    '--tooltip-text-color-negative': '#fca5a5',
    '--chart-color-bank': '#94a3b8',
    '--chart-color-crown': '#c026d3',
    '--chart-color-interest': '#f472b6',
    '--chart-color-principal': '#60a5fa',
    '--chart-color-wealth': '#2dd4bf',
    '--color-positive-bg': 'rgba(74, 222, 128, 0.1)',
    '--color-positive-text': '#86efac',
    '--color-negative-bg': 'rgba(248, 113, 113, 0.1)',
    '--color-negative-text': '#f87171',
    '--color-surplus-bg': 'rgba(129, 140, 248, 0.1)',
    '--color-surplus-text': '#a5b4fc',
    '--color-wealth-bg-gradient': 'linear-gradient(to right, rgba(192, 38, 211, 0.1), rgba(91, 33, 182, 0.1))',
    '--date-picker-filter': 'invert(1)',
    '--date-picker-color-scheme': 'dark',
};

const lightPalette = {
    '--bg-color': '#F8F8F8',
    '--text-color': '#250B40',
    '--text-color-muted': '#583d77',
    '--card-bg-color': '#ffffff',
    '--input-bg-color': '#ffffff',
    '--border-color': '#E6DEEE',
    '--input-border-color': '#d9cde5',
    '--input-border-focus-color': '#5B21B6',
    '--title-color': '#5B21B6',
    '--button-bg-color': '#5B21B6',
    '--button-bg-hover-color': '#4c1d95',
    '--slider-track-color': '#E6DEEE',
    '--tooltip-bg-color': '#250B40',
    '--tooltip-text-color': '#FFFFFF',
    '--tooltip-text-color-muted': '#E6DEEE',
    '--tooltip-text-color-positive': '#86efac',
    '--tooltip-text-color-negative': '#fb7185',
    '--chart-color-bank': '#9ca3af',
    '--chart-color-crown': '#5B21B6',
    '--chart-color-interest': '#ec4899',
    '--chart-color-principal': '#3b82f6',
    '--chart-color-wealth': '#10b981',
    '--color-positive-bg': '#ecfdf5',
    '--color-positive-text': '#065f46',
    '--color-negative-bg': '#fef2f2',
    '--color-negative-text': '#991b1b',
    '--color-surplus-bg': '#eef2ff',
    '--color-surplus-text': '#312e81',
    '--color-wealth-bg-gradient': 'linear-gradient(to right, #f5f3ff, #ede9fe)',
    '--date-picker-filter': 'invert(0)',
    '--date-picker-color-scheme': 'light',
};

const LOCAL_STORAGE_KEY = 'crownMoneyCalculatorState';
const SCENARIOS_STORAGE_KEY = 'crownMoneyCalculatorScenariosV2';

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/23718141/u9jdfar/';
const UPLOAD_PASSWORD = 'Crown';

export const initialAppState: AppState = {
  loan: {
    amount: 350000,
    propertyValue: 450000,
    interestRate: 6.5,
    repayment: 2500,
    frequency: 'monthly',
    offsetBalance: 50000,
  },
  people: [
    { id: 1, name: 'Person 1', age: 35 },
    { id: 2, name: 'Person 2', age: 34 },
  ],
  incomes: [
    { id: 1, name: 'Person 1 Income', amount: 4500, frequency: 'monthly' },
    { id: 2, name: 'Person 2 Income', amount: 4000, frequency: 'monthly' },
  ],
  expenses: [
    // FFF
    { id: 1, name: 'Food', amount: 200, category: 'FFF', frequency: 'weekly' },
    { id: 2, name: 'Fun', amount: 125, category: 'FFF', frequency: 'weekly' },
    { id: 3, name: 'Fuel', amount: 75, category: 'FFF', frequency: 'weekly' },
    // Soft Expenses
    { id: 4, name: 'Holidays', amount: 3000, category: 'Soft Expenses', frequency: 'annually' },
    { id: 5, name: 'MISC', amount: 200, category: 'Soft Expenses', frequency: 'monthly' },
    { id: 6, name: 'Gifts', amount: 500, category: 'Soft Expenses', frequency: 'annually' },
    { id: 19, name: 'Clothes', amount: 100, category: 'Soft Expenses', frequency: 'monthly' },
    // Hard Expenses
    { id: 7, name: 'Gas etc', amount: 300, category: 'Hard Expenses', frequency: 'quarterly' },
    { id: 8, name: 'Car Rego etc', amount: 800, category: 'Hard Expenses', frequency: 'annually' },
    { id: 9, name: 'Phone etc', amount: 150, category: 'Hard Expenses', frequency: 'monthly' },
    { id: 10, name: 'Insurance- Life/income/Pet', amount: 200, category: 'Hard Expenses', frequency: 'monthly' },
    { id: 11, name: 'Insurance- Car/house/health', amount: 1000, category: 'Hard Expenses', frequency: 'annually' },
    { id: 12, name: 'School/Education', amount: 0, category: 'Hard Expenses', frequency: 'annually' },
    { id: 13, name: 'Childcare', amount: 0, category: 'Hard Expenses', frequency: 'fortnightly' },
    { id: 14, name: 'Rates', amount: 500, category: 'Hard Expenses', frequency: 'quarterly' },
    { id: 15, name: 'Debt Repay', amount: 0, category: 'Hard Expenses', frequency: 'monthly' },
    { id: 16, name: 'Subs', amount: 50, category: 'Hard Expenses', frequency: 'monthly' },
    { id: 17, name: 'Rent', amount: 0, category: 'Hard Expenses', frequency: 'weekly' },
    { id: 18, name: 'Kids Activities', amount: 0, category: 'Hard Expenses', frequency: 'annually' },
  ],
  otherDebts: [],
  futureChanges: [],
  futureLumpSums: [],
  investmentProperties: [],
  crownMoneyInterestRate: 6.5,
  clientEmail: '',
  clientPhone: '',
  investmentAmountPercentage: 100,
  investmentGrowthRate: 7,
  idealRetirementAge: 65,
  propertyGrowthRate: 3,
  payoffStrategy: 'snowball',
  currentLender: '',
  numberOfKids: 0,
  allPartiesInAttendance: 'Yes- Couple',
  debtRecyclingEnabled: true,
  debtRecyclingInvestmentRate: 8,
  debtRecyclingLoanInterestRate: 6.5,
  marginalTaxRate: 32.5,
  debtRecyclingPercentage: 100,
};

export const emptyAppState: AppState = {
  loan: {
    amount: 0,
    propertyValue: 0,
    interestRate: 6.5,
    repayment: 0,
    frequency: 'monthly',
    offsetBalance: 0,
  },
  people: [
    { id: 1, name: 'Person 1', age: 30 },
    { id: 2, name: 'Person 2', age: 30 },
  ],
  incomes: [],
  expenses: [],
  otherDebts: [],
  futureChanges: [],
  futureLumpSums: [],
  investmentProperties: [],
  crownMoneyInterestRate: 6.5,
  clientEmail: '',
  clientPhone: '',
  investmentAmountPercentage: 100,
  investmentGrowthRate: 7,
  idealRetirementAge: 65,
  propertyGrowthRate: 3,
  payoffStrategy: 'snowball',
  currentLender: '',
  numberOfKids: 0,
  allPartiesInAttendance: 'Yes- Couple',
  debtRecyclingEnabled: true,
  debtRecyclingInvestmentRate: 8,
  debtRecyclingLoanInterestRate: 6.5,
  marginalTaxRate: 32.5,
  debtRecyclingPercentage: 100,
};

const tabExplanations: Record<Tab, string> = {
    [Tab.CurrentLoan]: "G'day! Welcome to the Current Loan tab. This is where we start building your financial picture. Pop in your primary home loan details, like the amount, interest rate, and your repayments. Also, add the details for each borrower. The summary on the right will show you the bank's current plan for your loan. Cheers!",
    [Tab.InterestBreakdown]: "Right then, let's have a squiz at the Interest Breakdown. This tab shows you where your money is really going with a standard bank loan. Notice how much of your repayment is just feeding the bank's interest in the early years. It's a bit of a shocker, eh? This is the exact problem Crown Money is designed to fix.",
    [Tab.InvestmentProperties]: "Got a few investment properties? No worries. Add them all in here. We'll need the property value, loan details, and any rent or expenses. The calculator will work out the net cashflow from your portfolio and automatically add it to your overall budget. Too easy!",
    [Tab.IncomeExpenses]: "This is your budget, mate. Chuck in all your income and day-to-day expenses. The more accurate you are, the better the result. The 'Monthly Surplus' at the end is the magic number – it's the firepower we'll use to smash your debt with the Crown Money strategy.",
    [Tab.OODC]: "OODC stands for Out Of Debt Component, and this is where the magic happens for your home loan. We use your budget surplus to show you the Crown Money plan versus your bank's. Check out the massive savings in interest and how many years sooner you'll be debt-free. It's a bloody game-changer!",
    [Tab.InvestmentOODC]: "If you've got investment properties, this tab shows you how we'll tackle that debt after your home is paid off. We typically use the 'snowball' method, knocking over the smallest loans first to build momentum. You'll see how the entire portfolio gets paid off years ahead of the bank's schedule.",
    [Tab.DebtRecycling]: "Debt Recycling is a powerful strategy to build wealth while paying off your home loan. As you pay down your home loan principal, you can take out a new, tax-deductible investment loan for the same amount. This money is then invested. This tab shows how the net returns from your new investment can be used to accelerate your home loan payoff even further, getting you to the 'In 2 Wealth' stage much faster.",
    [Tab.In2Wealth]: "Right, you're debt-free! What's next? This is the 'In 2 Wealth' tab. Once your loan is gone, that massive repayment you were making is now yours to invest. Play around with your retirement age and investment strategy to see how you can build some serious long-term wealth for the future. Good on ya!",
    [Tab.Summary]: "The Summary tab brings everything together into a neat, one-page report. It's got all the key numbers, comparisons, and outcomes. This is the perfect page to print out or save as a PDF to have a yarn with your family about your new financial future.",
};

const zapierMessages = {
    loading: 'Uploading record...',
    success: 'Record uploaded successfully!',
    error: 'Record upload failed. Please try again.',
};


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CurrentLoan);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [zapierStatus, setZapierStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isZapierPasswordModalOpen, setIsZapierPasswordModalOpen] = useState(false);
  const [zapierPasswordInput, setZapierPasswordInput] = useState('');
  const [zapierPasswordError, setZapierPasswordError] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<AppState | null>(null);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [infoToast, setInfoToast] = useState('');
  const { isSpeaking, speak, cancel } = useSpeechSynthesizer();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  

  useEffect(() => {
    if (infoToast) {
        const timer = setTimeout(() => setInfoToast(''), 3000);
        return () => clearTimeout(timer);
    }
  }, [infoToast]);

  useEffect(() => {
    const palette = theme === 'dark' ? darkPalette : lightPalette;
    document.body.style.backgroundColor = palette['--bg-color'];
    for (const [key, value] of Object.entries(palette)) {
        document.documentElement.style.setProperty(key, value as string);
    }
  }, [theme]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('isAuthenticated') === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
        console.error("Could not access session storage:", error);
    }
  }, []);

  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        if (parsedState.expenses && Array.isArray(parsedState.expenses)) {
            parsedState.expenses.forEach((exp: ExpenseItem) => {
                if ((exp.category as any) === 'Discretionary') {
                    exp.category = 'Soft Expenses';
                }
            });
        }
        
        if (parsedState.futureLumpSums && Array.isArray(parsedState.futureLumpSums)) {
            parsedState.futureLumpSums.forEach((lump: any) => {
                if (typeof lump.type === 'undefined') {
                    lump.type = lump.amount >= 0 ? 'income' : 'expense';
                    lump.amount = Math.abs(lump.amount);
                }
            });
        }

        const mergedState = { ...initialAppState, ...parsedState };
        mergedState.loan = { ...initialAppState.loan, ...(parsedState.loan || {}) };
        mergedState.investmentProperties = mergedState.investmentProperties || [];
        mergedState.futureLumpSums = mergedState.futureLumpSums || [];
        
        if (typeof parsedState.allPartiesInAttendance === 'boolean') {
             mergedState.allPartiesInAttendance = parsedState.allPartiesInAttendance ? 'Yes- Couple' : 'Only 1 of 2 Showed';
        }

        return mergedState;
      }
    } catch (error) {
      console.error("Failed to parse saved state from localStorage", error);
    }
    return initialAppState;
  });
  
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [appState]);
  
  useEffect(() => {
    cancel();
  }, [activeTab, cancel]);
  
  useEffect(() => {
    try {
        const scenariosJSON = localStorage.getItem(SCENARIOS_STORAGE_KEY);
        if (scenariosJSON) {
            setSavedScenarios(JSON.parse(scenariosJSON));
        }
    } catch (error) {
        console.error("Failed to load scenarios from localStorage", error);
        setSavedScenarios([]);
    }
  }, []);

  const updateSavedScenarios = (newScenarios: SavedScenario[]) => {
    newScenarios.sort((a, b) => b.timestamp - a.timestamp);
    setSavedScenarios(newScenarios);
    try {
        localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(newScenarios));
    } catch (error) {
        console.error("Failed to save scenarios to localStorage", error);
    }
  };

  const calculations = useMortgageCalculations(appState);

  const executeZapierSync = async () => {
    if (!appState.clientEmail || appState.clientEmail.trim() === '') {
      alert("Please enter a client email address on the 'Summary' tab before syncing.");
      return;
    }
    setZapierStatus('loading');

    try {
      // 1. Create a serializable version of the calculations data by removing functions.
      const getSerializableCalculations = (calcs: any) => {
        const {
          getMonthlyAmount,
          calculatePIPayment,
          calculateIOPayment,
          wealthCalcs, // This function is spread into the top level of the calculations object
          ...serializableData
        } = calcs;
        return serializableData;
      };

      const jsonData = {
        appState: appState,
        calculations: getSerializableCalculations(calculations),
      };

      // 2. Create raw text data from the HTML summary note.
      const htmlToText = (html: string): string => {
        let text = html;
        // Replace block-level tags with newlines before stripping all tags
        text = text.replace(/<\/h[1-6]>/gi, '\n\n');
        text = text.replace(/<p>/gi, '\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/tr>/gi, '\n');
        text = text.replace(/<\/td>/gi, '\t');
        // Strip all remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');
        // Decode common HTML entities
        text = text.replace(/&nbsp;/g, ' ');
        // Clean up excessive whitespace
        text = text.replace(/(\n\s*){3,}/g, '\n\n'); // Collapse more than 2 newlines
        text = text.replace(/[ \t]{2,}/g, ' '); // Collapse multiple spaces/tabs into one space
        return text.trim();
      };

      const rawTextData = htmlToText(generateHubspotNote());

      // 3. Construct the final payload for Zapier.
      const payload = {
        client_email: appState.clientEmail,
        client_phone: appState.clientPhone,
        jsonData: jsonData,
        rawTextData: rawTextData,
      };

      // 4. Send the data to the Zapier webhook.
      await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });

      setZapierStatus('success');
    } catch (error) {
      console.error("Zapier Sync Error:", error);
      setZapierStatus('error');
    } finally {
      setTimeout(() => setZapierStatus('idle'), 4000);
    }
  };
  
  const handleOpenZapierUploadModal = () => {
    if (!appState.clientEmail || appState.clientEmail.trim() === '') {
      alert("Please enter a client email address on the 'Summary' tab before uploading a record.");
      return;
    }
    setZapierPasswordError('');
    setZapierPasswordInput('');
    setIsZapierPasswordModalOpen(true);
  };

  const handleZapierPasswordSubmit = () => {
    if (zapierPasswordInput === UPLOAD_PASSWORD) {
        setZapierPasswordError('');
        setIsZapierPasswordModalOpen(false);
        executeZapierSync();
    } else {
        setZapierPasswordError('Incorrect password. Please try again.');
    }
  };

  const tabs: { id: Tab; label: string; component: React.ReactNode }[] = [
    { id: Tab.CurrentLoan, label: 'Current Loan', component: <Tab1_CurrentLoan appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.InterestBreakdown, label: 'Interest Breakdown', component: <Tab2_InterestBreakdown appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.InvestmentProperties, label: 'Investments', component: <Tab_InvestmentProperties appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.IncomeExpenses, label: 'Income & Expenses', component: <Tab3_IncomeExpenses appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.OODC, label: 'OODC', component: <Tab4_OODC appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.InvestmentOODC, label: 'Investment OODC', component: <Tab_InvestmentOODC appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.DebtRecycling, label: 'Debt Recycling', component: <Tab_DebtRecycling appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.In2Wealth, label: 'In 2 Wealth', component: <Tab_In2Wealth appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.Summary, label: 'Summary', component: <Tab5_Summary appState={appState} setAppState={setAppState} calculations={calculations} onUploadRecord={handleOpenZapierUploadModal} zapierStatus={zapierStatus} /> },
  ];
  
  const generateHubspotNote = (): string => {
    const { loan, people, clientEmail, clientPhone, investmentProperties, idealRetirementAge, investmentAmountPercentage, investmentGrowthRate, incomes, expenses, futureChanges, futureLumpSums } = appState;
    const { bankLoanCalculation, crownMoneyLoanCalculation, wealthProjection, totalMonthlyIncome, totalMonthlyExpenses, investmentLoanCalculations, retirementWealthProjection, getMonthlyAmount, investmentPropertiesNetCashflow } = calculations;

    const formatCurrency = (value: number, digits = 0) => {
        if (isNaN(value) || !isFinite(value)) return 'N/A';
        return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
    };
    const formatYears = (value: number) => {
        if (isNaN(value) || !isFinite(value)) return 'N/A';
        return `${value.toFixed(1)} Years`;
    };

    const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
    const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;

    const primaryInterestSaved = isBankLoanValid && isCrownLoanValid ? bankLoanCalculation.totalInterest - crownMoneyLoanCalculation.totalInterest : 0;
    const netLoanAmount = loan.amount - (loan.offsetBalance || 0);
    const hasInvestments = investmentProperties.length > 0;
    const isAnyInvestmentUnpayable = investmentLoanCalculations.investmentPayoffSchedule.some((p: any) => p.bank.termInYears === Infinity || p.crown.termInYears === Infinity);
    const canCalculateInvestmentSavings = hasInvestments && isCrownLoanValid && !isAnyInvestmentUnpayable;
    const investmentInterestSaved = canCalculateInvestmentSavings ? investmentLoanCalculations.totalBankInterest - investmentLoanCalculations.totalCrownInterest : 0;
    const totalCrownPayoffYears = canCalculateInvestmentSavings ? crownMoneyLoanCalculation.termInYears + investmentLoanCalculations.totalCrownTerm : crownMoneyLoanCalculation.termInYears;
    const totalInterestSaved = primaryInterestSaved + investmentInterestSaved;
    const monthlySavings = getMonthlyAmount(appState.loan.repayment, appState.loan.frequency);
    const totalNetPositionAtRetirement = retirementWealthProjection.wealth + retirementWealthProjection.cashInHand + (retirementWealthProjection.homeEquity || 0);

    let html = `<h1>Crown Money "Out of Debt" Calculator Summary</h1>`;

    if (isCrownLoanValid) {
        html += `
            <div>
                <p>Total Interest Saved (Home & Investments)</p>
                <p>${formatCurrency(totalInterestSaved)}</p>
                <p>Completely Debt Free In</p>
                <p>${formatYears(totalCrownPayoffYears)}</p>
            </div>
        `;
    }

    html += `
        <h2>Client & Loan Overview</h2>
        <table>
            <tr><th>Borrowers</th><td>${people.map(p => `${p.name} (Age ${p.age})`).join(', ')}</td></tr>
            <tr><th>Email</th><td>${clientEmail || 'N/A'}</td></tr>
            <tr><th>Phone</th><td>${clientPhone || 'N/A'}</td></tr>
            <tr><th>Number of Kids</th><td>${appState.numberOfKids}</td></tr>
            <tr><th>Attendance</th><td>${appState.allPartiesInAttendance}</td></tr>
            <tr><td colspan="2"><strong>Current Loan</strong></td></tr>
            <tr><th>Property Value</th><td>${formatCurrency(loan.propertyValue)}</td></tr>
            <tr><th>Loan Amount</th><td>${formatCurrency(loan.amount)}</td></tr>
            <tr><th>Offset Balance</th><td>${formatCurrency(loan.offsetBalance || 0)}</td></tr>
            <tr><th>Net Loan Amount</th><td><strong>${formatCurrency(netLoanAmount)}</strong></td></tr>
            <tr><th>Interest Rate</th><td>${loan.interestRate.toFixed(2)}%</td></tr>
            <tr><th>Repayment</th><td>${formatCurrency(loan.repayment)} / ${loan.frequency}</td></tr>
        </table>
    `;

    html += `
        <h2>Budget Summary</h2>
        <table>
            <tr><th>Total Monthly Income</th><td style="color: green;">${formatCurrency(totalMonthlyIncome)}</td></tr>
            <tr><th>Total Monthly Expenses</th><td style="color: red;">${formatCurrency(totalMonthlyExpenses)}</td></tr>
            <tr><th>Monthly Surplus</th><td><strong>${formatCurrency(totalMonthlyIncome - totalMonthlyExpenses)}</strong></td></tr>
        </table>
    `;
    
    html += `
        <h2>Detailed Budget</h2>
        <h3>Incomes</h3>
        <table>
            <thead><tr><th>Source</th><th>Amount</th><th>Frequency</th></tr></thead>
            <tbody>
                ${incomes.map(i => `<tr><td>${i.name}</td><td>${formatCurrency(i.amount)}</td><td style="text-transform: capitalize;">${i.frequency}</td></tr>`).join('')}
            </tbody>
        </table>
        <h3>Expenses</h3>
        <table>
            <thead><tr><th>Item</th><th>Category</th><th>Amount</th><th>Frequency</th></tr></thead>
            <tbody>
                ${expenses.map(e => `<tr><td>${e.name}</td><td>${e.category}</td><td>${formatCurrency(e.amount)}</td><td style="text-transform: capitalize;">${e.frequency}</td></tr>`).join('')}
            </tbody>
        </table>
    `;

    html += `
        <h2>Scenario Comparison: Primary Home Loan</h2>
        <table>
            <thead><tr><th>Metric</th><th>Bank</th><th>Crown Money</th></tr></thead>
            <tbody>
                <tr><td>Payoff Time</td><td>${formatYears(bankLoanCalculation.termInYears)}</td><td style="color: #007A8C; font-weight: bold;">${formatYears(crownMoneyLoanCalculation.termInYears)}</td></tr>
                <tr><td>Total Interest Paid</td><td>${formatCurrency(bankLoanCalculation.totalInterest)}</td><td style="color: #007A8C; font-weight: bold;">${formatCurrency(crownMoneyLoanCalculation.totalInterest)}</td></tr>
                ${people.map(p => `<tr><td>${p.name} Debt Free Age</td><td>${isBankLoanValid ? Math.ceil(p.age + bankLoanCalculation.termInYears) : 'N/A'}</td><td style="color: #007A8C; font-weight: bold;">${isCrownLoanValid ? Math.ceil(p.age + crownMoneyLoanCalculation.termInYears) : 'N/A'}</td></tr>`).join('')}
            </tbody>
        </table>
    `;

    if (futureChanges.length > 0 || futureLumpSums.length > 0) {
        html += `<h2>Future Financial Events</h2>`;
        if (futureChanges.length > 0) {
            html += `
                <h3>Scheduled Changes</h3>
                <table>
                    <thead><tr><th>Description</th><th>Type</th><th>Change</th><th>Timeline</th></tr></thead>
                    <tbody>
                        ${futureChanges.map(c => `<tr><td>${c.description}</td><td style="text-transform: capitalize;">${c.type}</td><td>${c.changeAmount > 0 ? '+' : ''}${formatCurrency(c.changeAmount)} / ${c.frequency}</td><td>${c.startDate} to ${c.isPermanent ? 'Permanent' : c.endDate}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
        }
        if (futureLumpSums.length > 0) {
            html += `
                <h3>Lump Sum Events</h3>
                <table>
                    <thead><tr><th>Description</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
                    <tbody>
                        ${futureLumpSums.map(l => `<tr><td>${l.description}</td><td style="text-transform: capitalize;">${l.type}</td><td>${formatCurrency(l.amount)}</td><td>${l.date}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
        }
    }
    
    if (hasInvestments) {
        html += `<h2>Investment Portfolio Summary</h2>`;
        investmentProperties.forEach(prop => {
            const monthlyRental = getMonthlyAmount(prop.rentalIncome, prop.rentalIncomeFrequency);
            const monthlyRepayment = getMonthlyAmount(prop.repayment, prop.repaymentFrequency);
            const monthlyExpenses = prop.expenses.reduce((sum, exp) => sum + getMonthlyAmount(exp.amount, exp.frequency), 0);
            const netCashflow = monthlyRental - monthlyRepayment - monthlyExpenses;

            html += `
                <h3>${prop.address}</h3>
                <table>
                    <tr><th>Property Value</th><td>${formatCurrency(prop.propertyValue)}</td></tr>
                    <tr><th>Loan Amount</th><td>${formatCurrency(prop.loanAmount)}</td></tr>
                    <tr><th>Rental Income</th><td>${formatCurrency(prop.rentalIncome)} / ${prop.rentalIncomeFrequency}</td></tr>
                    <tr><th>Net Monthly Cashflow</th><td style="color: ${netCashflow >= 0 ? 'green' : 'red'};">${formatCurrency(netCashflow)}</td></tr>
                </table>
            `;
        });
        
        html += `
            <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #ccc;">
                <table>
                    <tr><th>Total Portfolio Value</th><td>${formatCurrency(investmentProperties.reduce((s, p) => s + p.propertyValue, 0))}</td></tr>
                    <tr><th>Total Net Investment Debt</th><td>${formatCurrency(investmentLoanCalculations.totalInvestmentDebt - investmentProperties.reduce((s, p) => s + (p.offsetBalance || 0), 0))}</td></tr>
                    <tr><th>Total Net Monthly Cashflow</th><td style="color: ${investmentPropertiesNetCashflow >= 0 ? 'green' : 'red'}; font-weight: bold;">${formatCurrency(investmentPropertiesNetCashflow)}</td></tr>
                </table>
            </div>
        `;

        if (canCalculateInvestmentSavings) {
             html += `
                <h3>Investment Payoff Comparison</h3>
                <table>
                    <thead><tr><th>Metric</th><th>Bank</th><th>Crown Money</th></tr></thead>
                    <tbody>
                        <tr><td>Payoff Time</td><td>${formatYears(investmentLoanCalculations.totalBankTerm)}</td><td style="color: #007A8C; font-weight: bold;">${formatYears(investmentLoanCalculations.totalCrownTerm)}</td></tr>
                        <tr><td>Total Interest Paid</td><td>${formatCurrency(investmentLoanCalculations.totalBankInterest)}</td><td style="color: #007A8C; font-weight: bold;">${formatCurrency(investmentLoanCalculations.totalCrownInterest)}</td></tr>
                    </tbody>
                </table>
            `;
        }
    }
    
    if (isCrownLoanValid) {
        html += `
            <h2>Wealth Projection Summary</h2>
            <table>
                <tr><th>Investment Strategy</th><td>Investing ${investmentAmountPercentage}% of ${formatCurrency(monthlySavings)}/m</td></tr>
                <tr><th>Assumed Annual Growth</th><td>${investmentGrowthRate}%</td></tr>
                <tr><th>Retirement Age</th><td>${idealRetirementAge}</td></tr>
                <tr><th>Projected Net Position</th><td><strong>${formatCurrency(totalNetPositionAtRetirement)}</strong></td></tr>
            </table>
        `;
    }

    return html;
  }
  
  const handlePrint = () => {
    setIsDriveModalOpen(false);
    window.print();
  };

  const generateFlatData = (): [string, any][] => {
    const data: [string, any][] = [];
    const { 
        bankLoanCalculation, crownMoneyLoanCalculation, 
        investmentLoanCalculations, totalMonthlyIncome, totalMonthlyExpenses, getMonthlyAmount,
        investmentPropertiesNetCashflow
    } = calculations;

    const isBankLoanValid = bankLoanCalculation.termInYears !== Infinity;
    const isCrownLoanValid = crownMoneyLoanCalculation.termInYears !== Infinity;
    
    const addProperty = (key: string, value: any) => {
        if (value !== null && value !== undefined && !(typeof value === 'number' && isNaN(value))) {
            data.push([key.toLowerCase().replace(/\s/g, '_'), value]);
        }
    };

    // --- Core Aggregates & Loan Details ---
    addProperty('property_value', appState.loan.propertyValue);
    addProperty('loan_amount', appState.loan.amount);
    addProperty('offset_balance', appState.loan.offsetBalance || 0);
    const netLoanAmount = appState.loan.amount - (appState.loan.offsetBalance || 0);
    addProperty('net_loan_amount', netLoanAmount);

    addProperty('monthly_net_income', totalMonthlyIncome);
    addProperty('monthly_expenses_without_mortgage', totalMonthlyExpenses);
    addProperty('net_investment_cashflow', investmentPropertiesNetCashflow);
    
    if (isBankLoanValid) {
        const firstYearBankPrincipal = bankLoanCalculation.amortizationSchedule.slice(0, 12).reduce((acc: number, curr: any) => acc + curr.principalPaid, 0);
        addProperty('current_annual_debt_reduction', firstYearBankPrincipal);
    }
    
    appState.people.forEach((person, index) => {
        addProperty(`loan_holder_${index + 1}_name`, person.name);
        addProperty(`loan_holder_${index + 1}_age`, person.age);
    });

    addProperty('current_lender_sales', appState.currentLender);
    addProperty('repayment_frequency', appState.loan.frequency);
    
    const monthlyRepayment = getMonthlyAmount(appState.loan.repayment, appState.loan.frequency);
    addProperty('total_monthly_repayments_current', monthlyRepayment);

    const debtRepayExpense = appState.expenses.find(e => e.name === 'Debt Repay');
    const monthlyDebtRepay = debtRepayExpense ? getMonthlyAmount(debtRepayExpense.amount, debtRepayExpense.frequency) : 0;
    addProperty('other_debts', monthlyDebtRepay);
    
    if (isBankLoanValid && bankLoanCalculation.totalPaid > 0) {
        addProperty('of_payments_spent_on_interest', (bankLoanCalculation.totalInterest / bankLoanCalculation.totalPaid) * 100);
    }

    addProperty('interest_left_to_pay_sales', isBankLoanValid ? bankLoanCalculation.totalInterest : null);
    addProperty('years_left_on_current_loan', isBankLoanValid ? bankLoanCalculation.termInYears : null);
    addProperty('years_left_on_hop_loan', isCrownLoanValid ? crownMoneyLoanCalculation.termInYears : null);
    addProperty('total_interest_payable_on_hop_loan', isCrownLoanValid ? crownMoneyLoanCalculation.totalInterest : null);

    const primaryInterestSaved = isBankLoanValid && isCrownLoanValid ? bankLoanCalculation.totalInterest - crownMoneyLoanCalculation.totalInterest : 0;
    addProperty('interest_saved_on_mortgage', primaryInterestSaved);
    
    if (isCrownLoanValid) {
        const firstYearCrownPrincipal = crownMoneyLoanCalculation.amortizationSchedule.slice(0, 12).reduce((acc: number, curr: any) => acc + curr.principalPaid, 0);
        addProperty('expected_annual_debt_reduction_on_hop', firstYearCrownPrincipal);
    }

    if (isBankLoanValid && isCrownLoanValid) {
        addProperty('years_saved_on_mortgage', bankLoanCalculation.termInYears - crownMoneyLoanCalculation.termInYears);
    }
    
    addProperty('number_of_kids', appState.numberOfKids);
    addProperty('all_parties_in_attendance', appState.allPartiesInAttendance);

    const fffExpenses = appState.expenses.filter(e => e.category === 'FFF');
    const monthlyFFF = fffExpenses.reduce((sum, exp) => sum + getMonthlyAmount(exp.amount, exp.frequency), 0);
    const weeklyFFF = monthlyFFF * 12 / 52;
    addProperty('weekly_spend_amount', weeklyFFF);

    addProperty('current_interest_rate', appState.loan.interestRate);

    // --- Detailed Itemized Data ---
    appState.incomes.forEach((income, index) => {
        addProperty(`income_${index + 1}_name`, income.name);
        addProperty(`income_${index + 1}_amount`, income.amount);
        addProperty(`income_${index + 1}_frequency`, income.frequency);
        addProperty(`income_${index + 1}_monthly_amount`, getMonthlyAmount(income.amount, income.frequency));
    });

    appState.expenses.forEach((expense, index) => {
        addProperty(`expense_${index + 1}_name`, expense.name);
        addProperty(`expense_${index + 1}_amount`, expense.amount);
        addProperty(`expense_${index + 1}_frequency`, expense.frequency);
        addProperty(`expense_${index + 1}_category`, expense.category);
        addProperty(`expense_${index + 1}_monthly_amount`, getMonthlyAmount(expense.amount, expense.frequency));
    });

    appState.otherDebts.forEach((debt, index) => {
        const debtPrefix = `other_debt_${index + 1}`;
        addProperty(`${debtPrefix}_name`, debt.name);
        addProperty(`${debtPrefix}_amount`, debt.amount);
        addProperty(`${debtPrefix}_interest_rate`, debt.interestRate);
        addProperty(`${debtPrefix}_repayment`, debt.repayment);
        addProperty(`${debtPrefix}_frequency`, debt.frequency);
    });

    appState.futureChanges.forEach((change, index) => {
        addProperty(`future_change_${index + 1}_description`, change.description);
        addProperty(`future_change_${index + 1}_type`, change.type);
        addProperty(`future_change_${index + 1}_change_amount`, change.changeAmount);
        addProperty(`future_change_${index + 1}_frequency`, change.frequency);
        addProperty(`future_change_${index + 1}_start_date`, change.startDate);
        addProperty(`future_change_${index + 1}_end_date`, change.endDate);
        addProperty(`future_change_${index + 1}_is_permanent`, change.isPermanent);
    });

    appState.futureLumpSums.forEach((lump, index) => {
        addProperty(`future_lump_sum_${index + 1}_description`, lump.description);
        addProperty(`future_lump_sum_${index + 1}_type`, lump.type);
        addProperty(`future_lump_sum_${index + 1}_amount`, lump.amount);
        addProperty(`future_lump_sum_${index + 1}_date`, lump.date);
    });

    appState.investmentProperties.forEach((prop, index) => {
        const propPrefix = `investment_prop_${index + 1}`;
        addProperty(`${propPrefix}_address`, prop.address);
        addProperty(`${propPrefix}_value`, prop.propertyValue);
        addProperty(`${propPrefix}_loan_amount`, prop.loanAmount);
        addProperty(`${propPrefix}_offset`, prop.offsetBalance);
        addProperty(`${propPrefix}_interest_rate`, prop.interestRate);
        addProperty(`${propPrefix}_loan_term`, prop.loanTerm);
        addProperty(`${propPrefix}_loan_type`, prop.loanType);
        addProperty(`${propPrefix}_repayment`, prop.repayment);
        addProperty(`${propPrefix}_repayment_frequency`, prop.repaymentFrequency);
        addProperty(`${propPrefix}_rental_income`, prop.rentalIncome);
        addProperty(`${propPrefix}_rental_income_frequency`, prop.rentalIncomeFrequency);
        
        prop.expenses.forEach((exp, expIndex) => {
            const expPrefix = `${propPrefix}_expense_${expIndex + 1}`;
            addProperty(`${expPrefix}_name`, exp.name);
            addProperty(`${expPrefix}_amount`, exp.amount);
            addProperty(`${expPrefix}_frequency`, exp.frequency);
        });
    });

    return data;
  };


  const generateSummaryCSV = (): string => {
    const flatData = generateFlatData();

    const formatKeyToProperName = (key: string): string => {
      let formattedKey = key.replace(/_/g, ' ');
      let words = formattedKey.split(' ').filter(Boolean);
      words = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
      let finalName = words.join(' ');
      finalName = finalName.replace(/Id/g, 'ID');
      finalName = finalName.replace(/Hop/g, 'HOP');
      finalName = finalName.replace(/Oodc/g, 'OODC');
      return finalName;
    };

    const formatForCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      if (str.search(/("|,|\n)/g) >= 0) {
        return `"${str}"`;
      }
      return str;
    };
    
    const rows = flatData.map(([key, value]) => {
        const properName = formatKeyToProperName(key);
        let formattedValue = value;
        if (typeof value === 'number') {
            formattedValue = Math.round(value * 100) / 100;
        }
        return [properName, key, formattedValue];
    });

    rows.unshift(['Field Name', 'HubSpot Property', 'Value']);
    
    return rows.map(row => row.map(formatForCSV).join(',')).join('\n');
  };

  const handleSaveCSV = () => {
    setIsDriveModalOpen(false);
    const csvContent = generateSummaryCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const emailPrefix = appState.clientEmail ? String(appState.clientEmail).split('@')[0].replace(/[^a-z0-9]/gi, '_') : 'summary';
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `crown_money_summary_${emailPrefix}_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExplain = () => {
      if (isSpeaking) {
          cancel();
      } else {
          const explanation = tabExplanations[activeTab];
          if (explanation) {
              speak(explanation);
          }
      }
  };

  const handleResetApp = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setAppState(emptyAppState);
      setIsResetModalOpen(false);
    } catch (error) {
      console.error("Failed to reset state:", error);
    }
  };

  const handleCreateSnapshot = () => {
    setSnapshot(appState);
    setInfoToast('Scenario snapshot created!');
  };

  const handleRevert = () => {
    if (snapshot) {
        setAppState(snapshot);
        setSnapshot(null);
        setInfoToast('Reverted to previous snapshot.');
    }
    setIsRevertModalOpen(false);
  };
  
  const handleOpenSaveModal = () => {
    const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const suggestedName = appState.clientEmail 
        ? `${appState.clientEmail.split('@')[0]} - ${date}` 
        : `New Scenario - ${date}`;
    setScenarioNameInput(suggestedName);
    setIsSaveModalOpen(true);
  };

  const handleSaveScenario = () => {
      if (!scenarioNameInput.trim()) {
          alert("Please enter a name for the scenario.");
          return;
      }
      const newScenario: SavedScenario = {
          id: Date.now(),
          name: scenarioNameInput.trim(),
          timestamp: Date.now(),
          data: appState,
      };
      updateSavedScenarios([...savedScenarios, newScenario]);
      setIsSaveModalOpen(false);
      setInfoToast('Scenario saved successfully!');
  };

  const handleLoadScenario = (id: number) => {
      const scenarioToLoad = savedScenarios.find(s => s.id === id);
      if (scenarioToLoad) {
          setAppState(scenarioToLoad.data);
          setIsLoadModalOpen(false);
          setInfoToast(`Scenario "${scenarioToLoad.name}" loaded.`);
      }
  };

  const handleDeleteScenario = (id: number) => {
      const scenarioToDelete = savedScenarios.find(s => s.id === id);
      if (scenarioToDelete && window.confirm(`Are you sure you want to delete the scenario "${scenarioToDelete.name}"?`)) {
          const newScenarios = savedScenarios.filter(s => s.id !== id);
          updateSavedScenarios(newScenarios);
          setInfoToast('Scenario deleted.');
      }
  };

  const handleExportScenario = (id: number) => {
      const scenarioToExport = savedScenarios.find(s => s.id === id);
      if (!scenarioToExport) return;

      const jsonContent = JSON.stringify(scenarioToExport.data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const sanitizedName = scenarioToExport.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.setAttribute("download", `crown_money_scenario_${sanitizedName}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      importFileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("File is not readable text.");
              
              const importedData = JSON.parse(text);

              if (!importedData.loan || !importedData.people || !importedData.expenses) {
                  throw new Error("Invalid scenario file format.");
              }

              const scenarioName = prompt("Please enter a name for the imported scenario:", file.name.replace('.json', ''));
              if (scenarioName) {
                  const newScenario: SavedScenario = {
                      id: Date.now(),
                      name: scenarioName,
                      timestamp: Date.now(),
                      data: { ...initialAppState, ...importedData }, // Merge with defaults to ensure compatibility
                  };
                  updateSavedScenarios([...savedScenarios, newScenario]);
                  setInfoToast(`Scenario "${scenarioName}" imported successfully!`);
              }
          } catch (error) {
              console.error("Failed to import scenario:", error);
              alert(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          } finally {
              if (event.target) {
                  event.target.value = '';
              }
          }
      };
      reader.readAsText(file);
  };

  const primaryClientEmail = appState.clientEmail;

  const buttonBaseClasses = "p-2 bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-color)] focus:ring-[var(--title-color)]";
  
  const APP_PASSWORD = 'Crown';

  const handleLoginSuccess = () => {
    try {
      sessionStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Could not write to session storage:", error);
      // Fallback for private browsing mode, just authenticate for the current view
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} correctPassword={APP_PASSWORD} />;
  }


  return (
    <div className="min-h-screen text-[var(--text-color)] font-sans p-4 sm:p-8 print:p-4 print:bg-white print:text-black">
      <style>{`
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
      `}</style>
      
      {infoToast && (
        <div className="fixed top-8 right-8 z-50 p-4 rounded-lg text-white font-semibold shadow-2xl bg-green-600 transform transition-all duration-300 translate-x-0 opacity-100">
            {infoToast}
        </div>
      )}
      <Toast status={zapierStatus} messages={zapierMessages} className="top-20" />


      <div className="hidden print:block">
          <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-400">
            <CrownLogo className="h-12 w-auto text-black" />
            {primaryClientEmail && <p className="text-lg font-semibold">Client Report: {primaryClientEmail}</p>}
          </header>
      </div>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-color)] print:hidden">
          <CrownLogo className="h-12 w-auto text-[var(--text-color)]" />
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
              <button onClick={handleOpenSaveModal} title="Save Scenario" className={buttonBaseClasses}>
                  <SaveIcon className="h-5 w-5"/>
                  <span className="text-sm font-semibold hidden sm:inline">Save Scenario</span>
              </button>
              <button onClick={() => setIsLoadModalOpen(true)} title="Load Scenarios" className={buttonBaseClasses}>
                  <FolderOpenIcon className="h-5 w-5"/>
                  <span className="text-sm font-semibold hidden sm:inline">Scenarios</span>
              </button>
              <button onClick={handleCreateSnapshot} title="Create Snapshot" className={buttonBaseClasses}>
                  <CameraIcon className="h-5 w-5"/>
                  <span className="text-sm font-semibold hidden sm:inline">Create Snapshot</span>
              </button>
              {snapshot && (
                <button 
                  onClick={() => setIsRevertModalOpen(true)} 
                  title="Revert Changes" 
                  className="p-2 bg-yellow-500 text-white dark:text-black hover:bg-yellow-600 rounded-md flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-color)] focus:ring-yellow-500"
                >
                    <UndoIcon className="h-5 w-5"/>
                    <span className="text-sm font-semibold hidden sm:inline">Revert Changes</span>
                </button>
              )}
              <button onClick={() => setIsDriveModalOpen(true)} title="Export Client Report" className={buttonBaseClasses}>
                  <PrintIcon className="h-5 w-5"/>
                  <span className="text-sm font-semibold hidden sm:inline">Export Report</span>
              </button>
               <button onClick={() => setIsCalculatorOpen(true)} title="Advanced Calculator" className={buttonBaseClasses}>
                  <CalculatorIcon className="h-5 w-5"/>
                  <span className="text-sm font-semibold hidden sm:inline">Calculator</span>
               </button>
               <button onClick={handleExplain} title="Explain this Tab" className={buttonBaseClasses}>
                  {isSpeaking ? <SpeakerOffIcon className="h-5 w-5"/> : <SpeakerOnIcon className="h-5 w-5"/>}
                  <span className="text-sm font-semibold hidden sm:inline">{isSpeaking ? 'Stop' : 'Explain'}</span>
               </button>
               <button onClick={() => setIsResetModalOpen(true)} title="Start Fresh" className={buttonBaseClasses}>
                    <TrashIcon className="h-5 w-5"/>
                    <span className="text-sm font-semibold hidden sm:inline">Reset</span>
                </button>
               <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle Theme" className={buttonBaseClasses}>
                  {theme === 'dark' ? <SunIcon className="h-5 w-5"/> : <MoonIcon className="h-5 w-5"/>}
               </button>
          </div>
        </header>

        <main className="bg-[var(--card-bg-color)] backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-2xl border border-[var(--border-color)] print:bg-transparent print:p-0 print:shadow-none print:border-none">
          <nav className="mb-6 print:hidden">
            <div className="border-b border-[var(--border-color)]">
              <div className="-mb-px flex flex-wrap space-x-2 sm:space-x-6 justify-center" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-[var(--title-color)] text-[var(--title-color)]'
                        : 'border-transparent text-[var(--text-color-muted)] hover:border-gray-400 hover:text-[var(--text-color)]'
                    } whitespace-nowrap border-b-2 py-3 px-1 text-sm sm:text-base font-medium transition-colors focus:outline-none`}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
          
          <div className="mt-4 print:hidden">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
          
          <div className="hidden print:block">
            <Tab5_Summary appState={appState} setAppState={setAppState} calculations={calculations} onUploadRecord={executeZapierSync} zapierStatus={zapierStatus} />
          </div>
          
          <div className="mt-8 pt-4 border-t border-[var(--border-color)] border-dashed text-xs text-[var(--text-color-muted)] print:text-gray-600 print:mt-6 print:pt-4 print:border-t print:border-gray-200">
            <h5 className="font-bold mb-2 text-[var(--text-color)] print:text-black">General Advice Disclaimer:</h5>
            <p className="mb-2">
              The information and projections provided by this tool are of a general nature only and do not take into account your personal objectives, financial situation, or needs. The results are illustrative estimates based on the data you provide and certain assumptions, which may change over time.
            </p>
            <p className="mb-2">
              Before acting on any information or results generated, you should consider whether it is appropriate to your individual circumstances and, where necessary, seek advice from a licensed financial adviser.
            </p>
            <p>
              While every effort has been made to ensure accuracy, Crown Money and its representatives make no warranty or representation as to the accuracy or completeness of the projections. Past performance is not indicative of future results.
            </p>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isZapierPasswordModalOpen}
        onClose={() => setIsZapierPasswordModalOpen(false)}
        title="Enter Password to Upload Record"
      >
        <div className="space-y-4">
            <p className="text-sm text-[var(--text-color-muted)]">Please enter the agent password to proceed with the record upload.</p>
            <div>
                <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Password</label>
                <input
                    type="password"
                    value={zapierPasswordInput}
                    onChange={(e) => setZapierPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleZapierPasswordSubmit()}
                    className="w-full bg-[var(--input-bg-color)] p-2 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]"
                    autoFocus
                />
            </div>
            {zapierPasswordError && (
                <p className="text-sm text-red-400">{zapierPasswordError}</p>
            )}
            <button
                onClick={handleZapierPasswordSubmit}
                className="w-full p-2 bg-[var(--button-bg-color)] text-white rounded-md font-semibold hover:bg-[var(--button-bg-hover-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--title-color)]"
            >
                Confirm and Upload
            </button>
        </div>
      </Modal>

      <Modal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        title="Advanced Finance Calculator"
      >
        <AdvancedCalculator />
      </Modal>

      <Modal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        title="Export Client Report"
      >
        <div className="space-y-4 text-sm text-[var(--text-color-muted)]">
            <p>You can export the client report in two different formats:</p>
            <div className="flex items-start gap-4 p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                <div className="flex-shrink-0 bg-[var(--title-color)] text-[var(--bg-color)] print:text-white rounded-full h-6 w-6 flex items-center justify-center font-bold">1</div>
                <div>
                    <h4 className="font-bold text-[var(--text-color)]">Generate & Save PDF</h4>
                    <p>Creates a visual PDF report. This is best for sharing with clients.</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-black/10 dark:bg-white/5 rounded-lg">
                <div className="flex-shrink-0 bg-[var(--title-color)] text-[var(--bg-color)] print:text-white rounded-full h-6 w-6 flex items-center justify-center font-bold">2</div>
                <div>
                    <h4 className="font-bold text-[var(--text-color)]">Save as CSV</h4>
                    <p>Exports all data fields individually into a CSV file. Ideal for spreadsheets or importing into other systems like HubSpot.</p>
                </div>
            </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
                onClick={handlePrint} 
                className="w-full p-2 bg-[var(--button-bg-color)] text-white rounded-md font-semibold hover:bg-[var(--button-bg-hover-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--title-color)]"
            >
                Generate & Save PDF
            </button>
            <button 
                onClick={handleSaveCSV}
                className="w-full p-2 bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md font-semibold text-center border border-[var(--border-color)] transition-colors flex items-center justify-center gap-2"
            >
                <DownloadIcon className="h-5 w-5" />
                <span>Save as CSV</span>
            </button>
        </div>
      </Modal>

      <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Reset All Data"
        >
          <div className="space-y-6">
            <p className="text-sm text-[var(--text-color-muted)]">
              Are you sure you want to start fresh? This will clear all your inputs and saved data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md font-semibold text-center border border-[var(--border-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--title-color)]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetApp}
                className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Reset Data
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isRevertModalOpen}
          onClose={() => setIsRevertModalOpen(false)}
          title="Revert to Snapshot"
        >
          <div className="space-y-6">
            <p className="text-sm text-[var(--text-color-muted)]">
              Are you sure you want to revert to your last snapshot? All changes made since the snapshot was created will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRevertModalOpen(false)}
                className="px-4 py-2 bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md font-semibold text-center border border-[var(--border-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--title-color)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md font-semibold hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Revert Changes
              </button>
            </div>
          </div>
        </Modal>

      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Scenario"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-color-muted)]">Enter a name to save the current scenario.</p>
          <div>
            <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">Scenario Name</label>
            <input
              type="text"
              value={scenarioNameInput}
              onChange={(e) => setScenarioNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveScenario()}
              className="w-full bg-[var(--input-bg-color)] p-2 rounded-md border border-[var(--input-border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus-color)]"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="px-4 py-2 bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md font-semibold text-center border border-[var(--border-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--title-color)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveScenario}
              className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md font-semibold hover:bg-[var(--button-bg-hover-color)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--title-color)]"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        title="Load or Manage Scenarios"
      >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {savedScenarios.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-color-muted)] py-8">No saved scenarios yet. Use the "Save" button to create one.</p>
              ) : (
                  <ul className="space-y-3">
                      {savedScenarios.map(scenario => (
                          <li key={scenario.id} className="p-3 bg-black/10 dark:bg-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-grow">
                                  <p className="font-semibold text-[var(--text-color)]">{scenario.name}</p>
                                  <p className="text-xs text-[var(--text-color-muted)]">
                                      Last modified: {new Date(scenario.timestamp).toLocaleString()}
                                  </p>
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-2 flex-wrap">
                                  <button onClick={() => handleLoadScenario(scenario.id)} className="px-3 py-1 text-sm bg-[var(--button-bg-color)] text-white rounded-md font-semibold hover:bg-[var(--button-bg-hover-color)] transition-colors">Load</button>
                                  <button onClick={() => handleExportScenario(scenario.id)} className="px-3 py-1 text-sm bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md border border-[var(--border-color)] transition-colors flex items-center gap-1.5"><DownloadIcon className="h-4 w-4"/> Export</button>
                                  <button onClick={() => handleDeleteScenario(scenario.id)} className="px-3 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md transition-colors">Delete</button>
                              </div>
                          </li>
                      ))}
                  </ul>
              )}
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
              <p className="text-sm text-[var(--text-color-muted)]">Have a scenario file?</p>
              <input type="file" ref={importFileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />
              <button onClick={handleImportClick} className="px-4 py-2 bg-[var(--card-bg-color)] hover:bg-[var(--input-bg-color)] rounded-md font-semibold text-center border border-[var(--border-color)] transition-colors flex items-center justify-center gap-2">
                  <UploadIcon className="h-5 w-5"/>
                  <span>Import Scenario</span>
              </button>
          </div>
      </Modal>
      
      <Assistant appState={appState} calculations={calculations} activeTab={tabs.find(t => t.id === activeTab)?.label || 'Current Loan'} />

    </div>
  );
};

export default App;
