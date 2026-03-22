import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab3_IncomeExpenses: React.FC<Props> = () => <div>Income & Expenses Placeholder</div>;
export default Tab3_IncomeExpenses;
