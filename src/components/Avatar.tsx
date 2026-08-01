import { initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-24 w-24 text-2xl',
};

/** Shows the user's avatar image if they have one, otherwise their initials. */
export function Avatar({ name, url, size = 'md', className = '' }: AvatarProps) {
  const dims = SIZE_CLASSES[size];
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${dims} rounded-2xl object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex ${dims} items-center justify-center rounded-2xl bg-primary-100 font-bold text-primary-700 ${className}`}
    >
      {initials(name)}
    </div>
  );
}