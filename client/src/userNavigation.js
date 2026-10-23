import { House, Pencil, Puzzle, FileText, MessageSquare, Plus, ClipboardList, CircleCheck, Flag, Briefcase, BookOpen } from 'lucide-react';

const DASHBOARDS = { STUDENT: '/student-dashboard', HR: '/hr-dashboard', INSTRUCTOR: '/instructor-dashboard', ADMIN: '/admin-dashboard' };
export function getUserMenuItems(user, t) {
  const dashboard = DASHBOARDS[user.role] || '/';
  const items = [{ label: t('userMenu.dashboard'), to: dashboard, icon: House }];
  if (user.role === 'STUDENT') items.push(
    { label: t('userMenu.edit_profile'), to: `${dashboard}?edit=1`, icon: Pencil },
    { label: t('userMenu.add_skills'), to: `${dashboard}?section=skills`, icon: Puzzle },
    { label: t('userMenu.my_applications'), to: `${dashboard}?section=applications`, icon: FileText });
  if (user.role === 'HR') items.push(
    { label: t('userMenu.edit_profile'), to: `${dashboard}?edit=1`, icon: Pencil },
    { label: t('userMenu.post_job'), to: '/hr-dashboard/post-job', icon: Plus },
    { label: t('userMenu.my_job_posts'), to: `${dashboard}?section=jobs`, icon: ClipboardList });
  if (user.role === 'INSTRUCTOR') items.push({ label: t('nav.courses'), to: `${dashboard}#instructor-courses`, icon: BookOpen });
  if (user.role === 'ADMIN') items.push(
    { label: t('userMenu.admin_approvals'), to: `${dashboard}?tab=approvals`, icon: CircleCheck },
    { label: t('userMenu.admin_reports'), to: `${dashboard}?tab=reports`, icon: Flag },
    { label: t('userMenu.admin_jobs'), to: `${dashboard}?tab=jobs`, icon: Briefcase });
  return [...items, { label: t('userMenu.messages'), to: '/messages', icon: MessageSquare }];
}
