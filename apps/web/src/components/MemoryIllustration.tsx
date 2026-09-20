import type { MemoryGalleryTag } from '@/lib/demoSeed';

interface MemoryIllustrationProps {
  tag?: MemoryGalleryTag | string;
  title?: string;
  className?: string;
}

/** A calm, readable placeholder for memories that do not have a photograph. */
export function MemoryIllustration({ tag = 'Family', title = 'A cherished memory', className = '' }: MemoryIllustrationProps) {
  const palette = tag === 'Travel'
    ? { sky: '#DBEAFE', accent: '#2563EB', ground: '#BFDBFE', sun: '#F59E0B' }
    : tag === 'Music'
      ? { sky: '#EDE9FE', accent: '#7C3AED', ground: '#DDD6FE', sun: '#F59E0B' }
      : { sky: '#CCFBF1', accent: '#0D9488', ground: '#99F6E4', sun: '#F4C95D' };

  return (
    <svg viewBox="0 0 320 160" role="img" aria-label={`${tag} memory illustration`} className={`h-full w-full ${className}`}>
      <rect width="320" height="160" fill={palette.sky} />
      <circle cx="255" cy="42" r="22" fill={palette.sun} />
      <path d="M0 124c48-35 75-22 116-10 45 13 73-18 111-17 35 1 56 19 93 7v56H0Z" fill={palette.ground} />
      <path d="M0 138c50-18 87-9 126 2 48 13 76-12 112-10 30 1 51 10 82 4v26H0Z" fill={palette.accent} opacity=".72" />
      <text x="18" y="34" fill="#334155" fontSize="14" fontFamily="system-ui" fontWeight="700">{tag}</text>
      <text x="18" y="54" fill="#475569" fontSize="11" fontFamily="system-ui">{title}</text>
    </svg>
  );
}
