import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RequireAuth } from '@/components/RequireAuth';
import { FullPageLoader } from '@/components/Spinner';

import { LandingPage } from '@/pages/LandingPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { SignInPage } from '@/pages/SignInPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BrowsePage } from '@/pages/BrowsePage';
import { MaterialDetailPage } from '@/pages/MaterialDetailPage';
import { UploadPage } from '@/pages/UploadPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MyUploadsPage } from '@/pages/MyUploadsPage';
import { FavoritesPage } from '@/pages/FavoritesPage';

function Routes() {
  const { route } = useRouter();
  const { loading, user } = useAuth();
  const path = route.path;

  // Routes that don't show the marketing chrome (auth screens)
  const bareRoute = path === '/signin' || path === '/signup';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.full]);

  // Show loader on initial auth bootstrap for authenticated routes
  if (loading && !bareRoute) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <FullPageLoader />
      </div>
    );
  }

  // Auth screens render standalone (no navbar/footer)
  if (bareRoute) {
    if (path === '/signin') return <SignInPage />;
    if (path === '/signup') return <SignUpPage />;
  }

  let page: React.ReactNode;
  let requiresAuth = false;

  if (path === '/' || path === '') {
    page = <LandingPage />;
  } else if (path === '/browse') {
    page = <BrowsePage />;
  } else if (path.startsWith('/material/')) {
    const id = path.slice('/material/'.length);
    page = <MaterialDetailPage id={id} />;
  } else if (path === '/dashboard') {
    requiresAuth = true;
    page = <DashboardPage />;
  } else if (path === '/upload') {
    requiresAuth = true;
    page = <UploadPage />;
  } else if (path === '/profile') {
    requiresAuth = true;
    page = <ProfilePage />;
  } else if (path === '/profile/uploads') {
    requiresAuth = true;
    page = <MyUploadsPage />;
  } else if (path === '/profile/favorites') {
    requiresAuth = true;
    page = <FavoritesPage />;
  } else {
    page = <NotFound />;
  }

  // If auth is still loading for a protected route, wait
  if (requiresAuth && loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <FullPageLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {requiresAuth ? <RequireAuth>{page}</RequireAuth> : page}
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="container-app flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-bold text-primary-200">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you're looking for doesn't exist.</p>
      <a href="#/" className="btn-primary mt-6">Back home</a>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

export default App;
