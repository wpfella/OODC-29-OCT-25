
import React from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  className?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  className = ''
}) => {
  const formatValue = (val: number) => {
    if (unit === '$') {
      return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
    }
    return `${val}${unit}`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-[var(--text-color)]">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-24 bg-[var(--input-bg-color)] p-1 rounded border border-[var(--input-border-color)] text-right text-sm focus:outline-none focus:ring-1 focus:ring-[var(--title-color)]"
          />
          <span className="text-xs text-[var(--text-color-muted)]">{unit}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-grow h-2 bg-[var(--input-bg-color)] rounded-lg appearance-none cursor-pointer accent-[var(--title-color)]"
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-color-muted)] uppercase tracking-wider">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
};

export default SliderInput;
