import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

// Sticky only beside results; normal, collapsible content when stacked above them.
export default function ResponsiveFilters({ children, className = '' }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const fieldsId = useId();
  return <aside className={`responsive-filters ${className}${expanded ? ' is-expanded' : ''}`}>
    <button className="responsive-filter-toggle" type="button" aria-expanded={expanded} aria-controls={fieldsId} onClick={() => setExpanded(value => !value)}>
      <SlidersHorizontal size={18} aria-hidden="true" />{t(expanded ? 'layout.hide_filters' : 'layout.show_filters')}
      <ChevronDown size={17} aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
    </button>
    <div id={fieldsId} className="responsive-filter-fields">{children}</div>
  </aside>;
}
