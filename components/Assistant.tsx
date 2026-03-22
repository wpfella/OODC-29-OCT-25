import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AppState, AmortizationDataPoint } from '../types';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from './common/IconComponents';

interface AssistantProps {
  appState: AppState;
  calculations: any;
  activeTab: string;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const formatCurrency = (value: number, digits = 0) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
};

const generateAssistantContext = (appState: AppState, calculations: any, activeTab: string): string => {
    const { 
        loan, people, investmentProperties, idealRetirementAge, payoffStrategy,
        crownMoneyInterestRate, otherDebts, incomes, expenses
    } = appState;
    const { 
        bankLoanCalculation, 
        crownMoneyLoanCalculation, 
        investmentLoanCalculations,
        otherDebtsStatusQuoInterest,
        totalMonthlyIncome,
        totalMonthlyExpenses,
        surplus,
        totalInitialDebt,
        totalInitialPropertyValues,
        initialLVR
    } = calculations;

    const assetBreakdown = investmentLoanCalculations.investmentPayoffSchedule.map((inv: any) => {
        const prop = investmentProperties.find(p => p.id === inv.propertyId);
        return {
            address: prop?.address || 'Unknown',
            value: formatCurrency(prop?.propertyValue || 0),
            loan: formatCurrency(prop?.loanAmount || 0),
            interestSaved: formatCurrency(inv.bank.totalInterest - inv.crown.totalInterest),
            yearsSaved: `${(inv.bank.termInYears - inv.crown.termInYears).toFixed(1)} years`
        };
    });

    const summary = {
        currentTab: activeTab,
        borrowers: people.map(p => `${p.name} (Age: ${p.age})`),
        primaryLoan: {
            amount: formatCurrency(loan.amount),
            interestRate: `${loan.interestRate}%`,
            repayment: `${formatCurrency(loan.repayment)} ${loan.frequency}`,
            offset: formatCurrency(loan.offsetBalance || 0),
            lvr: `${initialLVR.toFixed(1)}%`,
            mortgageInterestSaved: formatCurrency(bankLoanCalculation.totalInterest - (crownMoneyLoanCalculation.totalInterest - otherDebtsStatusQuoInterest)),
            consolidationInterestSaved: formatCurrency(otherDebtsStatusQuoInterest),
            totalSavings: formatCurrency(bankLoanCalculation.totalInterest + otherDebtsStatusQuoInterest - crownMoneyLoanCalculation.totalInterest),
            bankYears: bankLoanCalculation.termInYears.toFixed(1),
            crownYears: crownMoneyLoanCalculation.termInYears.toFixed(1)
        },
        consolidatedDebts: otherDebts.map(d => ({
            name: d.name,
            amount: formatCurrency(d.amount),
            rate: `${d.interestRate}%`,
            repayment: `${formatCurrency(d.repayment)} ${d.frequency}`
        })),
        totalInitialDebt: formatCurrency(totalInitialDebt),
        portfolioBreakdown: assetBreakdown,
        budget: {
            monthlyIncome: formatCurrency(totalMonthlyIncome),
            monthlyExpenses: formatCurrency(totalMonthlyExpenses),
            monthlySurplus: formatCurrency(surplus)
        },
        strategy: payoffStrategy,
        globalInterestRate: `${crownMoneyInterestRate}%`
    };
    
    return JSON.stringify(summary, null, 2);
};

const Assistant: React.FC<AssistantProps> = ({ appState, calculations, activeTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!userInput.trim() || isLoading) return;

        const newMessages: Message[] = [...messages, { sender: 'user', text: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const context = generateAssistantContext(appState, calculations, activeTab);

            const prompt = `
You are "Cody", the expert Financial Strategist for Crown Money.
Your goal is to explain the financial logic and results to the sales team.

STRICT RESPONSE RULES:
1. NO MARKDOWN: Never use asterisks (*) or double asterisks (**).
2. HTML ONLY: Use <div>, <p>, <strong>, <br>, <ul>, <li>, and <table>.
3. TONE: Professional but simple. No complex jargon unless explained.
4. ACCURACY: Refer to the context for all numbers.

CONTEXT DATA:
${context}

User Question: "${userInput}"
`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setMessages([...newMessages, { sender: 'ai', text: response.text || '<p>I couldn\'t generate a response.</p>' }]);

        } catch (error) {
            console.error(error);
            setMessages([...newMessages, { sender: 'ai', text: "<p>Sorry, I encountered a connection issue. Please try again.</p>" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-[var(--title-color)] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] print:hidden"
            >
                <SparklesIcon className="h-7 w-7" />
            </button>

            {isOpen && (
                <div className={`fixed bottom-6 right-6 z-[110] flex flex-col shadow-2xl transition-all duration-300 animate-fade-in-up bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden ${isExpanded ? 'w-[90vw] h-[80vh] max-w-4xl' : 'w-80 h-96 sm:w-96 sm:h-[500px]'}`}>
                    <header className="p-3 border-b border-slate-100 flex justify-between items-center bg-[var(--title-color)] text-white">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4" />
                            <h3 className="font-black uppercase tracking-tighter text-sm">Cody: Strategy Pro</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] uppercase font-bold px-2 py-0.5 border border-white/30 rounded hover:bg-white/10">
                                {isExpanded ? 'Shrink' : 'Expand'}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
                        {messages.length === 0 && (
                            <div className="text-center py-8 opacity-60 flex flex-col items-center">
                                <SparklesIcon className="h-10 w-10 mb-2 text-indigo-400" />
                                <p className="font-bold">G'day! I'm Cody.</p>
                                <p className="text-[11px] px-8 mt-1">Need help explaining these savings to the client? Just ask.</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm ${msg.sender === 'user' ? 'bg-[var(--title-color)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                                    <div className="ai-response-content" dangerouslySetInnerHTML={{ __html: msg.text }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Cody is thinking...</div>
                            </div>
                        )}
                    </div>

                    <footer className="p-3 border-t border-slate-100 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-end gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 shadow-inner">
                            <textarea
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none max-h-32"
                                placeholder="Explain the interest gap..."
                                rows={1}
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            />
                            <button onClick={handleSend} className="bg-[var(--title-color)] text-white p-2 rounded-lg hover:shadow-lg transition-all active:scale-90">
                                <PaperAirplaneIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};

export default Assistant;