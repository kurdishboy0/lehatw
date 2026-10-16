import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import ReportButton from '../components/ReportButton';
import { User, ArrowLeft, MessageSquare } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

const CONVERSATIONS_POLL_MS = 10000;
const THREAD_POLL_MS = 5000;

function initials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

function Avatar({ name, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: '#1B2A4A', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size / 2.6, fontWeight: 'bold', flexShrink: 0
    }}>
      {initials(name) || <InlineIcon icon={User} size={18} />}
    </div>
  );
}

function ConversationList({ conversations, loading, activeUserId, onSelect, t }) {
  return (
    <div className="conversation-list-pane" style={{ width: '320px', flexShrink: 0, borderInlineEnd: '1px solid #e2e8f0', overflowY: 'auto', backgroundColor: '#fafbfc' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '17px', color: '#1a202c' }}>
        {t('messages.heading')}
      </div>
      {loading ? (
        <p style={{ padding: '20px', color: '#a0aec0', fontSize: '14px' }}>{t('common.loading')}</p>
      ) : conversations.length === 0 ? (
        <p style={{ padding: '20px', color: '#a0aec0', fontSize: '13px', lineHeight: '1.6' }}>{t('messages.no_conversations')}</p>
      ) : (
        conversations.map(c => (
          <button
            key={c.userId}
            onClick={() => onSelect(c.userId)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'start',
              padding: '14px 20px', background: c.userId === activeUserId ? '#FCF6E3' : 'none', border: 'none',
              borderBottom: '1px solid #f1f1f1', cursor: 'pointer'
            }}
          >
            <Avatar name={c.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <strong style={{ color: '#1a202c', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</strong>
              </div>
              <div style={{
                fontSize: '13px', color: c.unreadCount > 0 ? '#1a202c' : '#718096', fontWeight: c.unreadCount > 0 ? '600' : '400',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px'
              }}>
                {c.lastMessage}
              </div>
            </div>
            {c.unreadCount > 0 && (
              <span style={{
                backgroundColor: '#1B2A4A', color: 'white', fontSize: '11px', fontWeight: 'bold',
                borderRadius: '10px', padding: '2px 7px', minWidth: '18px', textAlign: 'center', flexShrink: 0
              }}>
                {c.unreadCount}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}

function ThreadPane({ userId, onActivity, t }) {
  const navigate = useNavigate();
  const me = getUser();
  const [otherUser, setOtherUser] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  const fetchThread = useCallback(async (isInitial) => {
    try {
      const res = await axios.get(`/api/messages/${userId}`, { headers: authHeader() });
      setOtherUser(res.data.otherUser);
      setThreadMessages(res.data.messages);
      if (isInitial) setLoading(false);
    } catch (err) {
      console.error(err);
      if (isInitial) {
        setError(t('messages.error_load'));
        setLoading(false);
      }
    }
  }, [userId, t]);

  useEffect(() => {
    // `loading` already starts true via useState, and ThreadPane fully remounts
    // (key={activeUserId}) on conversation switch, so no explicit reset is needed here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount + interval for a live thread
    fetchThread(true);
    const interval = setInterval(() => fetchThread(false), THREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchThread]);

  useEffect(() => {
    // `block: 'nearest'` keeps this scoped to the message list's own scroll
    // container — without it, scrollIntoView can cascade up and scroll the
    // whole page too, pushing the thread header (and the mobile back button)
    // off-screen above the fold.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [threadMessages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    try {
      await axios.post('/api/messages', { recipientId: Number(userId), content }, { headers: authHeader() });
      fetchThread(false);
      onActivity();
    } catch (err) {
      setError(err.response?.data?.message || t('messages.error_send'));
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>{t('messages.loading')}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="thread-back-button"
          aria-label={t('messages.back_to_list')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#1a202c', padding: '0 4px 0 0', display: 'none' }}
        >
          <InlineIcon icon={ArrowLeft} size={18} />
        </button>
        <Avatar name={otherUser?.name} size={36} />
        <strong style={{ color: '#1a202c', fontSize: '15px' }}>{otherUser?.name}</strong>
        <ReportButton targetType="USER" targetId={Number(userId)} style={{ marginInlineStart: 'auto' }} />
      </div>

      {error && <p style={{ color: 'red', fontSize: '13px', padding: '0 20px' }}>{error}</p>}

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f7fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {threadMessages.map(msg => {
          const mine = msg.senderId === me?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '4px' }}>
              <div style={{
                maxWidth: '70%', padding: '10px 14px', borderRadius: '14px', fontSize: '14px',
                backgroundColor: mine ? '#1B2A4A' : 'white', color: mine ? 'white' : '#2d3748',
                border: mine ? 'none' : '1px solid #e2e8f0'
              }}>
                {msg.content}
              </div>
              {!mine && <ReportButton targetType="MESSAGE" targetId={msg.id} compact />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messages.thread_placeholder')}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e0' }}
        />
        <button type="submit" style={{ padding: '10px 22px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {t('messages.send')}
        </button>
      </form>
    </div>
  );
}

function Messages() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get('/api/messages', { headers: authHeader() });
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount + interval for a live inbox
    fetchConversations();
    const interval = setInterval(fetchConversations, CONVERSATIONS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const activeUserId = userId ? Number(userId) : null;

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      <div className={`messages-layout${activeUserId ? ' has-active-thread' : ''}`} style={{ display: 'flex', height: '72vh', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ConversationList
          conversations={conversations}
          loading={loadingConversations}
          activeUserId={activeUserId}
          onSelect={(id) => navigate(`/messages/${id}`)}
          t={t}
        />
        <div className="thread-pane" style={{ flex: 1, minWidth: 0 }}>
          {activeUserId ? (
            <ThreadPane key={activeUserId} userId={activeUserId} onActivity={fetchConversations} t={t} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              <InlineIcon icon={MessageSquare} size={28} tone="muted" /><br />{conversations.length > 0 ? t('messages.select_conversation') : t('messages.no_conversations')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;
