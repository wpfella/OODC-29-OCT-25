
import React, { useState, useEffect, useMemo } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { InfoIcon } from './common/IconComponents';
import Tooltip from './common/Tooltip';
import { calculateAmortization } from '../hooks/useMortgageCalculations';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatChartCurrency = (tick: number): string => {
    if (Math.abs(tick) >= 1000) {
        return `$${Math.round(tick / 1000)}k`;
    }
    return `$${tick}`;
};

interface ReportData {
    startingBalance: number;
    principalPaid: number;
    interestPaid: number;
    endingBalance: number;
}
interface EditableReportState {
    bank: ReportData;
    crown: ReportData;
    actual: ReportData;
}

const Tab_Reports: React.FC<Props> = ({ appState, calculations }) => {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const { reportCalculations } = calculations;
  const [editableData, setEditableData] = useState<EditableReportState | null>(null);
  
  useEffect(() => {
    const bankData = reportCalculations.bankFuture[period];
    const crownData = reportCalculations.crownFuture[period];

    setEditableData({
        bank: { ...bankData },
        crown: { ...crownData },
        actual: {
            startingBalance: bankData.startingBalance,
            principalPaid: 0,
            interestPaid: 0,
            endingBalance: bankData.startingBalance,
        }
    });
  }, [period, reportCalculations]);

  const chartData = useMemo(() => {
      if (!editableData) return [];
      const data = [
          { name: `Bank`, Principal: editableData.bank.principalPaid, Interest: editableData.bank.interestPaid },
          { name: `Crown`, Principal: editableData.crown.principalPaid, Interest: editableData.crown.interestPaid },
      ];
      return data;
  }, [editableData]);

  if (!editableData) {
      return <div>Loading report...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      <Card title="Performance Report">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 print:hidden">
          <div className="flex-shrink-0 flex items-center gap-2 p-1 rounded-full bg-[var(--input-bg-color)] border border-[var(--border-color)]">
            {[3, 6, 12].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p as 3 | 6 | 12)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${period === p ? 'bg-[var(--title-color)] text-white' : 'text-[var(--text-color-muted)] hover:bg-white/5'}`}
              >
                {p} Months
              </button>
            ))}
          </div>
        </div>
      </Card>
      
      <Card title="Visual Comparison: Principal vs Interest">
        <div className="w-full h-80">
          <ResponsiveContainer minWidth={0} minHeight={0}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color) print:stroke-gray-200" />
              <XAxis dataKey="name" stroke="var(--text-color) print:stroke-black" />
              <YAxis stroke="var(--text-color) print:stroke-black" tickFormatter={formatChartCurrency} />
              <RechartsTooltip cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
              <Legend wrapperStyle={{ color: 'var(--text-color-muted)' }} />
              <Bar dataKey="Principal" stackId="a" fill="var(--chart-color-principal)" />
              <Bar dataKey="Interest" stackId="a" fill="var(--chart-color-interest)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Tab_Reports;
