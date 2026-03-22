import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
  setWarningToast: React.Dispatch<React.SetStateAction<string>>;
}

const Tab_InvestmentProperties: React.FC<Props> = () => <div>Investment Properties Placeholder</div>;
export default Tab_InvestmentProperties;
