import { createElement } from 'react';

// A Lucide icon sized to sit beside text, in place of the emoji the app used
// to print there. It is decorative: the label next to it carries the meaning,
// so it stays out of the accessibility tree.
//
//   <InlineIcon icon={Briefcase} />            follows the text colour
//   <InlineIcon icon={GraduationCap} tone="gold" size={18} />
//
// `tone` takes a theme name (gold, navy, muted) or any CSS colour.
const TONES = {
  gold: 'var(--color-gold-500)',
  navy: 'var(--color-navy-900)',
  muted: 'var(--color-ink-500)'
};

function InlineIcon({ icon, size = 16, tone, strokeWidth = 1.75, style, ...rest }) {
  if (!icon) return null;
  return createElement(icon, {
    size,
    strokeWidth,
    color: TONES[tone] || tone || 'currentColor',
    'aria-hidden': 'true',
    focusable: 'false',
    // Tailwind's reset makes every svg a block, which would drop the icon onto
    // its own line; these icons sit in a run of text, so they stay inline.
    style: { display: 'inline-block', verticalAlign: '-0.18em', flexShrink: 0, ...style },
    ...rest
  });
}

export default InlineIcon;
