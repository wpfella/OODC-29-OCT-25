
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Modal from './common/Modal';
import { SparklesIcon, TrashIcon, SaveIcon, ArrowPathIcon } from './common/IconComponents';
import { AppState, CustomSection } from '../types';

interface Props {
    appState: AppState;
    calculations: any;
    isOpen: boolean;
    onClose: () => void;
    currentTab: string;
    onAddSection: (section: CustomSection) => void;
}

const SAMPLE_PROMPTS = [
    { label: "Weekly Repayment Table", prompt: "Build a table showing weekly repayment breakdown for the primary loan." },
    { label: "Equity Growth Projection", prompt: "Explain how my home equity grows over the next 10 years in the Crown strategy." },
    { label: "Interest vs Principal Comparison", prompt: "Create a list comparing interest paid in the first 5 years between Bank and Crown." },
];

const AICommandCenter: React.FC<Props> = ({ appState, calculations, isOpen, onClose, currentTab, onAddSection }) => {
    const [prompt, setPrompt] = useState('');
    const [targetTab, setTargetTab] = useState(currentTab);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState('');

    useEffect(() => {
        setTargetTab(currentTab);
    }, [currentTab, isOpen]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const promptContext = JSON.stringify({
                appState,
                bankInterest: calculations.bankLoanCalculation.totalInterest,
                crownInterest: calculations.crownMoneyLoanCalculation.totalInterest,
                surplus: calculations.surplus
            });

            const systemMsg = `
            You are Mike, the Strategy Expert at Crown Money. 
            Build a professional strategy section (Table, Insights, or Comparison) using pure HTML.
            STYLE: Use Tailwind CSS utility classes. Professional and clean.
            STRICT: Output raw HTML only. NO MARKDOWN. No asterisks. No backticks.
            Context: ${promptContext}
            Target View: ${targetTab}
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `${systemMsg}\nBuild this specific view for the sales team: ${prompt}`
            });

            setGeneratedHtml(result.text);
        } catch (e) {
            console.error(e);
            setGeneratedHtml('<div class="text-red-500 p-4 font-bold">Sorry, I couldn\'t build that view right now. Please check the inputs and try again.</div>');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAdd = () => {
        if (!generatedHtml) return;
        const newSection: CustomSection = {
            id: Date.now().toString(),
            title: prompt.substring(0, 40) + (prompt.length > 40 ? '...' : ''),
            tab: targetTab,
            html: generatedHtml,
        };
        onAddSection(newSection);
        setGeneratedHtml('');
        setPrompt('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ask Mike: Build Strategy View">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold mb-3 uppercase tracking-widest">Draft a Custom Strategy View</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select View Location</label>
                            <select 
                                value={targetTab}
                                onChange={e => setTargetTab(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-sm px-4 py-2 custom-select"
                            >
                                <option>Current Loan</option>
                                <option>Int Breakdown</option>
                                <option>Investments</option>
                                <option>Income & Expenses</option>
                                <option>OODC</option>
                                <option>Inv OODC</option>
                                <option>Debt Recycling</option>
                                <option>In 2 Wealth</option>
                                <option>General (All Tabs)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">What should I build?</label>
                            <textarea 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 rounded-xl text-sm px-4 py-3 min-h-[100px] focus:ring-2 ring-indigo-500 transition-all outline-none" 
                                placeholder="Describe the table, graph, or insight you want to show the client..."
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {SAMPLE_PROMPTS.map(sample => (
                                <button 
                                    key={sample.label}
                                    onClick={() => setPrompt(sample.prompt)}
                                    className="text-[10px] font-bold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                >
                                    {sample.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full mt-6 bg-[var(--title-color)] text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                    >
                        {isGenerating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                        {isGenerating ? 'Building Draft...' : 'Build Custom View'}
                    </button>
                </div>

                {generatedHtml && (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-lg animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preview Draft</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setGeneratedHtml('')} className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 hover:text-red-500">Discard</button>
                                <button onClick={handleAdd} className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-md"><SaveIcon className="h-3 w-3" /> Add to {targetTab}</button>
                            </div>
                        </div>
                        <div className="ai-response-content prose prose-slate max-w-none dark:prose-invert overflow-auto max-h-[400px]" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AICommandCenter;
