import { Link } from '@/components/Link';
import { GraduationCap, Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-app py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold text-slate-900">
                Stu<span className="text-primary-600">Deck</span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              A centralized hub where students share lecture notes, past questions,
              and study materials — organized by course and department, with smart
              search and AI-powered recommendations.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/browse" className="text-slate-500 hover:text-primary-600">Explore materials</Link></li>
              <li><Link to="/upload" className="text-slate-500 hover:text-primary-600">Upload a resource</Link></li>
              <li><Link to="/dashboard" className="text-slate-500 hover:text-primary-600">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800">Connect</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600"><Github className="h-4 w-4" /> GitHub</a></li>
              <li><a href="#" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600"><Twitter className="h-4 w-4" /> Twitter</a></li>
              <li><a href="#" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600"><Mail className="h-4 w-4" /> Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} StuDeck. Built for students, by students.</p>
          <p>Powered by AI-assisted tagging & recommendations.</p>
        </div>
      </div>
    </footer>
  );
}
