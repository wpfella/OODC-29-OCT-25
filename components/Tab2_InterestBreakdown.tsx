import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
  setWarningToast: React.Dispatch<React.SetStateAction<string>>;
}

const Tab2_InterestBreakdown: React.FC<Props> = () => <div>Interest Breakdown Placeholder</div>;
export default Tab2_InterestBreakdown;
