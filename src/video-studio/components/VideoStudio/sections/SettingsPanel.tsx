import React, { useEffect, useState } from 'react';
import { SectionHead, Icon, Toggle, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { providerApi } from '../../../services/providerApi';
import { PROVIDERS } from '../../../lib/constants';
import type { ProviderSettings, VideoProviderName } from '../../../types/api';

export const SettingsPanel: React.FC = () => {
  const { notify } = useStudio();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const r1 = useReveal<HTMLDivElement>();
  const r2 = useReveal<HTMLDivElement>();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await providerApi.getSettings();
        setSettings(res as ProviderSettings);
      } catch {
        notify('Could not load settings', true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [notify]);

  const save = async () => {
    if (!settings) return;
    try {
      const res = await providerApi.updateSettings({
        defaultProvider: settings.defaultProvider as VideoProviderName,
        autoRouting: settings.autoRouting,
        fallbackEnabled: settings.fallbackEnabled,
        maxCostPerVideo: parseFloat(settings.maxCostPerVideo),
        preferredQuality: settings.preferredQuality,
        apiKeys: settings.apiKeys,
      });
      setSettings(res);
      setDirty(false);
      notify('Settings saved');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed', true);
    }
  };

  const updateApiKey = (provider: string, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, apiKeys: { ...settings.apiKeys, [provider]: value } });
    setDirty(true);
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys({ ...showKeys, [provider]: !showKeys[provider] });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="skeleton h-[300px]" />
        <div className="skeleton h-[300px]" />
      </div>
    );
  }

  return (
    <div>
      <SectionHead
        kicker="CONFIG · 09"
        title="Studio Settings"
        desc="Provider keys, routing policy, and render defaults for this workspace."
        action={
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty}>
            {dirty ? (
              <>
                <Icon name="check" size={13} /> Save changes
              </>
            ) : (
              'All changes saved'
            )}
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ---------- Routing & defaults ---------- */}
        <div ref={r1} className="panel p-6">
          <div className="kicker mb-2">ROUTING POLICY</div>
          <h2 className="t-display font-semibold text-[17px] mb-3">How the engine picks a provider</h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--muted)' }}>
            Configure auto-routing, fallback behavior, and cost ceilings.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--line)' }}>
              <div>
                <div className="text-[13.5px] font-medium">Auto-routing</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Router scores cost, speed, health and quality on every render
                </div>
              </div>
              <Toggle
                on={settings?.autoRouting ?? true}
                onChange={(v) => {
                  if (settings) {
                    setSettings({ ...settings, autoRouting: v });
                    setDirty(true);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--line)' }}>
              <div>
                <div className="text-[13.5px] font-medium">Fallback on failure</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Automatically retry down the chain
                </div>
              </div>
              <Toggle
                on={settings?.fallbackEnabled ?? true}
                onChange={(v) => {
                  if (settings) {
                    setSettings({ ...settings, fallbackEnabled: v });
                    setDirty(true);
                  }
                }}
              />
            </div>

            <div className="py-3 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13.5px] font-medium">Default provider</div>
                <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  Used when auto-routing is off
                </div>
              </div>
              <select
                className="field field-mono"
                value={settings?.defaultProvider ?? 'HuggingFace'}
                onChange={(e) => {
                  if (settings) {
                    setSettings({ ...settings, defaultProvider: e.target.value });
                    setDirty(true);
                  }
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="py-3 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13.5px] font-medium">Preferred quality</div>
                <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  Applied to new renders by default
                </div>
              </div>
              <select
                className="field field-mono"
                value={settings?.preferredQuality ?? 'High'}
                onChange={(e) => {
                  if (settings) {
                    setSettings({ ...settings, preferredQuality: e.target.value });
                    setDirty(true);
                  }
                }}
              >
                {['Draft', 'Standard', 'High', 'Ultra'].map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13.5px] font-medium">Cost ceiling per video</div>
                <span className="t-mono text-[12px]" style={{ color: 'var(--amber)' }}>
                  ${settings?.maxCostPerVideo ?? '1.00'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={parseFloat(settings?.maxCostPerVideo ?? '1')}
                onChange={(e) => {
                  if (settings) {
                    setSettings({ ...settings, maxCostPerVideo: e.target.value });
                    setDirty(true);
                  }
                }}
                className="w-full"
                style={{ accentColor: 'var(--coral)' }}
              />
              <div className="flex justify-between t-mono text-[10px] mt-1" style={{ color: 'var(--faint)' }}>
                <span>$0</span>
                <span>$5</span>
                <span>$10</span>
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
                Router penalizes providers above this budget
              </div>
            </div>
          </div>
        </div>

        {/* ---------- API keys ---------- */}
        <div ref={r2} className="space-y-6">
          <div className="panel p-6">
            <div className="kicker mb-2">CREDENTIALS</div>
            <h2 className="t-display font-semibold text-[17px] mb-1">Provider API keys</h2>
            <p className="text-[12px] mb-4" style={{ color: 'var(--muted)' }}>
              Stored per workspace. HuggingFace falls back to the global <span className="t-mono">HF_TOKEN</span>.
            </p>

            <div className="space-y-3">
              {PROVIDERS.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="t-mono text-[11.5px] w-[92px] flex-none" style={{ color: 'var(--muted)' }}>
                    {p}
                  </span>
                  <input
                    type={showKeys[p] ? 'text' : 'password'}
                    className="field field-mono flex-1"
                    placeholder={`${p.toLowerCase().replace(/\s/g, '_')}_api_key`}
                    value={settings?.apiKeys[p] ?? ''}
                    onChange={(e) => updateApiKey(p, e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    className="btn btn-ghost btn-icon"
                    title={showKeys[p] ? 'Hide' : 'Show'}
                    onClick={() => toggleKeyVisibility(p)}
                  >
                    <Icon name="eye" size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="kicker mb-2">RENDER DEFAULTS</div>
            <h2 className="t-display font-semibold text-[17px] mb-4">Starting point for new renders</h2>

            <div className="space-y-3 text-[13px]" style={{ color: 'var(--muted)' }}>
              <div className="flex items-center justify-between py-2">
                <span>Resolution</span>
                <span className="t-mono">1080p</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Aspect Ratio</span>
                <span className="t-mono">9:16</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Duration</span>
                <span className="t-mono">10s</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>FPS</span>
                <span className="t-mono">30</span>
              </div>
            </div>

            <div className="mt-4 text-[11px]" style={{ color: 'var(--faint)' }}>
              Override per-render in the Generation Studio wizard
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};