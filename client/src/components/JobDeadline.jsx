import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { applicationsClosed, deadlineDate } from '../jobDeadline';
import { toLocalizedDigits } from '../localizeDigits';
import InlineIcon from './InlineIcon';

export default function JobDeadline({ job }) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (!job.applicationDeadline) return null;
  const date = toLocalizedDigits(deadlineDate(job.applicationDeadline), i18n.language);
  return <p style={{ fontSize: '14px', color: applicationsClosed(job, now) ? '#9b2c2c' : '#4a5568', margin: '8px 0' }}>
    <InlineIcon icon={CalendarDays} tone="gold" size={15} />{' '}
    {applicationsClosed(job, now) ? t('qa.deadline_closed') : t('qa.deadline_date', { date })}
  </p>;
}
