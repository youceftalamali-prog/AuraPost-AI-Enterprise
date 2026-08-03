import React, { useCallback, useEffect, useState } from 'react';
import { SectionHead, StatusChip, Meter, Icon, Toggle, useReveal } from '../shared';
import { useStudio } from '../StudioShell';
import { providerApi } from '../../../services/providerApi';
import { formatResponseTime, formatPercent } from '../../../lib/formatters';
import { PROVIDERS, PROVIDER_COLORS } from '../../../lib/constants';
import type { ProviderInfo, ProviderHealth, ProviderSettings, VideoProviderName } from '../../../types/api';

type Tab = 'overview' | 'settings';

export const ProvidersPanel: React.FC = () => {
  const { notify } = useStudio();
  const [tab, setTab] = useState<Tab>('overview');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const r1 = useReveal<HTMLDivElement>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, hRes, sRes] = await Promise.all([
        providerApi.list(),
        providerApi.getHealth(),
        providerApi.getSettings(),
      ]);
      setProviders(pRes as ProviderInfo[]);
      setHealth(hRes as ProviderHealth[]);
      setSettings(sRes as ProviderSettings);
    } catch {
      notify('Could not load provider data', true);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const test = async (name: string) => {
    setTesting(name);
    try {
      const res = await providerApi.testProvider(name as VideoProviderName);
      notify(`${name}: ${res.success ? 'reachable' : 'unreachable'} in ${res.responseTime}ms`, !res.success);
      void load();
    } catch {
      notify(`${name}: test failed`, true);
    } finally {
      setTesting(null);
    }
  };

  const setDefault = async (name: VideoProviderName) => {
    if (!settings) return;
    try {
      const res = await providerApi.updateSettings({ defaultProvider: name });
      setSettings(res);
      notify(`${name} is now the default provider`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not update default', true);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      const res = await providerApi.updateSettings({
        autoRouting: settings.autoRouting,
        fallbackEnabled: settings.fallbackEnabled,
        fallbackChain: settings.fallbackChain as VideoProviderName[],
        maxCostPerVideo: parseFloat(settings.maxCostPerVideo),
        preferredQuality: settings.preferredQuality,
        excludedProviders: settings.excludedProviders as VideoProviderName[],
      });
      setSettings(res);
      setDirty(false);
      notify('Settings saved');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed', true);
    }
  };

  const toggleFallback = (name: string) => {
    if (!settings) return;
    const chain = settings.fallbackChain;
    const next = chain.includes(name) ? chain.filter((p) => p !== name) : [...chain, name];
    setSettings({ ...settings, fallbackChain: next });
    setDirty(true);
  };

  const toggleExcluded = (name: string) => {
    if (!settings) return;
    const list = settings.excludedProviders;
    const next = list.includes(name) ? list.filter((p) => p !== name) : [...list, name];
    setSettings({ ...settings, excludedProviders: next });
    setDirty(true);
  };

  const updateApiKey = (name: string, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, apiKeys: { ...settings.apiKeys, [name]: value } });
    setDirty(true);
  };

  const chainSet = new Set(settings?.fallbackChain ?? []);
  const excludedSet = new Set(settings?.excludedProviders ?? []);

  return (
    <div>
      <SectionHead
        kicker="FLEET · 07"
        title="Provider Network"
        desc="Seven generation engines behind one router. Watch health, compare cost and speed, pick your default."
        action={
          <div className="flex gap-2">
            <button
              className={`chip ${tab === 'overview' ? 'chip-on' : ''}`}
              style={{ padding: '6px 14px', cursor: 'pointer' }}
              onClick={() => setTab('overview')}
            >
              OVERVIEW
            </button>
            <button
              className={`chip ${tab === 'settings' ? 'chip-on' : ''}`}
              style={{ padding: '6px 14px', cursor: 'pointer' }}
              onClick={() => setTab('settings')}
            >
              SETTINGS
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[210px]" />
          ))}
        </div>
      ) : tab === 'overview' ? (
        <>
          {/* Fallback chain strip */}
          <div className="panel px-5 py-4 mb-6 flex items-center gap-3 flex-wrap">
            <span className="kicker flex-none">FALLBACK CHAIN</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(settings?.fallbackChain ?? []).map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 && <span style={{ color: 'var(--faint)' }}>→</span>}
                  <span className={`chip ${settings?.defaultProvider === p ? 'chip-on' : ''}`}>{p}</span>
                </React.Fragment>
              ))}
            </div>
            <span className="t-mono text-[10.5px] ml-auto" style={{ color: 'var(--faint)' }}>
              AUTO-ROUTING {settings?.autoRouting === false ? 'OFF' : 'ON'}
            </span>
          </div>

          <div ref={r1} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {providers.map((p) => {
              const h = health.find((x) => x.provider === p.name);
              const isDefault = settings?.defaultProvider === p.name;
              return (
                <div key={p.name} className="panel panel-hover p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: PROVIDER_COLORS[p.name as VideoProviderName] ?? 'var(--muted)' }}
                        />
                        <div className="t-display font-bold text-[17px]">{p.displayName}</div>
                      </div>
                      <div className="t-mono text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
                        {(p.tier ?? '').toUpperCase()} TIER
                      </div>
                    </div>
                    {h ? <StatusChip status={h.status} /> : <span className="chip">NO DATA</span>}
                  </div>

                  <div className="space-y-3 mb-4">
                    <Meter label="Success rate" value={h ? h.successRate : 0} tone="var(--mint)" />
                    <Meter label="Availability" value={h ? h.availability : 0} tone="var(--cyan)" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2.5 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                      <div className="t-mono text-[13px] font-semibold" style={{ color: 'var(--amber)' }}>
                        ${((p.pricing?.costPerGeneration as number) ?? 0).toFixed(2)}
                      </div>
                      <div className="kicker mt-0.5" style={{ fontSize: 8.5 }}>
                        BASE
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                      <div className="t-mono text-[13px] font-semibold">
                        {h ? formatResponseTime(h.averageResponseTime) : '—'}
                      </div>
                      <div className="kicker mt-0.5" style={{ fontSize: 8.5 }}>
                        LATENCY
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border text-center" style={{ borderColor: 'var(--line)' }}>
                      <div className="t-mono text-[13px] font-semibold">{p.maxDuration}s</div>
                      <div className="kicker mt-0.5" style={{ fontSize: 8.5 }}>
                        MAX
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(p.features?.textToVideo as boolean) && <span className="chip">T2V</span>}
                    {(p.features?.imageToVideo as boolean) && <span className="chip">I2V</span>}
                    {(p.features?.supportsCameraControl as boolean) && <span className="chip">CAMERA</span>}
                    {(p.features?.supportsAudio as boolean) && <span className="chip">AUDIO</span>}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button
                      className="btn btn-ghost btn-sm flex-1 justify-center"
                      onClick={() => void test(p.name)}
                      disabled={testing === p.name}
                    >
                      {testing === p.name ? <span className="dot dot-warn" /> : <Icon name="zap" size={12} />}
                      {testing === p.name ? 'Pinging…' : 'Test'}
                    </button>
                    <button
                      className={`btn btn-sm flex-1 justify-center ${isDefault ? 'btn-mint' : 'btn-primary'}`}
                      onClick={() => void setDefault(p.name as VideoProviderName)}
                      disabled={isDefault}
                    >
                      {isDefault ? (
                        <>
                          <Icon name="check" size={12} /> Default
                        </>
                      ) : (
                        'Set default'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ---------- Settings tab ---------- */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Routing policy */}
          <div className="panel p-6">
            <div className="kicker mb-2">ROUTING POLICY</div>
            <h2 className="t-display font-semibold text-[17px] mb-4">How the engine picks a provider</h2>

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
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Fallback chain config */}
            <div className="panel p-6">
              <div className="kicker mb-2">FALLBACK CHAIN</div>
              <h2 className="t-display font-semibold text-[17px] mb-4">Provider order when one fails</h2>
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p}
                    className="w-full flex items-center justify-between p-3 rounded-lg border transition-all"
                    style={{
                      borderColor: chainSet.has(p) ? 'var(--coral)' : 'var(--line)',
                      background: chainSet.has(p) ? 'var(--coral-soft)' : 'var(--ink-1)',
                    }}
                    onClick={() => toggleFallback(p)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: PROVIDER_COLORS[p] ?? 'var(--muted)' }}
                      />
                      <span className="text-[13px] font-medium">{p}</span>
                    </div>
                    <span className="chip" style={{ opacity: chainSet.has(p) ? 1 : 0.5 }}>
                      {chainSet.has(p) ? 'IN CHAIN' : 'EXCLUDED'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* API keys */}
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
                      type="password"
                      className="field field-mono flex-1"
                      placeholder={`${p.toLowerCase().replace(/\s/g, '_')}_api_key`}
                      value={settings?.apiKeys[p] ?? ''}
                      onChange={(e) => updateApiKey(p, e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-primary w-full justify-center" onClick={saveSettings} disabled={!dirty}>
              <Icon name="check" size={14} /> Save settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};