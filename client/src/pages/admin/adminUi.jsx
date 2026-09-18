// Small presentational pieces shared by the admin console tabs.
import { mutedStyle } from './adminStyles';

const BADGE_TONES = {
  gray: ['#edf2f7', '#4a5568'],
  green: ['#e6f4ea', '#276749'],
  yellow: ['#fdf6e3', '#8a6d1d'],
  red: ['#fde8e8', '#9b2c2c'],
  blue: ['#e8eef9', '#1B2A4A']
};

export function Badge({ tone = 'gray', children }) {
  const [bg, color] = BADGE_TONES[tone];
  return (
    <span style={{ display: 'inline-block', backgroundColor: bg, color, fontSize: '12px', fontWeight: 600, padding: '2px 9px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

// Segmented filter control. `options` is [{ value, label, count? }].
export function FilterPills({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${active ? '#1B2A4A' : '#cbd5e0'}`,
              backgroundColor: active ? '#1B2A4A' : 'white', color: active ? 'white' : '#4a5568'
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionHeading({ children, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '0 0 14px 0' }}>
      <h3 style={{ margin: 0, fontSize: '18px', color: '#1a202c' }}>{children}</h3>
      {actions}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p style={{ ...mutedStyle, padding: '24px', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: '10px', margin: 0 }}>{children}</p>;
}
