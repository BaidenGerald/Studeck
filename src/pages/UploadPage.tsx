import { useEffect, useRef, useState } from 'react';
import { Link } from '@/components/Link';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import {
  fetchDepartments,
  fetchCoursesByDepartment,
  uploadMaterialFile,
  createMaterial,
  autoTagMaterial,
} from '@/lib/queries';
import { ALL_MATERIAL_TYPES, MATERIAL_TYPE_LABELS, LEVELS, formatBytes } from '@/lib/utils';
import { getMaterialTypeIcon } from '@/components/icons';
import type { Department, Course, MaterialType } from '@/types/database';
import {
  UploadCloud, FileText, Sparkles, X, AlertCircle, CheckCircle2,
  Tag, Loader2, ArrowRight,
} from 'lucide-react';

export function UploadPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MaterialType>('notes');
  const [departmentId, setDepartmentId] = useState(profile?.department_id ?? '');
  const [courseId, setCourseId] = useState('');
  const [level, setLevel] = useState(profile?.level ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [tagging, setTagging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((e) => console.error('Failed to load departments', e))
      .finally(() => setLoadingDepts(false));
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setCourses([]);
      return;
    }
    fetchCoursesByDepartment(departmentId)
      .then(setCourses)
      .catch((e) => console.error('Failed to load courses', e));
  }, [departmentId]);

  // Run AI auto-tagging whenever the inputs it depends on change.
  const runAutoTag = async () => {
    if (!title.trim() && !description.trim()) {
      setTags([]);
      setMatchedKeywords([]);
      return;
    }
    setTagging(true);
    try {
      const dept = departments.find((d) => d.id === departmentId);
      const course = courses.find((c) => c.id === courseId);
      const result = await autoTagMaterial({
        title,
        description,
        type,
        courseTitle: course?.title,
        departmentName: dept?.name,
      });
      setTags(result.tags);
      setMatchedKeywords(result.matchedKeywords);
    } catch (e) {
      console.error('Auto-tag failed', e);
    } finally {
      setTagging(false);
    }
  };

  // Debounce auto-tagging
  useEffect(() => {
    const t = setTimeout(runAutoTag, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, type, departmentId, courseId, departments, courses]);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    if (!title) {
      // Auto-fill title from file name (strip extension)
      const name = selected.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      setTitle(name.replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));
  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (clean && !tags.includes(clean)) setTags([...tags, clean]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!departmentId) {
      setError('Please select a department.');
      return;
    }
    setSubmitting(true);
    try {
      const { path } = await uploadMaterialFile(user.id, file);
      const material = await createMaterial({
        title: title.trim(),
        description: description.trim(),
        type,
        courseId: courseId || null,
        departmentId,
        level: level || null,
        filePath: path,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        tags,
      });
      navigate(`/material/${material.id}`);
    } catch (e) {
      console.error('Upload failed', e);
      setError((e as Error).message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container-app py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <UploadCloud className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to upload</h1>
          <p className="mt-2 text-slate-600">
            You need an account to share materials with the StuDeck community.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/signin" className="btn-primary">Sign in</Link>
            <Link to="/signup" className="btn-secondary">Create account</Link>
          </div>
        </div>
      </div>
    );
  }

  const TypeIcon = getMaterialTypeIcon(type);

  return (
    <div className="container-app py-10">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-slate-900">Upload a resource</h1>
        <p className="mt-1 text-slate-600">
          Share lecture notes, past questions, or textbooks with your peers. AI will
          suggest tags automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left: file + form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              dragOver
                ? 'border-primary-400 bg-primary-50'
                : file
                ? 'border-success-300 bg-success-50/50'
                : 'border-slate-300 bg-white hover:border-primary-300 hover:bg-primary-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.xlsx,.xls,.csv,.zip,.rar,.7z,image/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-100 text-success-700">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-error-600"
                >
                  <X className="h-3.5 w-3.5" /> Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Drop a file here, or <span className="text-primary-600">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PDF, DOCX, PPTX, TXT, XLSX, ZIP, images — up to 50MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  placeholder="e.g. Calculus I — Final Exam Past Questions 2023"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[100px] resize-y"
                  placeholder="Briefly describe what this material covers…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Material type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_MATERIAL_TYPES.map((t) => {
                      const Icon = getMaterialTypeIcon(t);
                      const active = type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition ${
                            active
                              ? 'border-primary-400 bg-primary-50 text-primary-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {MATERIAL_TYPE_LABELS[t]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Department</label>
                    {loadingDepts ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Spinner className="h-4 w-4" /> Loading…
                      </div>
                    ) : (
                      <select
                        className="input"
                        value={departmentId}
                        onChange={(e) => { setDepartmentId(e.target.value); setCourseId(''); }}
                      >
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="label">Level</label>
                    <select
                      className="input"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="">Select level</option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>Level {l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Course (optional)</label>
                <select
                  className="input"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={!departmentId}
                >
                  <option value="">No specific course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI tags + submit */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">AI tags</h2>
              </div>
              {tagging ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                tags.length > 0 && (
                  <span className="badge bg-success-50 text-success-700">
                    <CheckCircle2 className="h-3 w-3" /> {tags.length} suggested
                  </span>
                )
              )}
            </div>

            <p className="mb-4 text-xs text-slate-500">
              Tags are generated automatically from your title, description, and
              selected course. You can adjust them before publishing.
            </p>

            {tags.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                  >
                    <Tag className="h-3 w-3" /> {t}
                    <button type="button" onClick={() => removeTag(t)} className="rounded-full p-0.5 hover:bg-primary-200">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              !tagging && (
                <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Start typing a title and description to see suggested tags.
                </p>
              )
            )}

            {matchedKeywords.length > 0 && (
              <div className="mb-4 rounded-lg bg-secondary-50 px-3 py-2 text-xs text-secondary-700">
                Matched: {matchedKeywords.join(', ')}
              </div>
            )}

            <AddTagInput onAdd={addTag} />
          </div>

          {/* Summary + submit */}
          <div className="card p-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Summary</h3>
            <dl className="space-y-2 text-sm">
              <SummaryRow label="File" value={file?.name ?? 'No file'} />
              <SummaryRow label="Type" value={MATERIAL_TYPE_LABELS[type]} />
              <SummaryRow label="Department" value={departments.find((d) => d.id === departmentId)?.name ?? '—'} />
              <SummaryRow label="Level" value={level ? `Level ${level}` : '—'} />
              <SummaryRow label="Tags" value={String(tags.length)} />
            </dl>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-error-50 px-3 py-2 text-xs text-error-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting || !file} className="btn-primary mt-4 w-full">
              {submitting ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {submitting ? 'Publishing…' : 'Publish material'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[60%] truncate font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function AddTagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) {
              onAdd(value);
              setValue('');
            }
          }
        }}
        placeholder="Add a custom tag…"
        className="input text-sm"
      />
      <button
        type="button"
        onClick={() => {
          if (value.trim()) {
            onAdd(value);
            setValue('');
          }
        }}
        className="btn-secondary shrink-0"
      >
        Add
      </button>
    </div>
  );
}
