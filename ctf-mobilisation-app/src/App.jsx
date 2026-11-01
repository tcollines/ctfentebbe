import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeScreen from './WelcomeScreen';
import RegistrationForm from './RegistrationForm';
import ServeForm from './ServeForm';
import { useUpdateAvailable, reloadForUpdate } from './appUpdate';

export default function App() {
  const [currentPage, setCurrentPage] = useState('welcome'); // 'welcome' | 'form'
  const updateAvailable = useUpdateAvailable();

  // On the welcome screen nothing has been typed yet, so a new version can load straight away
  useEffect(() => {
    if (updateAvailable && currentPage === 'welcome') reloadForUpdate();
  }, [updateAvailable, currentPage]);

  const handleNavigate = (page) => {
    setCurrentPage(page === 'entebbe' ? 'form' : page);
  };

  const handleBackToWelcome = () => {
    // Leaving a form is a safe moment to load a new version
    if (updateAvailable && reloadForUpdate()) return;
    setCurrentPage('welcome');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505]">
      
      {/* Global background — crowd image */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src="/Anniversary-Crowd-3-scaled.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          style={{ opacity: 0.15 }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%)'
        }} />
      </div>

      {/* Route Transitions */}
      <AnimatePresence mode="wait">
        {currentPage === 'welcome' ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <WelcomeScreen onNavigate={handleNavigate} />
          </motion.div>
        ) : currentPage === 'serve' ? (
          <motion.div
            key="serve"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <ServeForm 
              onBack={handleBackToWelcome}
            />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <RegistrationForm 
              onBack={handleBackToWelcome}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* New version banner (shown inside the forms, where reloading could lose what was typed) */}
      {updateAvailable && currentPage !== 'welcome' && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-orange-500/40 bg-[#141414]/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">A new version of the app is ready</p>
              <p className="text-xs text-gray-400">Finish what you are entering, then tap Update.</p>
            </div>
            <button
              type="button"
              onClick={() => reloadForUpdate({ userInitiated: true })}
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500"
            >
              Update
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
