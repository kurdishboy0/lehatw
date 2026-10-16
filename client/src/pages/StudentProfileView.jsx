import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authHeader } from '../auth';
import ReportButton from '../components/ReportButton';
import { GraduationCap, MessageSquare, ArrowLeft } from 'lucide-react';
import InlineIcon from '../components/InlineIcon';

function StudentProfileView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [message, setMessage] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/student/${id}`);
        setProfile(res.data);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSendStatus('');
    try {
      await axios.post('/api/messages', {
        recipientId: profile.userId,
        content: message.trim()
      }, { headers: authHeader() });
      setSendStatus(t('studentProfile.sent'));
      setMessage('');
    } catch (err) {
      setSendStatus(err.response?.data?.message || t('studentProfile.error_send'));
    }
  };

  if (loading) return <h3 style={{ textAlign: 'center' }}>{t('studentProfile.loading')}</h3>;
  if (notFound || !profile) return <p style={{ textAlign: 'center', color: '#718096' }}>{t('studentProfile.not_found')}</p>;

  const isOwnProfile = user && user.id === profile.userId;

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#1B2A4A', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}
      >
        <InlineIcon icon={ArrowLeft} className="rtl:rotate-180" /> {t('studentProfile.back')}
      </button>

      <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '36px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.fullName} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#1B2A4A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', fontWeight: 'bold', flexShrink: 0 }}>
              {profile.fullName.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('') || <InlineIcon icon={GraduationCap} size={30} />}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '30px', color: '#1a202c', margin: '0 0 8px 0' }}>{profile.fullName}</h1>
            <div style={{ fontSize: '17px', color: '#718096' }}>{profile.university} · {profile.fieldOfStudy}</div>
            {profile.graduationYear && <div style={{ fontSize: '14px', color: '#a0aec0', marginTop: '6px' }}><InlineIcon icon={GraduationCap} tone="gold" /> {profile.graduationYear}</div>}
          </div>
          {!isOwnProfile && <ReportButton targetType="USER" targetId={profile.userId} style={{ marginInlineStart: 'auto', alignSelf: 'flex-start' }} />}
        </div>

        {profile.bio && <p style={{ marginTop: '22px', color: '#4a5568', fontSize: '16px', lineHeight: '1.8' }}>{profile.bio}</p>}

        <div style={{ display: 'flex', gap: '16px', marginTop: '18px' }}>
          {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontSize: '14px', fontWeight: '600' }}>LinkedIn</a>}
          {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontSize: '14px', fontWeight: '600' }}>GitHub</a>}
          {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: '#1B2A4A', fontSize: '14px', fontWeight: '600' }}>Portfolio</a>}
        </div>

        <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid #edf2f7' }} />
        <h3 style={{ fontSize: '19px', color: '#1a202c', margin: '0 0 16px 0' }}>{t('studentProfile.skills_heading')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {profile.skills.length === 0 && profile.customSkills.length === 0 ? (
            <p style={{ color: '#a0aec0', fontSize: '15px' }}>{t('studentProfile.no_skills')}</p>
          ) : (
            <>
              {profile.skills.map(s => (
                <span key={s.id} style={{ backgroundColor: '#FCF6E3', color: '#14213B', padding: '8px 16px', borderRadius: '20px', fontSize: '14px' }}>
                  <strong>{s.skill.name_en}</strong> <span style={{ fontSize: '12px', color: '#666' }}>({s.proficiency})</span>
                </span>
              ))}
              {profile.customSkills.map(cs => (
                <span key={cs.id} style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '8px 16px', borderRadius: '20px', fontSize: '14px' }}>
                  {cs.name} <em>{t('studentProfile.custom_label')}</em>
                </span>
              ))}
            </>
          )}
        </div>

        <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid #edf2f7' }} />
        <h3 style={{ fontSize: '19px', color: '#1a202c', margin: '0 0 16px 0' }}><InlineIcon icon={MessageSquare} size={20} tone="gold" /> {t('studentProfile.contact_heading')}</h3>

        {isOwnProfile ? (
          <p style={{ color: '#a0aec0', fontSize: '15px' }}>{t('studentProfile.own_profile_note')}</p>
        ) : !user ? (
          <p style={{ color: '#718096', fontSize: '15px' }}>
            <Link to="/login" style={{ color: '#1B2A4A', fontWeight: '600', textDecoration: 'none' }}>{t('studentProfile.login_link')}</Link> {t('studentProfile.login_prompt')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
            {sendStatus && <p style={{ color: sendStatus === t('studentProfile.sent') ? 'green' : 'red', fontWeight: 'bold', margin: 0 }}>{sendStatus}</p>}
            <textarea
              placeholder={t('studentProfile.message_placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '15px' }}
            />
            <button onClick={sendMessage} style={{ alignSelf: 'flex-start', padding: '12px 24px', backgroundColor: '#1B2A4A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
              {t('studentProfile.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentProfileView;
