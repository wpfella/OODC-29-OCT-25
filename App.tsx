
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Tab, ExpenseItem, SavedScenario } from './types';
import Tab1_CurrentLoan from './components/Tab1_CurrentLoan';
import Tab2_InterestBreakdown from './components/Tab2_InterestBreakdown';
import Tab3_IncomeExpenses from './components/Tab3_IncomeExpenses';
import Tab_InvestmentProperties from './components/Tab_InvestmentProperties';
import Tab4_OODC from './components/Tab4_OODC';
import Tab_InvestmentOODC from './components/Tab_InvestmentOODC';
import Tab_DebtRecycling from './components/Tab_DebtRecycling';
import Tab_In2Wealth from './components/Tab_In2Wealth';
import Tab_Reports from './components/Tab_Help';
import Tab5_Summary from './components/Tab5_Summary';
import { CrownLogo, CalculatorIcon, TrashIcon, CameraIcon, UndoIcon, SaveIcon, FolderOpenIcon, UploadIcon, ClipboardIcon, DownloadIcon } from './components/common/IconComponents';
import { useMortgageCalculations } from './hooks/useMortgageCalculations';
import Toast from './components/common/Toast';
import Modal from './components/common/Modal';
import AdvancedCalculator from './components/common/AdvancedCalculator';
import LoginScreen from './components/LoginScreen';
import Notepad from './components/Notepad';
import { useDebounce } from './hooks/useDebounce';

// Only keeping the Light Palette as requested
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
    { id: 1, name: 'Food', amount: 200, category: 'FFF', frequency: 'weekly' },
    { id: 2, name: 'Fun', amount: 125, category: 'FFF', frequency: 'weekly' },
    { id: 3, name: 'Fuel', amount: 75, category: 'FFF', frequency: 'weekly' },
    { id: 4, name: 'Holidays', amount: 3000, category: 'Soft Expenses', frequency: 'annually' },
    { id: 5, name: 'MISC', amount: 200, category: 'Soft Expenses', frequency: 'monthly' },
    { id: 6, name: 'Gifts', amount: 500, category: 'Soft Expenses', frequency: 'annually' },
    { id: 19, name: 'Clothes', amount: 100, category: 'Soft Expenses', frequency: 'monthly' },
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
  notepadContent: '',
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
  notepadContent: '',
};

const zapierMessages = {
    loading: 'Uploading record...',
    success: 'Record uploaded successfully!',
    error: 'Record upload failed. Please try again.',
};

const sanitizeAppState = (state: AppState): AppState => {
    const safeState = { ...state };
    // Safety Limits
    if (safeState.loan.interestRate > 20) safeState.loan.interestRate = 20;
    if (safeState.loan.interestRate < 0) safeState.loan.interestRate = 0;
    
    // Safety check: ensure repayment isn't unrealistically low compared to loan amount
    const netLoan = Math.max(0, safeState.loan.amount - (safeState.loan.offsetBalance || 0));
    if (netLoan > 0) {
        const annualInterest = netLoan * (safeState.loan.interestRate / 100);
        let annualRepayment = 0;
        
        switch (safeState.loan.frequency) {
            case 'weekly': annualRepayment = safeState.loan.repayment * 52; break;
            case 'fortnightly': annualRepayment = safeState.loan.repayment * 26; break;
            case 'monthly': annualRepayment = safeState.loan.repayment * 12; break;
            default: annualRepayment = safeState.loan.repayment * 12;
        }

        // If repayment is less than interest only (plus a tiny buffer), force correction
        if (annualRepayment < annualInterest) { 
             const safeMonthly = Math.ceil((annualInterest / 12) * 1.01);
             safeState.loan.repayment = safeMonthly;
             safeState.loan.frequency = 'monthly';
        }
    }
    
    if (safeState.loan.repayment < 0) safeState.loan.repayment = 0;
    
    return safeState;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CurrentLoan);
  const [zapierStatus, setZapierStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isZapierPasswordModalOpen, setIsZapierPasswordModalOpen] = useState(false);
  const [zapierPasswordInput, setZapierPasswordInput] = useState('');
  const [zapierPasswordError, setZapierPasswordError] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<AppState | null>(null);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [infoToast, setInfoToast] = useState('');
  const [warningToast, setWarningToast] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  

  useEffect(() => {
    if (infoToast) {
        const timer = setTimeout(() => setInfoToast(''), 3000);
        return () => clearTimeout(timer);
    }
  }, [infoToast]);

  useEffect(() => {
    if (warningToast) {
        const timer = setTimeout(() => setWarningToast(''), 8000); 
        return () => clearTimeout(timer);
    }
  }, [warningToast]);

  // Apply Light Theme only
  useEffect(() => {
    const palette = lightPalette;
    document.body.style.backgroundColor = palette['--bg-color'];
    for (const [key, value] of Object.entries(palette)) {
        document.documentElement.style.setProperty(key, value as string);
    }
  }, []);

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
        
        // Migration logic for old state versions
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
        
        return sanitizeAppState(mergedState);
      }
    } catch (error) {
      console.error("Failed to parse saved state from localStorage", error);
    }
    return initialAppState;
  });
  
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [appState]);
  
  useEffect(() => {
    try {
        const scenariosJSON = localStorage.getItem(SCENARIOS_STORAGE_KEY);
        if (scenariosJSON) {
            setSavedScenarios(JSON.parse(scenariosJSON));
        }
    } catch (error) {
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

  const debouncedAppState = useDebounce(appState, 500);
  const calculations = useMortgageCalculations(debouncedAppState);

  const executeZapierSync = async () => {
    if (!appState.clientEmail || appState.clientEmail.trim() === '') {
      alert("Please enter a client email address on the 'Summary' tab before syncing.");
      return;
    }
    setZapierStatus('loading');

    try {
      const getSerializableCalculations = (calcs: any) => {
        const {
          getMonthlyAmount,
          getAnnualAmount,
          calculatePIPayment,
          calculateIOPayment,
          wealthCalcs, 
          ...serializableData
        } = calcs;
        return serializableData;
      };

      const jsonData = {
        appState: appState,
        calculations: getSerializableCalculations(calculations),
      };

      // Payload for Zapier
      const payload = {
        client_email: appState.clientEmail,
        client_phone: appState.clientPhone,
        jsonData: jsonData,
      };

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
    { id: Tab.CurrentLoan, label: 'Current Loan', component: <Tab1_CurrentLoan appState={appState} setAppState={setAppState} calculations={calculations} setWarningToast={setWarningToast} /> },
    { id: Tab.InterestBreakdown, label: 'Int Breakdown', component: <Tab2_InterestBreakdown appState={appState} setAppState={setAppState} calculations={calculations} setWarningToast={setWarningToast} /> },
    { id: Tab.InvestmentProperties, label: 'Investments', component: <Tab_InvestmentProperties appState={appState} setAppState={setAppState} calculations={calculations} setWarningToast={setWarningToast} /> },
    { id: Tab.IncomeExpenses, label: 'Income & Expenses', component: <Tab3_IncomeExpenses appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.OODC, label: 'OODC', component: <Tab4_OODC appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.InvestmentOODC, label: 'Inv OODC', component: <Tab_InvestmentOODC appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.DebtRecycling, label: 'Debt Recycling', component: <Tab_DebtRecycling appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.In2Wealth, label: 'In 2 Wealth', component: <Tab_In2Wealth appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.Reports, label: 'Reports', component: <Tab_Reports appState={appState} setAppState={setAppState} calculations={calculations} /> },
    { id: Tab.Summary, label: 'Summary', component: <Tab5_Summary appState={appState} setAppState={setAppState} calculations={calculations} onUploadRecord={handleOpenZapierUploadModal} zapierStatus={zapierStatus} /> },
  ];
  
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
    const date = new Date().toLocaleDateString('en-CA'); 
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
                      data: { ...initialAppState, ...importedData }, 
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
            .app-header, .app-nav, .no-print {
                display: none !important;
            }
            .app-main {
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }
            .app-main > div {
                display: none !important;
            }
            .app-main > div.printable {
                display: block !important;
            }
        }
      `}</style>
      
      {infoToast && (
        <div className="fixed top-8 right-8 z-50 p-4 rounded-lg text-white font-semibold shadow-2xl bg-green-600 transform transition-all duration-300 translate-x-0 opacity-100 no-print">
            {infoToast}
        </div>
      )}
      {warningToast && (
        <div className="fixed top-24 right-8 z-50 p-4 rounded-lg text-white font-semibold shadow-2xl bg-amber-600 no-print animate-fade-in">
            {warningToast}
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
        <header className="app-header flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-color)] print:hidden">
          <CrownLogo className="h-12 w-auto text-[var(--text-color)]" />
          <div className="flex items-center gap-2 overflow-x-auto flex-nowrap py-1 pr-2">
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
               <button onClick={() => setIsCalculatorOpen(true)} title="Advanced Calculator" className={buttonBaseClasses}>
                  <CalculatorIcon className="h-5 w-5"/>
                  <span className="text-sm font-semibold hidden sm:inline">Calculator</span>
               </button>
               <button onClick={() => setIsNotepadOpen(prev => !prev)} title="Open Notepad" className={buttonBaseClasses}>
                   <ClipboardIcon className="h-5 w-5"/>
                   <span className="text-sm font-semibold hidden sm:inline">Notepad</span>
               </button>
               <button onClick={() => setIsResetModalOpen(true)} title="Start Fresh" className={buttonBaseClasses}>
                    <TrashIcon className="h-5 w-5"/>
                    <span className="text-sm font-semibold hidden sm:inline">Reset</span>
                </button>
          </div>
        </header>

        <main className="bg-[var(--card-bg-color)] backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-2xl border border-[var(--border-color)] print:bg-transparent print:p-0 print:shadow-none print:border-none">
          <nav className="app-nav mb-6 print:hidden">
            <div className="border-b border-[var(--border-color)]">
              <div className="-mb-px flex flex-wrap space-x-2 sm:space-x-4 justify-center" aria-label="Tabs">
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
          
          <div className="app-main mt-4">
             {tabs.map(tab => (
                <div key={tab.id} className={`${activeTab === tab.id ? 'active-tab-content' : 'hidden'} ${tab.id === Tab.Reports ? 'printable' : ''}`}>
                    {tab.component}
                </div>
            ))}
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
      
      <Notepad
        isOpen={isNotepadOpen}
        onClose={() => setIsNotepadOpen(false)}
        content={appState.notepadContent}
        setContent={(newContent) => setAppState(prev => ({...prev, notepadContent: newContent}))}
      />
    </div>
  );
};

export default App;
