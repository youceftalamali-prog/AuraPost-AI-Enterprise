import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { BrandAssets } from '../../types/brand.types';

interface Props {
  assets: BrandAssets;
  onUpdate: (updates: Partial<BrandAssets>) => void;
}

const AssetField = ({ 
  label, 
  description, 
  value, 
  onUpload, 
  onRemove 
}: { 
  label: string; 
  description: string; 
  value: string | null; 
  onUpload: (dataUrl: string) => void; 
  onRemove: () => void;
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative h-12 w-12 overflow-hidden rounded-md border border-border bg-muted">
          <img src={value} alt={label} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border bg-muted/50 text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
      <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted">
        {value ? 'Replace' : 'Upload'}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const reader = new FileReader();
              reader.onload = (event) => onUpload(event.target?.result as string);
              reader.readAsDataURL(e.target.files[0]);
            }
          }}
        />
      </label>
    </div>
  </div>
);

export const LogoUploader = ({ assets, onUpdate }: Props) => {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="text-base font-semibold text-foreground">Brand Assets</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload your logos, favicons, and watermarks.
      </p>
      <div className="mt-4">
        <AssetField 
          label="Primary Logo" 
          description="Used in headers and main branding." 
          value={assets.logo} 
          onUpload={(data) => onUpdate({ logo: data })} 
          onRemove={() => onUpdate({ logo: null })} 
        />
        <AssetField 
          label="Dark Mode Logo" 
          description="Used when dark mode is active." 
          value={assets.darkLogo} 
          onUpload={(data) => onUpdate({ darkLogo: data })} 
          onRemove={() => onUpdate({ darkLogo: null })} 
        />
        <AssetField 
          label="Light Mode Logo" 
          description="Used when light mode is active." 
          value={assets.lightLogo} 
          onUpload={(data) => onUpdate({ lightLogo: data })} 
          onRemove={() => onUpdate({ lightLogo: null })} 
        />
        <AssetField 
          label="Favicon" 
          description="Browser tab icon (32x32px)." 
          value={assets.favicon} 
          onUpload={(data) => onUpdate({ favicon: data })} 
          onRemove={() => onUpdate({ favicon: null })} 
        />
        <AssetField 
          label="Watermark" 
          description="Applied to generated images." 
          value={assets.watermark} 
          onUpload={(data) => onUpdate({ watermark: data })} 
          onRemove={() => onUpdate({ watermark: null })} 
        />
      </div>
    </div>
  );
};