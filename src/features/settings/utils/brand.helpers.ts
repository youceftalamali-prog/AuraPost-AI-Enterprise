import { BrandKitConfig, ButtonRadius, IconStyle } from '../types/brand.types';

export const DEFAULT_BRAND_KIT: BrandKitConfig = {
  identity: {
    name: 'AuraPost',
    tagline: 'Enterprise AI Marketing Platform',
    description: 'Empowering businesses with AI-driven content generation and publishing.',
  },
  assets: {
    logo: null,
    darkLogo: null,
    lightLogo: null,
    favicon: null,
    watermark: null,
  },
  colors: {
    primary: '#000000',
    secondary: '#4B5563',
    accent: '#2563EB',
    background: '#FFFFFF',
  },
  typography: {
    fontFamily: 'Inter',
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
  ui: {
    buttonRadius: 'md',
    iconStyle: 'outline',
  },
};

export const FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Merriweather',
];

export const BUTTON_RADII: { value: ButtonRadius; label: string; class: string }[] = [
  { value: 'none', label: 'None', class: 'rounded-none' },
  { value: 'sm', label: 'Small', class: 'rounded-sm' },
  { value: 'md', label: 'Medium', class: 'rounded-md' },
  { value: 'lg', label: 'Large', class: 'rounded-lg' },
  { value: 'full', label: 'Full', class: 'rounded-full' },
];

export const ICON_STYLES: { value: IconStyle; label: string }[] = [
  { value: 'outline', label: 'Outline' },
  { value: 'solid', label: 'Solid' },
  { value: 'duotone', label: 'Duotone' },
];

export const isValidHex = (hex: string): boolean => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
};