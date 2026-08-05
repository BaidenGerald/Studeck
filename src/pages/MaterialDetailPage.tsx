import { useEffect, useState } from 'react';
import { Link } from '@/components/Link';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { MaterialCard } from '@/components/MaterialCard';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import {
  fetchMaterialById,
  fetchRecentMaterials,
  recordDownload,
  downloadMaterialFile,
  toggleFavorite,
  isFavorited,
  fetchMyRating,
  fetchRatingsForMaterial,
  rateMaterial,
  summarizeMaterial,
  generateQuiz,
} from '@/lib/queries';
import {
  formatBytes, formatRelativeTime, formatDate, getFileExtension,
  MATERIAL_TYPE_LABELS, 
} from '@/lib/utils';
import { getMaterialTypeIcon, getDepartmentIcon } from '@/components/icons';
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating';
import { Avatar } from '@/components/Avatar';
import { renderMarkdownLite, renderInlineText } from '@/components/markdownLite';
import type { MaterialWithRelations, Rating } from '@/types/database';
import {
  Download, Bookmark, BookmarkCheck, FileText, Calendar, HardDrive,
  Tag, ArrowLeft, Share2, AlertCircle, CheckCircle2, User as UserIcon,
  GraduationCap, Star, Sparkles,
} from 'lucide-react';

export function MaterialDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [material, setMaterial] = useState<MaterialWithRelations | null>(null);
  const [related, setRelated] = useState<MaterialWithRelations[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [myRating, setMyRating] = useState<Rating | null>(null);
  const [reviews, setReviews] = useState<(Rating & { rater: { full_name: string } | null })[]>([]);
  const [reviewDraft, setReviewDraft] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMaterial(null);
    setMyRating(null);
    setReviews([]);
    setReviewDraft('');
    fetchMaterialById(id)
      .then(async (m) => {
        if (!active) return;
        setMaterial(m);
        if (m) {
          // Load related materials from the same department (excluding this one)
          const recents = await fetchRecentMaterials(20);
          const rel = recents
            .filter(
              (r) =>
                r.id !== m.id &&
                (r.department_id === m.department_id || r.course_id === m.course_id)
            )
            .slice(0, 3);
          setRelated(rel);
          fetchRatingsForMaterial(m.id).then(setReviews).catch(console.error);
          if (user) {
            const fav = await isFavorited(user.id, m.id);
            setFavorited(fav);
            const rating = await fetchMyRating(user.id, m.id);
            setMyRating(rating);
            setReviewDraft(rating?.review ?? '');
          }
        }
      })
      .catch((e) => console.error('Failed to load material', e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, user]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDownload = async () => {
    if (!material) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    setDownloading(true);
    try {
      await downloadMaterialFile(material);
      const isNewDownload = await recordDownload(user.id, material);
      // Only bump the visible count for genuinely new downloads, mirroring the
      // backend, which no longer recounts repeat downloads from the same user.
      if (isNewDownload) {
        setMaterial({ ...material, download_count: material.download_count + 1 });
      }
      showToast('success', 'Download started. Check your downloads folder.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Could not start the download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleFavorite = async () => {
    if (!material || !user) {
      navigate('/signin');
      return;
    }
    setTogglingFav(true);
    try {
      const nowFav = await toggleFavorite(user.id, material.id);
      setFavorited(nowFav);
      showToast('success', nowFav ? 'Added to favorites.' : 'Removed from favorites.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Could not update favorite.');
    } finally {
      setTogglingFav(false);
    }
  };

  const handleRate = async (stars: number) => {
    if (!material || !user) {
      navigate('/signin');
      return;
    }
    setSubmittingRating(true);
    try {
      const saved = await rateMaterial(user.id, material.id, stars, reviewDraft);
      setMyRating(saved);
      // Optimistically recompute the average shown on this page.
      const prevTotal = material.rating_avg * material.rating_count;
      const isNewRating = !myRating;
      const newCount = material.rating_count + (isNewRating ? 1 : 0);
      const adjustedTotal = isNewRating ? prevTotal + stars : prevTotal - (myRating?.rating ?? 0) + stars;
      setMaterial({
        ...material,
        rating_avg: newCount > 0 ? Math.round((adjustedTotal / newCount) * 100) / 100 : 0,
        rating_count: newCount,
      });
      showToast('success', 'Thanks for your rating!');
    } catch (e) {
      console.error(e);
      showToast('error', 'Could not save your rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleSummarize = async () => {
  if (!material) return;
  setSummarizing(true);
  setSummaryError(null);
  try {
    const { summary } = await summarizeMaterial(material.id);
    setMaterial({ ...material, summary });
  } catch (err) {
    console.error(err);
    setSummaryError(err instanceof Error ? err.message : 'Could not generate summary.');
  } finally {
    setSummarizing(false);
  }
};

const handleGenerateQuiz = async () => {
  if (!material) return;
  setGeneratingQuiz(true);
  setQuizError(null);
  try {
    const { quiz } = await generateQuiz(material.id);
    setMaterial({ ...material, quiz });
    setRevealedAnswers(new Set());
  } catch (err) {
    console.error(err);
    setQuizError(err instanceof Error ? err.message : 'Could not generate practice questions.');
  } finally {
    setGeneratingQuiz(false);
  }
};

const toggleAnswer = (index: number) => {
  setRevealedAnswers((prev) => {
    const next = new Set(prev);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });
};

  const handleShare = async () => {
    if (!material) return;
    const url = `${window.location.origin}${window.location.pathname}#/material/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: material.title, text: `Check out "${material.title}" on StuDeck`, url });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      showToast('success', 'Link copied to clipboard.');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast('error', 'Could not copy link.');
    }
  };

  if (loading) {
    return (
      <div className="container-app py-20">
        <div className="flex justify-center">
          <Spinner className="h-8 w-8 text-primary-500" />
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="Material not found"
          description="This resource may have been removed or the link is incorrect."
          action={<Link to="/browse" className="btn-primary">Back to library</Link>}
        />
      </div>
    );
  }

  const Icon = getMaterialTypeIcon(material.type);
  const DeptIcon = getDepartmentIcon(material.department?.icon);
  const ext = getFileExtension(material.file_name);
  const isOwner = user?.id === material.uploader_id;

  return (
    <div className="container-app py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link to="/browse" className="inline-flex items-center gap-1 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        {material.department && (
          <>
            <span>/</span>
            <Link to={`/browse?dept=${material.department.id}`} className="hover:text-primary-600">
              {material.department.name}
            </Link>
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="card animate-fade-in-up overflow-hidden p-0">
            {/* Header */}
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-primary-50 text-primary-700">
                    {MATERIAL_TYPE_LABELS[material.type]}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {ext}
                  </span>
                  {material.level && (
                    <span className="badge bg-slate-100 text-slate-600">
                      Level {material.level}
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                  {material.title}
                </h1>
                {material.rating_count > 0 && (
                  <div className="mt-2">
                    <StarRatingDisplay value={material.rating_avg} count={material.rating_count} size="md" />
                  </div>
                )}
                {material.description && (
                  <p className="mt-3 text-slate-600">{material.description}</p>
                )}
              </div>
            </div>

            {/* File info grid */}
            <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
              <InfoTile icon={HardDrive} label="File size" value={formatBytes(material.file_size)} />
              <InfoTile icon={Download} label="Downloads" value={String(material.download_count)} />
              <InfoTile icon={Calendar} label="Added" value={formatRelativeTime(material.created_at)} />
              <InfoTile icon={FileText} label="Format" value={ext} />
            </div>

            {/* Tags */}
            {material.tags.length > 0 && (
              <div className="border-t border-slate-100 p-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Tag className="h-4 w-4 text-primary-500" /> AI-generated tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {material.tags.map((t) => (
                    <Link
                      key={t}
                      to={`/browse?q=${encodeURIComponent(t)}`}
                      className="badge bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="border-t border-slate-100 p-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Star className="h-4 w-4 text-amber-400" /> Student reviews
                </div>
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">
                          {r.rater?.full_name ?? 'A student'}
                        </span>
                        <StarRatingDisplay value={r.rating} />
                      </div>
                      {r.review && <p className="mt-2 text-sm text-slate-600">{r.review}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
                <div className="border-t border-slate-100 p-6">
             <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
       <Sparkles className="h-4 w-4 text-primary-500" /> AI Summary
       </div>
        {!material.summary && !summarizing && (
         <button onClick={handleSummarize} className="btn-secondary !py-1.5 !text-xs">
        <Sparkles className="h-3.5 w-3.5" /> Summarize this material
       </button>
       )}
         </div>
     {summarizing && (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
      <Spinner className="h-4 w-4" /> Reading through it and writing a plain-language summary…
    </div>
    )}
   {summaryError && !summarizing && (
    <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {summaryError}
    </div>
   )}
   {material.summary && !summarizing && (
   <div className="rounded-xl bg-primary-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
    {renderMarkdownLite(material.summary)}
   </div>
   )}
   {!material.summary && !summarizing && !summaryError && (
    <p className="text-xs text-slate-400">
      Get a quick, easy-to-understand summary of this material generated by AI.
     </p>
     )}
    </div>

    {/* AI Practice Questions */}
   <div className="border-t border-slate-100 p-6">
   <div className="mb-3 flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <GraduationCap className="h-4 w-4 text-secondary-500" /> Practice Questions
    </div>
    {(!material.quiz || material.quiz.length === 0) && !generatingQuiz && (
      <button onClick={handleGenerateQuiz} className="btn-secondary !py-1.5 !text-xs">
        <Sparkles className="h-3.5 w-3.5" /> Generate practice questions
      </button>
    )}
   </div>
   {generatingQuiz && (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
      <Spinner className="h-4 w-4" /> Writing a few questions to help you review…
    </div>
   )}
   {quizError && !generatingQuiz && (
    <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {quizError}
    </div>
    )}
   {material.quiz && material.quiz.length > 0 && !generatingQuiz && (
    <div className="space-y-2">
      {material.quiz.map((q, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">
         {i + 1}. {renderInlineText(q.question)}
         </p>
         {revealedAnswers.has(i) ? (
          <div className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
          {renderMarkdownLite(q.answer)}
          </div>
           ) : (
            <button
              onClick={() => toggleAnswer(i)}
              className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Reveal answer
            </button>
          )}
        </div>
      ))}
    </div>
   )}
   {(!material.quiz || material.quiz.length === 0) && !generatingQuiz && !quizError && (
    <p className="text-xs text-slate-400">
      Generate a few AI-written practice questions to test yourself on this material.
    </p>
   )}
   </div>

            {/* Description / course block */}
            {(material.course || material.department) && (
              <div className="grid gap-4 border-t border-slate-100 p-6 sm:grid-cols-2">
                {material.department && (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm">
                      <DeptIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Department</p>
                      <p className="text-sm font-semibold text-slate-800">{material.department.name}</p>
                    </div>
                  </div>
                )}
                {material.course && (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary-600 shadow-sm">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Course</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {material.course.code} — {material.course.title}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Action card */}
          <div className="card animate-fade-in-up stagger-1 p-6">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary w-full"
            >
              {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Preparing…' : 'Download'}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleFavorite}
                disabled={togglingFav}
                className="btn-secondary"
              >
                {favorited ? <BookmarkCheck className="h-4 w-4 text-accent-500" /> : <Bookmark className="h-4 w-4" />}
                {favorited ? 'Saved' : 'Save'}
              </button>
             <button onClick={handleShare} className="btn-secondary">
                {linkCopied ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <Share2 className="h-4 w-4" />}
                {linkCopied ? 'Copied!' : 'Share'}
              </button>
            </div>
            {!user && (
              <p className="mt-3 text-center text-xs text-slate-500">
                <Link to="/signin" className="font-semibold text-primary-600">Sign in</Link> to download and save.
              </p>
            )}
          </div>

          {/* Rating card */}
          <div className="card animate-fade-in-up stagger-2 p-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Star className="h-3.5 w-3.5" /> {myRating ? 'Your rating' : 'Rate this material'}
            </p>
            {user ? (
              <>
                <StarRatingInput
                  value={myRating?.rating ?? 0}
                  onChange={handleRate}
                  disabled={submittingRating}
                />
                <textarea
                  className="input mt-3 min-h-[70px] resize-y text-sm"
                  placeholder="Add a short review (optional)…"
                  value={reviewDraft}
                  onChange={(e) => setReviewDraft(e.target.value)}
                  onBlur={() => myRating && handleRate(myRating.rating)}
                />
              </>
            ) : (
              <p className="text-xs text-slate-500">
                <Link to="/signin" className="font-semibold text-primary-600">Sign in</Link> to rate this material.
              </p>
            )}
          </div>

          {/* Uploader card */}
          {material.uploader && (
            <div className="card animate-fade-in-up stagger-2 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Uploaded by
              </p>
              <div className="flex items-center gap-3">
               <Avatar name={material.uploader.full_name} url={material.uploader.avatar_url} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{material.uploader.full_name}</p>
                  <p className="text-xs text-slate-500">{formatDate(material.created_at)}</p>
                </div>
              </div>
              {isOwner && (
                <div className="mt-4 rounded-xl bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700">
                  This is your upload. Thanks for sharing!
                </div>
              )}
            </div>
          )}

          {/* Preview note */}
          <div className="card animate-fade-in-up stagger-3 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
                <UserIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Academic use only</p>
                <p className="mt-1 text-xs text-slate-500">
                  Materials are shared by students for educational purposes. Please
                  respect copyright and credit original authors where applicable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-bold text-slate-900">Related materials</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        </section>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-down">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'bg-success-600 text-white'
                : 'bg-error-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Download;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
