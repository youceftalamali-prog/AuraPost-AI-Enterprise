import { BrandColors } from '../../types/brand.types';
import { isValidHex } from '../../utils/brand.helpers';
import { AlertCircle } from 'lucide-react';

interface Props {
  colors: BrandColors;
  onUpdate: (updates: Partial<BrandColors>) => void;
}

const ColorField = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
}) => {
  const isValid = isValidHex(value);
  
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={isValid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border border-border bg-background p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          maxLength={7}
          className={`block flex-1 rounded-md border bg-background px-3 py-2 font-mono text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 ${
            isValid 
              ? 'border-border focus:border-ring focus:ring-ring' 
              : 'border-red-500 focus:border-red-500 focus:ring-red-500'
          }`}
        />
      </div>
      {!isValid && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" /> Invalid hex code
        </p>
      )}
    </div>
  );
};

export const BrandColorEditor = ({ colors, onUpdate }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Brand Colors</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Set your primary, secondary, and accent colors.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ColorField label="Primary" value={colors.primary} onChange={(v) => onUpdate({ primary: v })} />
        <ColorField label="Secondary" value={colors.secondary} onChange={(v) => onUpdate({ secondary: v })} />
        <ColorField label="Accent" value={colors.accent} onChange={(v) => onUpdate({ accent: v })} />
        <ColorField label="Background" value={colors.background} onChange={(v) => onUpdate({ background: v })} />
      </div>
    </div>
  );
};