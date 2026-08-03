import { useState, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useModuleData } from '../hooks/useModuleData';
import { SettingsModule } from '../types/settings.types';
import { BrandKitConfig } from '../types/brand.types';
import { BrandIdentityCard } from '../components/brand/BrandIdentityCard';
import { LogoUploader } from '../components/brand/LogoUploader';
import { BrandColorEditor } from '../components/brand/BrandColorEditor';
import { TypographyEditor } from '../components/brand/TypographyEditor';
import { BrandPreview } from '../components/brand/BrandPreview';
import { RotateCcw } from 'lucide-react';

export const BrandKitPage = () => {
  const { setDirty } = useSettings();
  const { data, isLoading, updateData, setData } = useModuleData<BrandKitConfig>(SettingsModule.BRAND_KIT);

  const updateIdentity = useCallback((updates: { name?: string; tagline?: string; description?: string }) => {
    if (!data) return;
    const newData = { ...data, identity: { ...data.identity, ...updates } };
    setData(newData);
    setDirty(true);
  }, [data, setData, setDirty]);

  const updateAssets = useCallback((updates: Partial<BrandKitConfig['assets']>) => {
    if (!data) return;
    const newData = { ...data, assets: { ...data.assets, ...updates } };
    setData(newData);
    setDirty(true);
  }, [data, setData, setDirty]);

  const updateColors = useCallback((updates: Partial<BrandKitConfig['colors']>) => {
    if (!data) return;
    const newData = { ...data, colors: { ...data.colors, ...updates } };
    setData(newData);
    setDirty(true);
  }, [data, setData, setDirty]);

  const updateTypography = useCallback((updates: Partial<BrandKitConfig['typography']>) => {
    if (!data) return;
    const newData = { ...data, typography: { ...data.typography, ...updates } };
    setData(newData);
    setDirty(true);
  }, [data, setData, setDirty]);

  const updateUI = useCallback((updates: Partial<BrandKitConfig['ui']>) => {
    if (!data) return;
    const newData = { ...data, ui: { ...data.ui, ...updates } };
    setData(newData);
    setDirty(true);
  }, [data, setData, setDirty]);

  const handleReset = useCallback(async () => {
    await updateData({ action: 'reset' });
  }, [updateData]);

  if (isLoading || !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-64 rounded-lg border border-border bg-muted/50 lg:col-span-2" />
          <div className="h-64 rounded-lg border border-border bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Brand Kit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your workspace visual identity, colors, and typography.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BrandIdentityCard identity={data.identity} onUpdate={updateIdentity} />
          <BrandColorEditor colors={data.colors} onUpdate={updateColors} />
          <TypographyEditor 
            typography={data.typography} 
            ui={data.ui} 
            onUpdateTypography={updateTypography} 
            onUpdateUI={updateUI} 
          />
        </div>
        <div className="space-y-6">
          <BrandPreview config={data} />
          <LogoUploader assets={data.assets} onUpdate={updateAssets} />
        </div>
      </div>
    </div>
  );
};