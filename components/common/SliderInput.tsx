
import React, { useState, useEffect } from 'react';

interface SliderInputProps {
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({ label, value, onChange, min, max, step, unit }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue((prev) => {
      const parsed = prev === '' ? 0 : parseFloat(prev);
      if (!isNaN(parsed) && parsed === value) {
        return prev;
      }
      return value.toString();
    });
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);

    if (newVal === '') {
      onChange(0);
    } else {
      const numValue = parseFloat(newVal);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    if (localValue === '') {
        setLocalValue(value.toString());
    } else {
        const parsed = parseFloat(localValue);
        if (!isNaN(parsed) && parsed === value) {
             setLocalValue(value.toString());
        }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-[var(--text-color)] print:text-black">{label}</label>
        <span className="hidden print:block text-sm text-black font-medium">
          {unit === '$' ? `${unit}${value.toLocaleString()}` : `${value.toLocaleString()}${unit || ''}`}
        </span>
      </div>
      <div className="flex items-center gap-4 print:hidden">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 bg-[var(--slider-track-color)] rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: 'var(--input-border-focus-color)' }}
        />
        <div className="flex items-center bg-[var(--input-bg-color)] rounded-md border border-[var(--input-border-color)] focus-within:ring-2 focus-within:ring-[var(--input-border-focus-color)]">
            {unit && <span className="text-[var(--text-color-muted)] pl-3">{unit}</span>}
            <input
            type="number"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-24 sm:w-28 bg-transparent text-[var(--text-color)] p-2 text-right rounded-md focus:outline-none"
            min={min}
            max={max}
            step={step}
            />
        </div>
      </div>
    </div>
  );
};

export default SliderInput;
