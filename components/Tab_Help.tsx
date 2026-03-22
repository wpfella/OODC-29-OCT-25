import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab_Help: React.FC<Props> = () => <div>Help Placeholder</div>;
export default Tab_Help;
