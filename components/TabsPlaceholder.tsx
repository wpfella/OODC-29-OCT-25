
import React from 'react';
import { AppState } from '../types';

const PlaceholderTab: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p>This tab is currently under reconstruction.</p>
  </div>
);

export const Tab2_InterestBreakdown = () => <PlaceholderTab title="Interest Breakdown" />;
export const Tab_InvestmentProperties = () => <PlaceholderTab title="Investment Properties" />;
export const Tab3_IncomeExpenses = () => <PlaceholderTab title="Income & Expenses" />;
export const Tab4_OODC = () => <PlaceholderTab title="OODC" />;
export const Tab_InvestmentOODC = () => <PlaceholderTab title="Investment OODC" />;
export const Tab_DebtRecycling = () => <PlaceholderTab title="Debt Recycling" />;
export const Tab_In2Wealth = () => <PlaceholderTab title="In 2 Wealth" />;
export const Tab_Help = () => <PlaceholderTab title="Help & Reports" />;
export const Tab5_Summary = () => <PlaceholderTab title="Summary" />;
