import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  setContent: (newContent: any) => void;
}

const Notepad: React.FC<Props> = () => <div>Notepad Placeholder</div>;
export default Notepad;
