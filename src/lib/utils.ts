import type { MaterialType, MaterialWithRelations, Material } from '@/types/database';

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const week = Math.floor(day / 7);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);
  if (year >= 1) return `${year}y ago`;
  if (month >= 1) return `${month}mo ago`;
  if (week >= 1) return `${week}w ago`;
  if (day >= 1) return `${day}d ago`;
  if (hr >= 1) return `${hr}h ago`;
  if (min >= 1) return `${min}m ago`;
  return 'just now';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  notes: 'Lecture Notes',
  'past-question': 'Past Question',
  textbook: 'Textbook',
  slides: 'Slides',
  'lab-report': 'Lab Report',
  summary: 'Summary',
};

export const MATERIAL_TYPE_ICONS: Record<MaterialType, string> = {
  notes: 'FileText',
  'past-question': 'HelpCircle',
  textbook: 'BookOpen',
  slides: 'Presentation',
  'lab-report': 'FlaskConical',
  summary: 'ListChecks',
};

export const ALL_MATERIAL_TYPES: MaterialType[] = [
  'notes',
  'past-question',
  'textbook',
  'slides',
  'lab-report',
  'summary',
];

export const LEVELS = ['100', '200', '300', '400', '500', '600'];

export function materialLabel(m: { type: MaterialType }): string {
  return MATERIAL_TYPE_LABELS[m.type] ?? m.type;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function describeMaterial(m: MaterialWithRelations | Material): string {
  const parts: string[] = [];
  if ('department' in m && m.department) parts.push(m.department.name);
  if ('course' in m && m.course) parts.push(`${m.course.code}`);
  if (m.level) parts.push(`Level ${m.level}`);
  return parts.join(' · ');
}
