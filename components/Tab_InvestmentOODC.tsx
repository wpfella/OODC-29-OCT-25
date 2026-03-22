import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab_InvestmentOODC: React.FC<Props> = () => <div>Investment OODC Placeholder</div>;
export default Tab_InvestmentOODC;
