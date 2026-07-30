import { Link } from '@/components/Link';
import { Download } from 'lucide-react';
import { getMaterialTypeIcon } from '@/components/icons';
import { StarRatingDisplay } from '@/components/StarRating';
import {
  formatRelativeTime,
  formatBytes,
  materialLabel,
  getFileExtension,
  MATERIAL_TYPE_LABELS,
} from '@/lib/utils';
import type { MaterialWithRelations, RecommendedMaterial } from '@/types/database';

interface MaterialCardProps {
  material: MaterialWithRelations | RecommendedMaterial;
  reason?: string;
}

export function MaterialCard({ material, reason }: MaterialCardProps) {
  const m = material as MaterialWithRelations;
  const Icon = getMaterialTypeIcon(m.type);
  const dept = m.department;
  const course = m.course;
  const ext = getFileExtension(m.file_name);

  return (
    <Link
      to={`/material/${m.id}`}
      className="card-hover group flex flex-col overflow-hidden p-0"
    >
      <div className="flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="badge bg-primary-50 text-primary-700">
              {MATERIAL_TYPE_LABELS[m.type]}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {ext}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-primary-700">
            {m.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {m.description || 'No description provided.'}
          </p>
          {m.rating_count > 0 && (
            <div className="mt-1.5">
              <StarRatingDisplay value={m.rating_avg} count={m.rating_count} />
            </div>
          )}
        </div>
      </div>

      {reason && (
        <div className="mx-5 mb-1 rounded-lg bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700">
          {reason}
        </div>
      )}

      {m.tags && m.tags.length > 0 && (
        <div className="mx-5 mb-3 flex flex-wrap gap-1">
          {m.tags.slice(0, 3).map((t) => (
            <span key={t} className="badge bg-slate-100 text-slate-600">
              {t}
            </span>
          ))}
          {m.tags.length > 3 && (
            <span className="badge bg-slate-100 text-slate-500">
              +{m.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          {dept && (
            <span className="truncate font-medium text-slate-600">{dept.code}</span>
          )}
          {course && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate">{course.code}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {m.download_count}
          </span>
          <span>{formatRelativeTime(m.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export function MaterialCardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-slate-100" />
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 h-3 w-full rounded bg-slate-100" />
    </div>
  );
}

export { materialLabel, formatBytes };
