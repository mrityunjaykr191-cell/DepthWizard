/**
 * DepthWizard — Lightweight Native Path Router
 * Avoids heavy router dependencies while providing clean browser URL navigation.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type RoutePath = '/' | '/workspace';

interface RouterContextType {
  currentPath: RoutePath;
  navigate: (path: RoutePath) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function normalizePath(pathname: string): RoutePath {
  if (pathname.startsWith('/workspace')) {
    return '/workspace';
  }
  return '/';
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => 
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: RoutePath) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
