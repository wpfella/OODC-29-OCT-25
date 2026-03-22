import React from 'react';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  calculations: any;
  onUploadRecord: () => void;
  zapierStatus: 'idle' | 'loading' | 'success' | 'error';
}

const Tab5_Summary: React.FC<Props> = () => <div>Summary Placeholder</div>;
export default Tab5_Summary;
