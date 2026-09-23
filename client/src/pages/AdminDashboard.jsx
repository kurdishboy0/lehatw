import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';
import { toLocalizedDigits } from '../localizeDigits';
import ApprovalsTab from './admin/ApprovalsTab';
import ReportsTab from './admin/ReportsTab';
import JobsTab from './admin/JobsTab';
import UsersTab from './admin/UsersTab';
import AdminsTab from './admin/AdminsTab';
import CatalogTab from './admin/CatalogTab';
import TranslationsTab from './admin/TranslationsTab';
import OverviewTab from './admin/OverviewTab';
import AnnouncementsTab from './admin/AnnouncementsTab';
import AuditTab from './admin/AuditTab';
import EventsTab from './admin/EventsTab';

const TABS = [
  { key: 'overview', icon: '📊', countKey: null, Component: OverviewTab },
  { key: 'approvals', icon: '✅', countKey: 'approvals', Component: ApprovalsTab },
  { key: 'reports', icon: '⚑', countKey: 'reports', Component: ReportsTab },
  { key: 'jobs', icon: '💼', countKey: null, Component: JobsTab },
  { key: 'users', icon: '👥', countKey: null, Component: UsersTab },
  { key: 'catalog', icon: '🧩', countKey: null, Component: CatalogTab },
  { key: 'translations', icon: '🌐', countKey: null, Component: TranslationsTab },
  { key: 'events', icon: '📅', countKey: null, Component: EventsTab },
  { key: 'announcements', icon: '📢', countKey: null, Component: AnnouncementsTab },
  { key: 'audit', icon: '📜', countKey: null, Component: AuditTab },
  { key: 'admins', icon: '🛡️', countKey: null, Component: AdminsTab, superOnly: true }
];

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [me, setMe] = useState(null);
  const tabs = TABS.filter((tab) => !tab.superOnly || me?.isSuperAdmin);
  const activeKey = tabs.some((tab) => tab.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const active = tabs.find((tab) => tab.key === activeKey);

  const [counts, setCounts] = useState({});
  const [flash, setFlash] = useState(null); // { kind: 'success' | 'error', text }
  const flashTimer = useRef(null);

  const refreshCounts = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/pending-counts', { headers: authHeader() });
      setCounts(res.data);
    } catch {
      // Badges are a convenience; the tabs still work without them.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    refreshCounts();
    axios.get('/api/admin/me', { headers: authHeader() }).then((res) => setMe(res.data)).catch(() => {});
  }, [refreshCounts]);

  const notify = useCallback((text, kind = 'success') => {
    setFlash({ text, kind });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 6000);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const selectTab = (key) => {
    setFlash(null);
    setSearchParams({ tab: key });
  };

  const ActiveTab = active.Component;
  // A deep link to a super-admin tab waits until we know who is viewing.
  const waitingForMe = !me && TABS.some((tab) => tab.superOnly && tab.key === searchParams.get('tab'));

  return (
    <div style={{ maxWidth: '1040px', margin: '30px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 18px 0', color: '#1a202c' }}>🛡️ {t('adminConsole.heading')}</h2>

      <div role="tablist" aria-label={t('adminConsole.heading')} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '22px' }}>
        {tabs.map((tab) => {
          const selected = tab.key === activeKey;
          const count = tab.countKey ? counts[tab.countKey] : 0;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: `3px solid ${selected ? '#C99A2E' : 'transparent'}`, marginBottom: '-2px',
                cursor: 'pointer', fontSize: '15px', fontWeight: selected ? 700 : 600,
                color: selected ? '#1B2A4A' : '#718096', whiteSpace: 'nowrap'
              }}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {t(`adminConsole.tabs.${tab.key}`)}
              {count > 0 && (
                <span style={{ backgroundColor: '#c53030', color: 'white', fontSize: '11px', fontWeight: 700, borderRadius: '10px', padding: '1px 7px' }}>
                  {toLocalizedDigits(String(count), i18n.language)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {flash && (
        <div
          role={flash.kind === 'error' ? 'alert' : 'status'}
          style={{
            marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
            backgroundColor: flash.kind === 'error' ? '#fde8e8' : '#e6f4ea',
            color: flash.kind === 'error' ? '#9b2c2c' : '#276749'
          }}
        >
          {flash.text}
        </div>
      )}

      <div role="tabpanel">
        {waitingForMe
          ? <p style={{ color: '#718096' }}>{t('adminConsole.loading')}</p>
          : <ActiveTab key={activeKey} notify={notify} refreshCounts={refreshCounts} me={me} />}
      </div>
    </div>
  );
}

export default AdminDashboard;
