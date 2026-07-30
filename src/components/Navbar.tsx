import { useEffect, useRef, useState } from 'react';
import { Link } from '@/components/Link';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { initials } from '@/lib/utils';
import {
  GraduationCap, Search, Upload, LayoutDashboard, LogOut, User as UserIcon,
  Menu, X, Bookmark, FileStack,
} from 'lucide-react';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [route.full]);

  useEffect(() => {
    const onClick = (e: globalThis.MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (path: string) =>
    route.path === path || (path !== '/' && route.path.startsWith(path));

  const navItems = user
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/browse', label: 'Explore', icon: Search },
        { to: '/upload', label: 'Upload', icon: Upload },
      ]
    : [
        { to: '/browse', label: 'Explore', icon: Search },
      ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm'
          : 'border-b border-transparent bg-white/60 backdrop-blur-sm'
      }`}
    >
      <nav className="container-app flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold text-slate-900">
            Stu<span className="text-primary-600">Deck</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.to)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/signin" className="btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary">
                Get started
              </Link>
            </>
          ) : (
            <div className="relative hidden md:block" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 pr-2 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
                  {initials(profile?.full_name ?? 'S')}
                </div>
                <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
                  {profile?.full_name?.split(' ')[0] ?? 'Account'}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right animate-scale-in rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {profile?.full_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">{profile?.email}</p>
                  </div>
                  <MenuItem icon={LayoutDashboard} label="Dashboard" onClick={() => navigate('/dashboard')} />
                  <MenuItem icon={FileStack} label="My Uploads" onClick={() => navigate('/profile/uploads')} />
                  <MenuItem icon={Bookmark} label="Favorites" onClick={() => navigate('/profile/favorites')} />
                  <MenuItem icon={UserIcon} label="Profile" onClick={() => navigate('/profile')} />
                  <div className="my-1 border-t border-slate-100" />
                  <MenuItem
                    icon={LogOut}
                    label="Sign out"
                    danger
                    onClick={async () => {
                      await signOut();
                      navigate('/');
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="btn-ghost p-2 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="animate-slide-down border-t border-slate-200 bg-white md:hidden">
          <div className="container-app space-y-1 py-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {user && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <UserIcon className="h-4 w-4" /> Profile
                </Link>
                <Link to="/profile/uploads" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <FileStack className="h-4 w-4" /> My Uploads
                </Link>
                <Link to="/profile/favorites" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <Bookmark className="h-4 w-4" /> Favorites
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            )}
            {!user && (
              <div className="flex gap-2 pt-2">
                <Link to="/signin" className="btn-secondary flex-1">Sign in</Link>
                <Link to="/signup" className="btn-primary flex-1">Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof UserIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        danger
          ? 'text-error-600 hover:bg-error-50'
          : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
