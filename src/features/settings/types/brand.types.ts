export interface BrandAssets {
  logo: string | null;
  darkLogo: string | null;
  lightLogo: string | null;
  favicon: string | null;
  watermark: string | null;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface BrandTypography {
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
}

export type ButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type IconStyle = 'outline' | 'solid' | 'duotone';

export interface BrandKitConfig {
  identity: {
    name: string;
    tagline: string;
    description: string;
  };
  assets: BrandAssets;
  colors: BrandColors;
  typography: BrandTypography;
  ui: {
    buttonRadius: ButtonRadius;
    iconStyle: IconStyle;
  };
}