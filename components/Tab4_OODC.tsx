import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
}

const Tab4_OODC: React.FC<Props> = () => <div>OODC Placeholder</div>;
export default Tab4_OODC;
