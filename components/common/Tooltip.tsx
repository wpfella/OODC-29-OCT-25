
import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--card-bg-color)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--card-bg-color)]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--card-bg-color)]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--card-bg-color)]'
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 w-max max-w-xs p-2 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-lg animate-fade-in ${positionClasses[position]}`}>
          {text}
          <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
