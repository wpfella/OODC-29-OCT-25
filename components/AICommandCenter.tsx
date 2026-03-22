import React from 'react';
import { AppState } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  calculations: any;
  currentTab: string;
  onAddSection: (section: any) => void;
}

const AICommandCenter: React.FC<Props> = () => <div>AI Command Center Placeholder</div>;
export default AICommandCenter;
