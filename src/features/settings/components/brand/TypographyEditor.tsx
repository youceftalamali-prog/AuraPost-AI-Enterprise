import { BrandTypography, ButtonRadius, IconStyle } from '../../types/brand.types';
import { FONT_FAMILIES, BUTTON_RADII, ICON_STYLES } from '../../utils/brand.helpers';

interface Props {
  typography: BrandTypography;
  ui: { buttonRadius: ButtonRadius; iconStyle: IconStyle };
  onUpdateTypography: (updates: Partial<BrandTypography>) => void;
  onUpdateUI: (updates: { buttonRadius?: ButtonRadius; iconStyle?: IconStyle }) => void;
}

export const TypographyEditor = ({ typography, ui, onUpdateTypography, onUpdateUI }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Typography & UI</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Define fonts, button shapes, and icon styles.
      </p>
      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-foreground">Base Font</label>
            <select
              value={typography.fontFamily}
              onChange={(e) => onUpdateTypography({ fontFamily: e.target.value })}
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Heading Font</label>
            <select
              value={typography.headingFont}
              onChange={(e) => onUpdateTypography({ headingFont: e.target.value })}
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Body Font</label>
            <select
              value={typography.bodyFont}
              onChange={(e) => onUpdateTypography({ bodyFont: e.target.value })}
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">Button Radius</label>
            <select
              value={ui.buttonRadius}
              onChange={(e) => onUpdateUI({ buttonRadius: e.target.value as ButtonRadius })}
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {BUTTON_RADII.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Icon Style</label>
            <select
              value={ui.iconStyle}
              onChange={(e) => onUpdateUI({ iconStyle: e.target.value as IconStyle })}
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {ICON_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};