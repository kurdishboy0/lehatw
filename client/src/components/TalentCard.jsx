import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, CalendarDays, ArrowRight, Mail, MessageSquare } from 'lucide-react';
import InlineIcon from './InlineIcon';

export default function TalentCard({ student, t, scoreLabel, showMessage = false }) {
  const skills = (student.skills || []).map(entry => entry.skill || entry);
  const custom = student.customSkills || student.sharedSkills || [];
  const initials = (student.fullName || '').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('');
  const score = student.matchScore ?? student.similarityScore;
  return (
    <article className="talent-card">
      <div className="talent-card-heading">
        {student.photoUrl ? <img className="talent-card-photo" src={student.photoUrl} alt={student.fullName} loading="lazy" /> :
          <div className="talent-card-photo talent-card-initials" aria-hidden="true">{initials || <GraduationCap size={30} />}</div>}
        <h3><Link to={`/students/${student.id}`}>{student.fullName}</Link></h3>
      </div>
      {(score > 0 || student.sameField) && <div className="talent-card-badges">
        {score > 0 && <span className="talent-match-badge">{score}% <span>{scoreLabel}</span></span>}
        {student.sameField && <span className="talent-skill-chip">{t('skillMatch.same_field')}</span>}
      </div>}
      <dl className="talent-card-details">
        {[[GraduationCap, 'home.uni', student.university], [BookOpen, 'home.major', student.fieldOfStudy], [CalendarDays, 'home.class_of', student.graduationYear]]
          .filter(([, , value]) => value).map(([Icon, key, value]) => <div key={key}>
            <dt><InlineIcon icon={Icon} tone="gold" size={17} />{t(key)}</dt><dd>{value}</dd>
          </div>)}
      </dl>
      {(skills.length > 0 || custom.length > 0) && <div className="talent-card-skills">
        {skills.slice(0, 4).map(skill => <span className="talent-skill-chip" key={skill.id}>{skill.name_en}</span>)}
        {custom.slice(0, 2).map((entry, index) => <span className="talent-skill-chip" key={`custom-${index}`}>{typeof entry === 'string' ? entry : entry.name}</span>)}
        {skills.length > 4 && <span className="talent-skills-more">+{skills.length - 4} {t('home.more')}</span>}
      </div>}
      {student.email && <a className="talent-card-email" href={`mailto:${student.email}`} dir="ltr"><Mail size={15} />{student.email}</a>}
      <div className="talent-card-actions">
        <Link className="talent-card-profile" to={`/students/${student.id}`}>{t('skillMatch.view_profile')}<ArrowRight size={17} className="rtl:rotate-180" /></Link>
        {showMessage && student.userId && <Link className="talent-card-message" to={`/messages/${student.userId}`}><MessageSquare size={16} />{t('skillMatch.message')}</Link>}
      </div>
    </article>
  );
}
