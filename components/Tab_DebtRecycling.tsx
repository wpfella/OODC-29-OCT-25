import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab_DebtRecycling: React.FC<Props> = () => <div>Debt Recycling Placeholder</div>;
export default Tab_DebtRecycling;
