import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab_In2Wealth: React.FC<Props> = () => <div>In 2 Wealth Placeholder</div>;
export default Tab_In2Wealth;
