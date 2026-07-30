import { useEffect, useState, useCallback } from 'react';

// A tiny hash-based router. Routes look like #/path/here?query=value.
// We keep the URL in sync and expose the current path + query params + navigate().
export interface Route {
  path: string; // e.g. "/browse"
  query: URLSearchParams;
  full: string; // e.g. "/browse?q=calculus&dept=cs"
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryString] = raw.split('?');
  return {
    path: path || '/',
    query: new URLSearchParams(queryString ?? ''),
    full: raw,
  };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('#') ? to.slice(1) : to;
    if (window.location.hash === `#${target}`) {
      // Force re-render even if hash is identical
      setRoute(parseHash());
    } else {
      window.location.hash = target;
    }
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { route, navigate };
}

// Convenience hook for components that just need the current route + navigate.
export function useRoute() {
  const { route, navigate } = useRouter();
  return { route, navigate };
}
