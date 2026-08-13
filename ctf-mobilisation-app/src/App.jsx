import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeScreen from './WelcomeScreen';
import RegistrationForm from './RegistrationForm';

export default function App() {
  const [currentPage, setCurrentPage] = useState('welcome'); // 'welcome' | 'form'
  const handleNavigateToForm = () => {
    setCurrentPage('form');
  };

  const handleBackToWelcome = () => {
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
            <WelcomeScreen onNavigate={handleNavigateToForm} />
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

    </div>
  );
}
