import {
  Laptop, Sigma, Atom, FlaskConical, Dna, TrendingUp, Scale, Stethoscope, Cog,
  FileText, HelpCircle, BookOpen, Presentation, ListChecks,
  type LucideIcon,
} from 'lucide-react';
import type { MaterialType } from '@/types/database';
import { MATERIAL_TYPE_ICONS } from '@/lib/utils';

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  Laptop,
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  TrendingUp,
  Scale,
  Stethoscope,
  Cog,
};

export function getDepartmentIcon(name?: string | null): LucideIcon {
  if (!name) return FileText;
  return DEPARTMENT_ICONS[name] ?? FileText;
}

export function getMaterialTypeIcon(type: MaterialType): LucideIcon {
  const name = MATERIAL_TYPE_ICONS[type];
  const map: Record<string, LucideIcon> = {
    FileText,
    HelpCircle,
    BookOpen,
    Presentation,
    FlaskConical,
    ListChecks,
  };
  return map[name] ?? FileText;
}
