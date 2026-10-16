import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authHeader } from '../auth';
import { toLocalizedDigits } from '../localizeDigits';
import { Dialog } from '../components/Dialog';
import { buttonStyle } from '../components/buttonStyle';
import { GraduationCap, Check, Mail, Phone, MessageSquare, ArrowLeft } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

const DEFAULT_THRESHOLD = 50;

const cardStyle = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const chip = (bg, color) => ({ padding: '2px 9px', borderRadius: '10px', fontSize: '13px', backgroundColor: bg, color });

const skillName = (skill, lang) => skill[`name_${(lang || 'en').split('-')[0]}`] || skill.name_en;
const initials = (name) => (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

function InviteDialog({ job, candidate, onSent, onClose }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState(() => t('hrCandidates.invite_default', { name: candidate.fullName.trim(), title: job.title, company: job.company }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`/api/jobs/${job.id}/invite`, { studentProfileId: candidate.id, message }, { headers: authHeader() });
      onSent(res.data.invitedAt);
    } catch (err) {
      setError(err.response?.data?.message || t('hrCandidates.error_load'));
      setBusy(false);
    }
  };

  return (
    <Dialog title={t('hrCandidates.invite_title', { name: candidate.fullName.trim() })} onClose={onClose}>
      <form onSubmit={send}>
        <p style={{ margin: '0 0 10px 0', color: '#4a5568', fontSize: '14px', lineHeight: 1.6 }}>{t('hrCandidates.invite_hint')}</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
          required
          dir="auto"
          aria-label={t('hrCandidates.invite_title', { name: candidate.fullName.trim() })}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', fontFamily: 'inherit' }}
        />
        {error && <p role="alert" style={{ color: '#c53030', fontSize: '13px', margin: '8px 0 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button type="button" onClick={onClose} style={buttonStyle('secondary')}>{t('common.cancel')}</button>
          <button type="submit" disabled={busy || !message.trim()} style={{ ...buttonStyle('primary'), opacity: busy || !message.trim() ? 0.6 : 1 }}>{t('hrCandidates.send')}</button>
        </div>
      </form>
    </Dialog>
  );
}

function CandidateCard({ candidate, job, lang, onInvite }) {
  const { t } = useTranslation();
  const num = (n) => toLocalizedDigits(String(n), lang);
  const { match } = candidate;
  const byId = Object.fromEntries(job.skills.map((s) => [s.id, s]));
  const jobSkillIds = new Set(job.skills.map((s) => s.id));
  const otherSkills = [
    ...candidate.skills.filter((s) => !jobSkillIds.has(s.id)).map((s) => skillName(s, lang)),
    ...candidate.customSkills
  ];
  const strong = match.percent >= 50;

  return (
    <article data-candidate-id={candidate.id} style={cardStyle}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {candidate.photoUrl ? (
          <img src={candidate.photoUrl} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div aria-hidden="true" style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1B2A4A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
            {initials(candidate.fullName) || <InlineIcon icon={GraduationCap} size={24} />}
          </div>
        )}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#1a202c' }}>{candidate.fullName}</h3>
            <span style={{ ...chip(strong ? '#e6f4ea' : '#fdf6e3', strong ? '#276749' : '#8a6d1d'), fontWeight: 700 }}>
              {t('hrCandidates.match', { matched: num(match.matched), total: num(match.total) })}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#718096', marginTop: '2px' }}>
            {candidate.university} · {candidate.fieldOfStudy}{candidate.graduationYear ? ` · ${num(candidate.graduationYear)}` : ''}
          </div>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={match.percent}
            aria-label={t('hrCandidates.match', { matched: match.matched, total: match.total })}
            style={{ marginTop: '8px', height: '6px', borderRadius: '3px', backgroundColor: '#dbe8f8', overflow: 'hidden', maxWidth: '260px' }}
          >
            <div style={{ height: '100%', width: `${match.percent}%`, backgroundColor: '#2a78d6' }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <strong style={{ color: '#276749' }}>{t('hrCandidates.has')}</strong>
          {match.matchedSkillIds.map((id) => (
            <span key={id} style={chip('#e6f4ea', '#276749')}><InlineIcon icon={Check} size={12} /> {skillName(byId[id], lang)}</span>
          ))}
        </div>
        {match.missingSkillIds.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <strong style={{ color: '#718096' }}>{t('hrCandidates.missing')}</strong>
            {match.missingSkillIds.map((id) => (
              <span key={id} style={chip('#edf2f7', '#4a5568')}>{skillName(byId[id], lang)}</span>
            ))}
          </div>
        )}
        {otherSkills.length > 0 && (
          <div style={{ color: '#718096' }}>
            <strong>{t('hrCandidates.other_skills')}</strong> {otherSkills.join(', ')}
          </div>
        )}
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#4a5568' }}>
        <a href={`mailto:${candidate.email}`} dir="ltr" style={{ color: '#1B2A4A' }}><InlineIcon icon={Mail} size={13} /> {candidate.email}</a>
        {candidate.phone && (
          <span><InlineIcon icon={Phone} size={13} tone="muted" /> <a href={`tel:${candidate.phone}`} dir="ltr" style={{ color: '#1B2A4A' }}>{candidate.phone}</a> <span style={{ color: '#a0aec0', fontSize: '12px' }}>({t('hrCandidates.phone_unverified')})</span></span>
        )}
      </div>

      <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Link to={`/students/${candidate.id}`} style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}>{t('hrCandidates.view_profile')}</Link>
        <Link to={`/messages/${candidate.userId}`} style={{ ...buttonStyle('secondary'), textDecoration: 'none' }}><InlineIcon icon={MessageSquare} size={14} /> {t('hrCandidates.message')}</Link>
        {candidate.applied ? (
          <span style={{ ...buttonStyle('secondary'), backgroundColor: '#e6f4ea', color: '#276749', border: 'none', cursor: 'default' }}><InlineIcon icon={Check} size={14} /> {t('hrCandidates.applied')}</span>
        ) : candidate.invitedAt ? (
          <span style={{ ...buttonStyle('secondary'), backgroundColor: '#fdf6e3', color: '#8a6d1d', border: 'none', cursor: 'default' }}><InlineIcon icon={Mail} size={14} /> {t('hrCandidates.invited')}</span>
        ) : (
          <button type="button" disabled={!job.live} onClick={() => onInvite(candidate)} style={{ ...buttonStyle('primary'), opacity: job.live ? 1 : 0.5 }}>
            {t('hrCandidates.invite')}
          </button>
        )}
      </div>
    </article>
  );
}

function HRCandidates() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const num = (n) => toLocalizedDigits(String(n), lang);
  const { jobId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [inviting, setInviting] = useState(null);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    axios.get(`/api/jobs/${jobId}/candidates`, { headers: authHeader() })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || t('hrCandidates.error_load')));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` excluded: don't refetch on language switch
  }, [jobId]);

  if (error) return <p role="alert" style={{ textAlign: 'center', color: '#c53030', marginTop: '40px' }}>{error}</p>;
  if (!data) return <p style={{ textAlign: 'center', color: '#718096', marginTop: '40px' }}>{t('hrCandidates.loading')}</p>;

  const { job, candidates } = data;
  const shown = candidates.filter((c) => c.match.percent >= threshold);

  const markInvited = (invitedAt) => {
    setData((d) => ({ ...d, candidates: d.candidates.map((c) => (c.id === inviting.id ? { ...c, invitedAt } : c)) }));
    setFlash(t('hrCandidates.sent', { name: inviting.fullName.trim() }));
    setInviting(null);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px' }}>
      <Link to="/hr-dashboard?section=jobs" style={{ color: '#1B2A4A', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}><InlineIcon icon={ArrowLeft} className="rtl:rotate-180" /> {t('hrCandidates.back')}</Link>
      <h1 style={{ fontSize: '24px', color: '#1a202c', margin: '14px 0 6px 0' }} dir="auto">{t('hrCandidates.heading', { title: job.title })}</h1>
      <p style={{ margin: '0 0 12px 0', color: '#4a5568' }}>{t('hrCandidates.intro')}</p>

      {job.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '16px', fontSize: '13px' }}>
          <strong style={{ color: '#4a5568' }}>{t('hrCandidates.job_skills')}</strong>
          {job.skills.map((s) => <span key={s.id} style={chip('#edf2f7', '#14213B')}>{skillName(s, lang)}</span>)}
        </div>
      )}

      {!job.live && <p role="status" style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fdf6e3', color: '#8a6d1d', fontSize: '14px' }}>{t('hrCandidates.not_live')}</p>}
      {flash && <p role="status" style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#e6f4ea', color: '#276749', fontSize: '14px', fontWeight: 600 }}>{flash}</p>}

      {job.skills.length === 0 ? (
        <p style={{ ...cardStyle, color: '#4a5568' }}>{t('hrCandidates.no_skills')}</p>
      ) : candidates.length === 0 ? (
        <p style={{ ...cardStyle, color: '#4a5568' }}>{t('hrCandidates.none')}</p>
      ) : (
        <>
          <div style={{ ...cardStyle, padding: '12px 16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: '#2d3748', flex: '1 1 280px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>{t('hrCandidates.threshold_label', { percent: num(threshold) })}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#1B2A4A' }}
              />
            </label>
            <span style={{ fontSize: '13px', color: '#718096' }}>{t('hrCandidates.showing', { shown: num(shown.length), total: num(candidates.length) })}</span>
          </div>

          {shown.length === 0 ? (
            <p style={{ ...cardStyle, color: '#4a5568' }}>{t('hrCandidates.none_above')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {shown.map((c) => <CandidateCard key={c.id} candidate={c} job={job} lang={lang} onInvite={(cand) => { setFlash(''); setInviting(cand); }} />)}
            </div>
          )}
        </>
      )}

      {inviting && <InviteDialog job={job} candidate={inviting} onSent={markInvited} onClose={() => setInviting(null)} />}
    </div>
  );
}

export default HRCandidates;
