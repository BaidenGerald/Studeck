import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}

/** Read-only star display, e.g. for material cards and the detail header. */
export function StarRatingDisplay({ value, count, size = 'sm' }: StarRatingDisplayProps) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`${dim} ${n <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
          />
        ))}
      </span>
      {typeof count === 'number' && (
        <span className="text-xs text-slate-500">
          {value > 0 ? value.toFixed(1) : 'No ratings'}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

/** Interactive 1-5 star picker used to submit a rating. */
export function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          className="p-0.5 disabled:cursor-not-allowed"
        >
          <Star
            className={`h-6 w-6 transition ${
              n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
