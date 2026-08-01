import { useEffect, useState } from 'react';
import { GraduationCap, BookOpen, Sparkles } from 'lucide-react';

const SESSION_KEY = 'studeck_splash_shown';
const VISIBLE_MS = 1600;
const FADE_MS = 400;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), VISIBLE_MS);
    const doneTimer = setTimeout(onDone, VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 transition-opacity duration-[400ms] ${
        fadingOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <BookOpen className="absolute left-[12%] top-[20%] h-10 w-10 text-white/20 animate-fade-in" />
      <Sparkles className="absolute right-[15%] top-[28%] h-8 w-8 text-white/20 animate-fade-in" />
      <BookOpen className="absolute bottom-[22%] right-[18%] h-12 w-12 text-white/15 animate-fade-in" />

      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg animate-scale-in">
        <GraduationCap className="h-11 w-11 text-white" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold text-white animate-fade-in-up">
        Stu<span className="text-secondary-200">Deck</span>
      </h1>
      <p className="mt-2 text-sm text-white/80 animate-fade-in-up">
        Find and share academic materials that matter
      </p>
    </div>
  );
}

export function shouldShowSplash(): boolean {
  try {
    return !sessionStorage.getItem(SESSION_KEY);
  } catch {
    return true;
  }
}

export function markSplashShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}