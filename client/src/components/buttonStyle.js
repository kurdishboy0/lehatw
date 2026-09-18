export const buttonStyle = (variant = 'secondary') => {
  const base = { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' };
  const variants = {
    primary: { backgroundColor: '#1B2A4A', color: 'white' },
    success: { backgroundColor: '#2f855a', color: 'white' },
    danger: { backgroundColor: '#c53030', color: 'white' },
    secondary: { backgroundColor: '#edf2f7', color: '#2d3748', border: '1px solid #cbd5e0' },
    link: { background: 'none', color: '#1B2A4A', padding: '4px 6px', textDecoration: 'underline' }
  };
  return { ...base, ...variants[variant] };
};
