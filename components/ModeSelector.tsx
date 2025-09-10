
import React from 'react';

interface ModeOption {
  value: string;
  label: string;
}

interface ModeSelectorProps {
  label: string;
  options: ModeOption[];
  value: string;
  onChange: (value: string) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ label, options, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="mode-selector-group">
        {options.map(option => (
          <button
            key={option.value}
            className={`mode-selector-button ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
