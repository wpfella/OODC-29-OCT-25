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
    if (isNaN(value) || !isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
};

const getYear1Data = (schedule: AmortizationDataPoint[]) => {
    if (!schedule) return { interest: 0, principal: 0 };
    const year1Schedule = schedule.slice(0, 12);
    const interest = year1Schedule.reduce((sum, item) => sum + item.interestPaid, 0);
    const principal = year1Schedule.reduce((sum, item) => sum + item.principalPaid, 0);
    return { interest, principal };
};


const generateAssistantContext = (appState: AppState, calculations: any, activeTab: string): string => {
    const { 
        loan, people, investmentProperties, idealRetirementAge, payoffStrategy, futureChanges, futureLumpSums,
        incomes, expenses, otherDebts
    } = appState;
    const { 
        bankLoanCalculation, 
        crownMoneyLoanCalculation, 
        investmentLoanCalculations,
        totalMonthlyIncome,
        totalMonthlyLivingExpenses,
        totalMonthlyExpenses,
        retirementWealthProjection,
        investmentPropertiesNetCashflow
    } = calculations;

    const bankYear1 = getYear1Data(bankLoanCalculation.amortizationSchedule);
    const crownYear1 = getYear1Data(crownMoneyLoanCalculation.amortizationSchedule);

    const summary = {
        activeTab: activeTab,
        client: {
            borrowers: people.map(p => `${p.name} (Age ${p.age})`),
            email: appState.clientEmail || 'Not provided',
        },
        primaryLoan: {
            amount: formatCurrency(loan.amount),
            interestRate: `${loan.interestRate.toFixed(2)}%`,
            repayment: `${formatCurrency(loan.repayment)} / ${loan.frequency}`,
            offsetBalance: formatCurrency(loan.offsetBalance),
            netLoanAmount: formatCurrency(loan.amount - loan.offsetBalance),
        },
        budget: {
            totalMonthlyIncome: formatCurrency(totalMonthlyIncome),
            totalMonthlyLivingExpenses: formatCurrency(totalMonthlyLivingExpenses),
            monthlySurplus: formatCurrency(totalMonthlyIncome - totalMonthlyLivingExpenses),
            investmentNetCashflow: formatCurrency(investmentPropertiesNetCashflow),
        },
        formulas: {
            netLoanAmount: "Loan Amount - Offset Balance",
            monthlySurplus: "Total Monthly Income - Total Monthly Living Expenses",
            totalInterestSaved: "(Bank Total Interest - Crown Money Total Interest) for all loans combined.",
            yearsSaved: "Bank Payoff Years - Crown Money Payoff Years",
            debtRecyclingNetProfit: "(Investment Returns - Investment Loan Interest) * (1 - Marginal Tax Rate)",
            netWorth: "Home Equity + Investment Portfolio Value - Remaining Debt",
            investmentPower: "This is your monthly surplus (Total Income - Total Monthly Expenses), which is available for investing once your home loan is paid off with the Crown Money strategy."
        },
        futureEvents: {
            scheduledChanges: futureChanges.map(c => ({
                description: c.description,
                type: c.type,
                change: `${c.changeAmount >= 0 ? '+' : ''}${formatCurrency(c.changeAmount)} / ${c.frequency}`,
                timeline: `From ${c.startDate} to ${c.isPermanent ? 'Permanent' : c.endDate}`
            })),
            lumpSumEvents: futureLumpSums.map(l => ({
                description: l.description,
                type: l.type,
                amount: formatCurrency(l.amount),
                date: l.date
            })),
        },
        investments: {
            count: investmentProperties.length,
            totalDebt: formatCurrency(investmentLoanCalculations.totalInvestmentDebt),
            payoffStrategy: payoffStrategy,
        },
        comparison: {
            bank: {
                primaryLoanPayoffYears: bankLoanCalculation.termInYears.toFixed(1),
                primaryLoanTotalInterest: formatCurrency(bankLoanCalculation.totalInterest),
                totalInvestmentPayoffYears: investmentLoanCalculations.totalBankTerm.toFixed(1),
                firstYearPrincipalPaid: formatCurrency(bankYear1.principal),
                firstYearInterestPaid: formatCurrency(bankYear1.interest)
            },
            crownMoney: {
                primaryLoanPayoffYears: crownMoneyLoanCalculation.termInYears.toFixed(1),
                primaryLoanTotalInterest: formatCurrency(crownMoneyLoanCalculation.totalInterest),
                totalInvestmentPayoffYears: investmentLoanCalculations.totalCrownTerm.toFixed(1),
                firstYearPrincipalPaid: formatCurrency(crownYear1.principal),
                firstYearInterestPaid: formatCurrency(crownYear1.interest)
            },
            savings: {
                totalInterestSaved: formatCurrency(
                    (bankLoanCalculation.totalInterest - crownMoneyLoanCalculation.totalInterest) +
                    (investmentLoanCalculations.totalBankInterest - investmentLoanCalculations.totalCrownInterest)
                ),
                yearsSavedOnPrimaryLoan: (bankLoanCalculation.termInYears - crownMoneyLoanCalculation.termInYears).toFixed(1)
            }
        },
        wealthProjection: {
            retirementAge: idealRetirementAge,
            projectedNetWorthAtRetirement: formatCurrency(
                retirementWealthProjection.wealth + retirementWealthProjection.cashInHand + retirementWealthProjection.homeEquity
            ),
        },
        // NEW DETAILED DATA
        itemizedIncomes: incomes,
        itemizedExpenses: expenses,
        itemizedOtherDebts: otherDebts,
        detailedInvestmentProperties: investmentProperties,
    };
    
    return JSON.stringify(summary, null, 2);
};


const Assistant: React.FC<AssistantProps> = ({ appState, calculations, activeTab }) => {
    const [isOpen, setIsOpen] = useState(false);
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
You are "Cody", an expert financial assistant for the Crown Money "Out of Debt Calculator". Your personality is helpful, knowledgeable, and slightly informal, using Australian-style language (e.g., "G'day", "no worries", "have a squiz"). 

Your primary role is to help the Crown Money sales agent explain the numbers, charts, and calculations to their client, using the provided JSON context. You should also encourage users to hover over the info icons on the app for quick tooltips.

**CRITICAL OUTPUT REQUIREMENTS:**
1.  **FORMAT:** Your entire response MUST be in well-structured, readable HTML. Use tags like <p>, <strong>, <em>, <ul>, and <li> for formatting. Do NOT use markdown.
2.  **CLARITY:** Explain everything in plain English. Avoid technical financial jargon. Do not use symbols or special characters unless it's a currency symbol ($) or a percentage sign (%).
3.  **STYLE:** Use paragraphs to separate ideas. Use bold tags (<strong>) to highlight key figures and terms. Use lists (<ul><li>) for breaking down steps or points. Do not use headings (<h1>, <h2> etc.).
4.  **CONCISENESS:** Be concise but thorough.

**HOW TO EXPLAIN CALCULATIONS:**
When a user asks 'how' a number is calculated or 'why' it is what it is, you MUST break it down using simple math and the values from the JSON context. Refer to the 'formulas' object in the JSON for the correct calculation method.

*   **Example Query:** "How do you calculate my Monthly Surplus?"
*   **Ideal Response:** "<p>No worries! We calculate your monthly surplus by taking your <strong>Total Monthly Income</strong> and subtracting your <strong>Total Monthly Living Expenses</strong>.</p><ul><li>Your Total Monthly Income is <strong>${JSON.parse(context).budget.totalMonthlyIncome}</strong>.</li><li>Your Total Monthly Living Expenses are <strong>${JSON.parse(context).budget.totalMonthlyLivingExpenses}</strong>.</li></ul><p>So, the math is: ${JSON.parse(context).budget.totalMonthlyIncome} - ${JSON.parse(context).budget.totalMonthlyLivingExpenses} = <strong>${JSON.parse(context).budget.monthlySurplus}</strong> available for debt reduction. You can also hover over the info icon on the 'Income & Expenses' tab for a quick summary of this!</p>"

**NEW: DETAILED DATA AVAILABLE**
The JSON context now includes detailed, itemized lists: 'itemizedIncomes', 'itemizedExpenses', 'itemizedOtherDebts', and 'detailedInvestmentProperties'. When a user asks a question about a *specific item* (e.g., "How much is my food budget?" or "What's the interest rate on my car loan?"), you MUST find that exact item in these lists and provide the specific details (amount, frequency, interest rate, etc.). This allows you to answer highly specific questions. ALWAYS refer to this detailed data for specifics.

**LUMP SUM EVENTS:**
When a user asks about a future lump sum event, you MUST use the specific details from the 'futureEvents.lumpSumEvents' section of the JSON context.
1.  State the event's description, amount, and date explicitly.
2.  Explain the impact for the **Bank Scenario**: An INCOME is added to the offset account. It does NOT directly pay down the loan. It simply reduces the interest calculated each month, which helps pay off the loan faster over time with the same fixed repayment. An EXPENSE is treated as a redraw, potentially increasing the loan balance if the offset is depleted.
3.  Explain the impact for the **Crown Money Scenario**: An INCOME is used to immediately and directly pay down the loan principal, causing a significant and instant reduction in debt. An EXPENSE also directly increases the loan balance.
4.  Reference the exact amounts and dates from the context to make your explanation concrete. This is crucial for the sales agent.

The user is currently on the "${activeTab}" tab.
Here is a JSON summary of their current financial data:
${context}

Based on this data, answer the user's question clearly.

User's Question: "${userInput}"
`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setMessages([...newMessages, { sender: 'ai', text: response.text }]);

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setMessages([...newMessages, { sender: 'ai', text: "<p>Sorry, I'm having a bit of trouble connecting right now. Please try again in a moment.</p>" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-[var(--title-color)] text-white p-4 rounded-full shadow-lg hover:bg-[var(--button-bg-hover-color)] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-color)] focus:ring-[var(--title-color)] z-40 print:hidden"
                aria-label="Open AI Assistant"
            >
                <SparklesIcon className="h-8 w-8" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-end sm:items-center z-50 print:hidden">
                    <div className="bg-[var(--card-bg-color)] border border-[var(--border-color)] rounded-t-2xl sm:rounded-2xl w-full max-w-2xl h-[80vh] sm:h-[70vh] flex flex-col shadow-2xl animate-fade-in-up">
                        <header className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
                            <h3 className="text-lg font-bold text-[var(--title-color)]">AI Financial Assistant</h3>
                            <button onClick={() => setIsOpen(false)} className="text-[var(--text-color-muted)] hover:text-[var(--text-color)]">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </header>

                        <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-[var(--text-color-muted)] p-8">
                                    <p className="font-semibold text-lg">G'day!</p>
                                    <p>I can now explain your figures. Ask me anything about your data, like:</p>
                                    <ul className="text-sm mt-4 space-y-2">
                                        <li className="p-2 bg-black/10 dark:bg-white/5 rounded-md">"How is my total interest saving calculated?"</li>
                                        <li className="p-2 bg-black/10 dark:bg-white/5 rounded-md">"Why doesn't the Bank loan balance drop after an inheritance?"</li>
                                        <li className="p-2 bg-black/10 dark:bg-white/5 rounded-md">"What's my weekly food budget?"</li>
                                    </ul>
                                </div>
                            )}
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-[var(--button-bg-color)] text-white' : 'bg-[var(--input-bg-color)]'}`}>
                                        {msg.sender === 'ai' ? (
                                            <div 
                                                className="text-sm ai-response-content"
                                                dangerouslySetInnerHTML={{ __html: msg.text }}
                                            />
                                        ) : (
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                 <div className="flex justify-start">
                                    <div className="max-w-md p-3 rounded-lg bg-[var(--input-bg-color)]">
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-color-muted)]">
                                            <div className="h-2 w-2 bg-[var(--title-color)] rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                            <div className="h-2 w-2 bg-[var(--title-color)] rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                            <div className="h-2 w-2 bg-[var(--title-color)] rounded-full animate-pulse"></div>
                                            <span>Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="p-4 border-t border-[var(--border-color)]">
                            <div className="flex items-center gap-2 bg-[var(--input-bg-color)] p-2 rounded-lg border border-[var(--input-border-color)] focus-within:ring-2 focus-within:ring-[var(--input-border-focus-color)]">
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask a question about your data..."
                                    className="flex-1 bg-transparent focus:outline-none resize-none text-sm"
                                    rows={1}
                                    disabled={isLoading}
                                />
                                <button onClick={handleSend} disabled={isLoading || !userInput.trim()} className="bg-[var(--button-bg-color)] text-white p-2 rounded-md disabled:bg-opacity-50 disabled:cursor-not-allowed transition-colors">
                                    <PaperAirplaneIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default Assistant;