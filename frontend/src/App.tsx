import React from 'react';
import { RouterProvider, useRouter } from './router/Router';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { ThemeProvider } from './state/ThemeContext';
import { LandingPage } from './components/landing/LandingPage';
import { WorkspaceShell } from './components/workspace/WorkspaceShell';

import { AnimatePresence, motion } from 'motion/react';

const AppRoutes: React.FC = () => {
  const { currentPath } = useRouter();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentPath}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="w-full h-full min-h-screen"
      >
        {currentPath === '/workspace' ? <WorkspaceShell /> : <LandingPage />}
      </motion.div>
    </AnimatePresence>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <RouterProvider>
        <WorkspaceProvider>
          <AppRoutes />
        </WorkspaceProvider>
      </RouterProvider>
    </ThemeProvider>
  );
};

export default App;
