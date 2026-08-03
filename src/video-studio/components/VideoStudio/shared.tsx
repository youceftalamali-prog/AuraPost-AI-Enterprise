import React, { useEffect, useRef, useState } from 'react';

/* ==========================================================
   Shared atoms for the Video Studio UI
   ========================================================== */

// ---------- Hooks ----------
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('reveal');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ---------- Icons (inline, stroke-based) ----------
const PATHS: Record<string, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5',
  queue: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  server: 'M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM6 6h.01M6 18h.01',
  palette: 'M12 22a10 10 0 1 1 10-10c0 2.5-1.5 4-4 4h-2a2 2 0 0 0-1.5 3.3c.4.5.5 1.7-.5 2.2a9.6 9.6 0 0 1-2 .5zM7.5 10.5h.01M12 7.5h.01M16.5 10.5h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  play: 'M5 3l14 9-14 9V3z',
  heart: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2C10.5 3.5 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  chevron: 'M9 18l6-6-6-6',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  film: 'M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM2 8h20M2 16h20M8 2v20M16 2v20',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
};

export const Icon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d={PATHS[name] ?? PATHS.grid} />
  </svg>
);

// ---------- Section header ----------
export const SectionHead: React.FC<{ kicker: string; title: string; desc?: string; action?: React.ReactNode }> = ({
  kicker,
  title,
  desc,
  action,
}) => {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="flex items-end justify-between gap-6 mb-7 flex-wrap">
      <div>
        <div className="kicker mb-2 flex items-center gap-2">
          <span className="inline-block w-6 h-px" style={{ background: 'var(--coral)' }} />
          {kicker}
        </div>
        <h1 className="t-display text-[30px] leading-tight font-bold">{title}</h1>
        {desc && (
          <p className="text-[13.5px] mt-1.5 max-w-xl" style={{ color: 'var(--muted)' }}>
            {desc}
          </p>
        )}
      </div>
      {action}
    </div>
  );
};

// ---------- Stat readout ----------
export const Stat: React.FC<{ label: string; value: number; format?: (v: number) => string; tone?: string; sub?: string }> = ({
  label,
  value,
  format,
  tone = 'var(--text)',
  sub,
}) => {
  const v = useCountUp(value);
  return (
    <div>
      <div className="kicker mb-1.5">{label}</div>
      <div className="t-mono text-[26px] font-semibold leading-none" style={{ color: tone }}>
        {format ? format(v) : Math.round(v)}
      </div>
      {sub && (
        <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--faint)' }}>
          {sub}
        </div>
      )}
    </div>
  );
};

// ---------- Status chip ----------
const STATUS_MAP: Record<string, { cls: string; dot: string }> = {
  Queued: { cls: 'chip-amber', dot: 'dot-warn' },
  Analyzing: { cls: 'chip-cyan', dot: 'dot-live' },
  Processing: { cls: 'chip-cyan', dot: 'dot-live' },
  Rendering: { cls: 'chip-cyan', dot: 'dot-live' },
  Completed: { cls: 'chip-mint', dot: 'dot-live' },
  Failed: { cls: 'chip-coral', dot: 'dot-err' },
  Cancelled: { cls: '', dot: 'dot-idle' },
  Available: { cls: 'chip-mint', dot: 'dot-live' },
  Degraded: { cls: 'chip-amber', dot: 'dot-warn' },
  Unavailable: { cls: 'chip-coral', dot: 'dot-err' },
  Maintenance: { cls: 'chip-amber', dot: 'dot-warn' },
};

export const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_MAP[status] ?? { cls: '', dot: 'dot-idle' };
  return (
    <span className={`chip ${m.cls}`}>
      <span className={`dot ${m.dot}`} />
      {status}
    </span>
  );
};

// ---------- Progress bar ----------
export const Progress: React.FC<{ value: number; active?: boolean }> = ({ value, active }) => (
  <div className={`bar ${active ? 'bar-active' : ''}`}>
    <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

// ---------- Score gauge (SVG arc) ----------
export const Gauge: React.FC<{ value: number; size?: number; label?: string }> = ({ value, size = 148, label }) => {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value < 40 ? 'var(--coral)' : value < 60 ? 'var(--amber)' : value < 80 ? 'var(--cyan)' : 'var(--mint)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - drawn / 100)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="t-mono text-[30px] font-semibold leading-none" style={{ color }}>
          {Math.round(drawn)}
        </span>
        <span className="kicker mt-1">{label ?? 'SCORE'}</span>
      </div>
    </div>
  );
};

// ---------- Meter row ----------
export const Meter: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone = 'var(--cyan)' }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="t-mono text-[12px]" style={{ color: tone }}>
        {Math.round(value)}
      </span>
    </div>
    <div className="bar">
      <i style={{ width: `${value}%`, background: tone }} />
    </div>
  </div>
);

// ---------- Empty state ----------
export const Empty: React.FC<{ icon?: string; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon = 'film',
  title,
  hint,
  action,
}) => (
  <div className="panel p-10 flex flex-col items-center text-center">
    <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--ink-3)', color: 'var(--muted)' }}>
      <Icon name={icon} size={22} />
    </div>
    <div className="t-display font-semibold text-[15px]">{title}</div>
    {hint && (
      <div className="text-[12.5px] mt-1 max-w-sm" style={{ color: 'var(--muted)' }}>
        {hint}
      </div>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ---------- Modal ----------
export const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; width?: number }> = ({
  open,
  onClose,
  children,
  width = 640,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="panel modal-card ticks w-full" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

// ---------- Toggle ----------
export const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />
);

// ---------- Formatters ----------
export const timecode = (iso?: string | Date | null): string => {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export const money = (v: number): string => `$${v.toFixed(v < 0.01 ? 4 : 2)}`;