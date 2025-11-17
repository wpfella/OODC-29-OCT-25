import React, { useState } from 'react';
import { AppState } from '../types';
import Card from './common/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PrintIcon, EmailIcon, FacebookIcon, TwitterIcon, LinkedInIcon } from './common/IconComponents';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const ReportMetric = ({ title, value, colorClass = 'text-[var(--text-color)]' }: {title: string, value: string, colorClass?: string}) => (
  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg text-center">
    <h4 className="text-sm text-[var(--text-color-muted)]">{title}</h4>
    <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
  </div>
);

const formatChartCurrency = (tick: number): string => {
    if (Math.abs(tick) >= 1000) {
        return `$${Math.round(tick / 1000)}k`;
    }
    return `$${tick}`;
};

const CustomBarTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const principal = payload.find((p: any) => p.dataKey === 'Principal')?.value || 0;
        const interest = payload.find((p: any) => p.dataKey === 'Interest')?.value || 0;
        const total = principal + interest;
        const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

        return (
            <div className="p-3 bg-[var(--tooltip-bg-color)] border border-[var(--border-color)] rounded-lg text-sm shadow-lg print:hidden space-y-1">
                <p className="label text-[var(--tooltip-text-color)] font-bold mb-1">{label}</p>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-principal)' }}></div>
                    <p className="text-[var(--tooltip-text-color)]">{`Principal: ${formatCurrency(principal)}`}</p>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: 'var(--chart-color-interest)' }}></div>
                    <p className="text-[var(--tooltip-text-color)]">{`Interest: ${formatCurrency(interest)}`}</p>
                </div>
                 <hr className="my-1 border-[var(--border-color)] opacity-50" />
                <p className="text-[var(--tooltip-text-color-muted)]">{`Total Paid: ${formatCurrency(total)}`}</p>
            </div>
        );
    }
    return null;
};

const Tab_Reports: React.FC<Props> = ({ appState, calculations }) => {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const { reportCalculations } = calculations;
  const { clientEmail } = appState;

  const pastData = reportCalculations.past[period];
  const futureData = reportCalculations.future[period];

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const chartData = [
    { name: 'Bank (Past)', Principal: pastData.principalPaid, Interest: pastData.interestPaid },
    { name: 'Crown Money (Future)', Principal: futureData.principalPaid, Interest: futureData.interestPaid },
  ];

  const acceleratedPrincipal = futureData.principalPaid - pastData.principalPaid;
  const interestSavings = pastData.interestPaid - futureData.interestPaid;

  const handlePrint = () => window.print();

  const getShareText = () => `Check out my projected savings with Crown Money! In the next ${period} months, I'm on track to pay off an extra ${formatCurrency(acceleratedPrincipal)} in principal and save ${formatCurrency(interestSavings)} in interest compared to my old bank loan. #CrownMoney #DebtFree #FinancialFreedom`;

  const handleEmail = () => {
    const subject = `My Crown Money ${period}-Month Report`;
    const body = `Hi,\n\nHere is a summary of my financial progress projection with Crown Money for the next ${period} months, compared to my last ${period} months with the bank:\n\nPAST ${period} MONTHS (BANK):\n- Principal Paid: ${formatCurrency(pastData.principalPaid)}\n- Interest Paid: ${formatCurrency(pastData.interestPaid)}\n\nNEXT ${period} MONTHS (CROWN MONEY):\n- Principal Paid: ${formatCurrency(futureData.principalPaid)}\n- Interest Paid: ${formatCurrency(futureData.interestPaid)}\n\nIMPACT:\n- Accelerated Principal Reduction: ${formatCurrency(acceleratedPrincipal)}\n- Immediate Interest Savings: ${formatCurrency(interestSavings)}\n\nThis shows the powerful, immediate impact of the Crown Money strategy.\n\nRegards,`;
    window.location.href = `mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const socialShareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://crownmoney.com.au')}&quote=${encodeURIComponent(getShareText())}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent('https://crownmoney.com.au')}&title=${encodeURIComponent(`My Crown Money Progress`)}&summary=${encodeURIComponent(getShareText())}`,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Performance Report">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <p className="text-sm text-[var(--text-color-muted)] text-center sm:text-left">
            Compare your past performance with the bank against your future potential with the Crown Money strategy.
          </p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 space-y-4">
            <h3 className="text-lg font-bold text-center text-[var(--chart-color-bank)]">Past {period} Months (With Your Bank)</h3>
            <ReportMetric title="Starting Loan Balance" value={formatCurrency(pastData.startingBalance)} />
            <ReportMetric title="Principal Paid" value={formatCurrency(pastData.principalPaid)} colorClass="text-[var(--chart-color-principal)]" />
            <ReportMetric title="Interest Paid" value={formatCurrency(pastData.interestPaid)} colorClass="text-[var(--chart-color-interest)]" />
            <ReportMetric title="Ending Loan Balance" value={formatCurrency(pastData.endingBalance)} />
          </div>
          
          <div className="p-4 rounded-lg bg-[var(--chart-color-crown)]/10 space-y-4">
            <h3 className="text-lg font-bold text-center text-[var(--chart-color-crown)]">Next {period} Months (With Crown Money) 🏆</h3>
            <ReportMetric title="Starting Loan Balance" value={formatCurrency(futureData.startingBalance)} />
            <ReportMetric title="Principal Paid" value={formatCurrency(futureData.principalPaid)} colorClass="text-[var(--chart-color-principal)]" />
            <ReportMetric title="Interest Paid" value={formatCurrency(futureData.interestPaid)} colorClass="text-[var(--chart-color-interest)]" />
            <ReportMetric title="Ending Loan Balance" value={formatCurrency(futureData.endingBalance)} />
          </div>
        </div>
      </Card>
      
      <Card title="Visual Comparison: Principal vs Interest">
        <div className="w-full h-80">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-color)" />
              <YAxis stroke="var(--text-color)" tickFormatter={formatChartCurrency} />
              <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
              <Legend wrapperStyle={{ color: 'var(--text-color-muted)' }} />
              <Bar dataKey="Principal" stackId="a" fill="var(--chart-color-principal)" />
              <Bar dataKey="Interest" stackId="a" fill="var(--chart-color-interest)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Immediate Impact Summary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg text-center bg-[var(--color-positive-bg)]">
            <h4 className="font-semibold text-[var(--color-positive-text)]">Accelerated Principal Reduction</h4>
            <p className="text-4xl font-extrabold my-2 text-[var(--color-positive-text)]">{formatCurrency(acceleratedPrincipal)}</p>
            <p className="text-sm text-[var(--color-positive-text)]">Extra paid off your loan in the next {period} months.</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-[var(--color-positive-bg)]">
            <h4 className="font-semibold text-[var(--color-positive-text)]">Immediate Interest Savings</h4>
            <p className="text-4xl font-extrabold my-2 text-[var(--color-positive-text)]">{formatCurrency(interestSavings)}</p>
            <p className="text-sm text-[var(--color-positive-text)]">Less interest paid to the bank in the next {period} months.</p>
          </div>
        </div>
      </Card>

      <Card title="Share Your Report">
        <div className="flex flex-wrap justify-center items-center gap-4">
            <button onClick={handlePrint} className="flex items-center gap-2 p-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
                <PrintIcon className="h-5 w-5" /> Print Report
            </button>
            <button onClick={handleEmail} className="flex items-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors">
                <EmailIcon className="h-5 w-5" /> Email Report
            </button>
            <a href={socialShareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#0077B5] hover:bg-[#005582] text-white font-semibold rounded-lg transition-colors">
                <LinkedInIcon className="h-5 w-5" /> Share
            </a>
            <a href={socialShareLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#1877F2] hover:bg-[#166eeb] text-white font-semibold rounded-lg transition-colors">
                <FacebookIcon className="h-5 w-5" /> Share
            </a>
            <a href={socialShareLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-semibold rounded-lg transition-colors">
                <TwitterIcon className="h-5 w-5" /> Tweet
            </a>
        </div>
      </Card>
    </div>
  );
};

export const Tab_Reports_Printable: React.FC<Props> = ({ calculations }) => {
    const periods: (3 | 6 | 12)[] = [3, 6, 12];
    const { reportCalculations } = calculations;
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    return (
        <div className="space-y-8 p-4 text-black">
            <h1 className="text-3xl font-bold text-center mb-4">Crown Money Performance Report</h1>
            <p className="text-center text-gray-600 mb-8">A comparison of past performance with your bank versus the projected future performance with the Crown Money strategy.</p>
            {periods.map(period => {
                const pastData = reportCalculations.past[period];
                const futureData = reportCalculations.future[period];
                const acceleratedPrincipal = futureData.principalPaid - pastData.principalPaid;
                const interestSavings = pastData.interestPaid - futureData.interestPaid;

                return (
                    <div key={period} className="mb-12" style={{ pageBreakInside: 'avoid' }}>
                        <h2 className="text-2xl font-bold border-b-2 border-purple-600 pb-2 mb-6">{period}-Month Comparison</h2>
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <h3 className="text-xl font-semibold text-gray-700">Past {period} Months (Bank)</h3>
                                <div className="flex justify-between"><span className="text-gray-600">Starting Balance:</span> <strong>{formatCurrency(pastData.startingBalance)}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">Principal Paid:</span> <strong>{formatCurrency(pastData.principalPaid)}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">Interest Paid:</span> <strong>{formatCurrency(pastData.interestPaid)}</strong></div>
                                <div className="flex justify-between border-t border-gray-300 pt-2 mt-2"><span className="text-gray-600">Ending Balance:</span> <strong>{formatCurrency(pastData.endingBalance)}</strong></div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-semibold text-purple-700">Next {period} Months (Crown)</h3>
                                <div className="flex justify-between"><span className="text-gray-600">Starting Balance:</span> <strong>{formatCurrency(futureData.startingBalance)}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">Principal Paid:</span> <strong>{formatCurrency(futureData.principalPaid)}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">Interest Paid:</span> <strong>{formatCurrency(futureData.interestPaid)}</strong></div>
                                <div className="flex justify-between border-t border-gray-300 pt-2 mt-2"><span className="text-gray-600">Ending Balance:</span> <strong>{formatCurrency(futureData.endingBalance)}</strong></div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-8">
                           <div className="p-4 bg-green-100 rounded-lg text-center">
                               <h4 className="font-semibold text-green-800">Accelerated Principal Reduction</h4>
                               <p className="text-3xl font-extrabold my-1 text-green-800">{formatCurrency(acceleratedPrincipal)}</p>
                           </div>
                           <div className="p-4 bg-green-100 rounded-lg text-center">
                               <h4 className="font-semibold text-green-800">Immediate Interest Savings</h4>
                               <p className="text-3xl font-extrabold my-1 text-green-800">{formatCurrency(interestSavings)}</p>
                           </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Tab_Reports;
