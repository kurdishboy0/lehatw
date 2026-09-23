import { useTranslation } from 'react-i18next';
import { EVENT_TYPE_TONE } from '../eventText';

function EventTypeBadge({ type }) {
  const { t } = useTranslation();
  const [bg, color] = EVENT_TYPE_TONE[type] || EVENT_TYPE_TONE.OTHER;
  return (
    <span style={{ backgroundColor: bg, color, fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
      {t(`events.type_${type}`)}
    </span>
  );
}

export default EventTypeBadge;
