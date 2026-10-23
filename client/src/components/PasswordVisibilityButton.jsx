import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PasswordVisibilityButton({ visible, onToggle }) {
  const { t } = useTranslation();
  const Icon = visible ? EyeOff : Eye;
  return <button type="button" className="password-visibility-toggle" onClick={onToggle}
    aria-label={t(visible ? 'common.hide_password' : 'common.show_password')} aria-pressed={visible}>
    <Icon size={20} aria-hidden="true" />
  </button>;
}
