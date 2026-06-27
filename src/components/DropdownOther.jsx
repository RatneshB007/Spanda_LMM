import React from 'react';

export default function DropdownOther({ label, options, value, otherValue, onChange, onOtherChange, name, otherName }) {
  const isOther = value === 'Other';
  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} name={name}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="Other">Other (specify below)</option>
      </select>
      {isOther && (
        <input
          style={{ marginTop: 6 }}
          placeholder="Describe your observation..."
          value={otherValue || ''}
          onChange={e => onOtherChange(e.target.value)}
          name={otherName}
        />
      )}
    </div>
  );
}
