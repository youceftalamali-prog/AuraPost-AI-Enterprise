import { BrandKitConfig } from '../../types/brand.types';
import { BUTTON_RADII } from '../../utils/brand.helpers';

interface Props {
  config: BrandKitConfig;
}

export const BrandPreview = ({ config }: Props) => {
  const radiusClass = BUTTON_RADII.find(r => r.value === config.ui.buttonRadius)?.class || 'rounded-md';
  
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Live Preview</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        See how your brand identity looks in action.
      </p>
      
      <div 
        className="mt-6 overflow-hidden rounded-lg border border-border shadow-sm"
        style={{ backgroundColor: config.colors.background, fontFamily: config.typography.fontFamily }}
      >
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <div className="flex items-center gap-3">
            {config.assets.logo ? (
              <img src={config.assets.logo} alt="Logo" className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
                {config.identity.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold" style={{ color: config.colors.primary, fontFamily: config.typography.headingFont }}>
              {config.identity.name}
            </span>
          </div>
          <button 
            className={`px-3 py-1.5 text-xs font-medium text-white shadow-sm ${radiusClass}`}
            style={{ backgroundColor: config.colors.accent }}
          >
            Sign In
          </button>
        </div>

        <div className="p-6">
          <h2 
            className="text-xl font-bold" 
            style={{ color: config.colors.primary, fontFamily: config.typography.headingFont }}
          >
            {config.identity.tagline}
          </h2>
          <p 
            className="mt-2 text-sm leading-relaxed" 
            style={{ color: config.colors.secondary, fontFamily: config.typography.bodyFont }}
          >
            {config.identity.description}
          </p>
          
          <div className="mt-6 flex gap-3">
            <button 
              className={`px-4 py-2 text-sm font-medium text-white shadow-sm ${radiusClass}`}
              style={{ backgroundColor: config.colors.primary }}
            >
              Primary Action
            </button>
            <button 
              className={`border px-4 py-2 text-sm font-medium shadow-sm ${radiusClass}`}
              style={{ borderColor: config.colors.secondary, color: config.colors.secondary }}
            >
              Secondary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};