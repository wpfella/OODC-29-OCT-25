
import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string) => void;
  label?: string;
  className?: string;
  type?: string;
  placeholder?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  label,
  className = '',
  type = 'text',
  placeholder = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onSave(inputValue);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(String(value));
    }
  };

  return (
    <div className={`editable-field ${className}`}>
      {label && <label className="block text-xs font-medium text-[var(--text-color-muted)] mb-1">{label}</label>}
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-[var(--input-bg-color)] p-1 rounded border border-[var(--input-border-color)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--title-color)]"
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded transition-colors text-sm min-h-[1.5rem]"
        >
          {value || <span className="text-[var(--text-color-muted)] italic">{placeholder || 'Click to edit'}</span>}
        </div>
      )}
    </div>
  );
};

export default EditableField;
