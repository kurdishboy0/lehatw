import { Info, TriangleAlert, PartyPopper } from 'lucide-react';

// Colors and icon per announcement type, shared by the site banner and the
// admin preview.
export const ANNOUNCEMENT_STYLES = {
  INFO: { bg: '#e8eef9', border: '#b9cbe9', color: '#1B2A4A', icon: Info },
  WARNING: { bg: '#fdf6e3', border: '#ecd8a0', color: '#6b4f10', icon: TriangleAlert },
  SUCCESS: { bg: '#e6f4ea', border: '#b7dfc2', color: '#1f5130', icon: PartyPopper }
};
