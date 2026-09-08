import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function WelcomeScreen({ onNavigate }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1 & 2 happen simultaneously: Envelope zooms in AND flap opens
    const t2 = setTimeout(() => setStage(2), 200);
    const t3 = setTimeout(() => setStage(3), 1000);   // Flyer rises out
    const t4 = setTimeout(() => setStage(4), 1800);   // Button appears

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
      



      {/* Background ambient glow */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 3 ? 1 : 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <div className="w-full h-full" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 35%, rgba(253, 106, 59, 0.5) 0%, rgba(253, 106, 59, 0.2) 35%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 50% 35%, rgba(255, 140, 50, 0.3) 0%, transparent 50%)
          `
        }} />
      </motion.div>

      {/* Envelope Wrapper */}
      <motion.div 
        className="relative w-80 h-56 mt-44"
        style={{ perspective: '1200px', zIndex: 10, willChange: 'transform, opacity' }}
        initial={{ y: 30, scale: 0.2, opacity: 0 }}
        animate={{ 
          y: stage >= 3 ? 50 : 0, 
          scale: stage >= 1 ? 1 : 0.2,
          opacity: stage >= 1 ? 1 : 0,
        }}
        transition={{ 
          duration: 0.8, 
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.4, ease: 'easeOut' },
        }}
      >
        
        {/* Envelope Back Panel */}
        <div 
          className="absolute inset-0 rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
          style={{ 
            zIndex: 0, 
            background: 'linear-gradient(180deg, #1e1e1e, #161616)',
            border: '1px solid #2a2a2a',
          }}
        />

        {/* Flyer Wrapper — extends far up, but strictly clips at the envelope bottom to prevent bleed */}
        <div 
          className="absolute"
          style={{ 
            bottom: 0,
            left: 0,
            right: 0,
            top: '-500px', // Extend way up to allow rising
            overflow: 'hidden',
            zIndex: 2,
          }}
        >
          {/* The Flyer */}
          <motion.div
            className="absolute left-3 right-3 bg-black rounded-lg overflow-hidden shadow-2xl"
            style={{ 
              height: '400px',
              bottom: '6px',
              border: '1px solid #333',
              transformOrigin: 'bottom center',
              willChange: 'transform',
            }}
            initial={{ y: 200, scale: 0.97 }}
            animate={{ 
              y: stage >= 3 ? -90 : 200,
              scale: stage >= 3 ? 1.03 : 0.97,
            }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <img 
              src="/Official%20CTF%20Entebbe.jpeg" 
              alt="CTF Entebbe Flyer" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="text-center p-4"><h3 class="text-orange-500 font-bold text-xl">CTF Entebbe</h3><p class="text-xs text-gray-400 mt-2">Official Invitation</p></div>';
              }}
            />
          </motion.div>
        </div>

        {/* Envelope Left Flap */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            clipPath: 'polygon(0 0, 51% 51%, 0 100%)', // slightly overlapped to prevent 1px gap
            background: 'linear-gradient(135deg, #242424, #1a1a1a)',
            zIndex: 3,
          }}
        />
        
        {/* Envelope Right Flap */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            clipPath: 'polygon(100% 0, 49% 51%, 100% 100%)', 
            background: 'linear-gradient(225deg, #242424, #1a1a1a)',
            zIndex: 4,
          }}
        />

        {/* Envelope Bottom Flap */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            clipPath: 'polygon(0 100%, 50% 49%, 100% 100%)', 
            background: 'linear-gradient(0deg, #2a2a2a, #222)',
            zIndex: 5,
          }}
        />

        {/* Subtle fold lines for realism */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 6,
            background: `
              linear-gradient(to bottom right, transparent 49.5%, rgba(255,255,255,0.03) 49.5%, rgba(255,255,255,0.03) 50.5%, transparent 50.5%),
              linear-gradient(to bottom left, transparent 49.5%, rgba(255,255,255,0.03) 49.5%, rgba(255,255,255,0.03) 50.5%, transparent 50.5%)
            `,
          }}
        />

        {/* Envelope Top Flap — folds open with 3D rotation */}
        <motion.div
          className="absolute inset-0 origin-top"
          style={{ 
            transformStyle: 'preserve-3d',
            zIndex: stage >= 2 ? 1 : 7, // Drops behind flyer when opening
          }}
          initial={{ rotateX: 0 }}
          animate={{ rotateX: stage >= 2 ? -180 : 0 }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
        >
          {/* Front of the flap (Closed state) */}
          <div 
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 50% 50%)', 
              background: 'linear-gradient(180deg, #2c2c2c, #252525)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />
          {/* Back of the flap (Open state, inside) */}
          <div 
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 50% 50%)', 
              background: 'linear-gradient(180deg, #222, #1a1a1a)',
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />
        </motion.div>

      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col gap-4 mt-16"
        style={{ zIndex: 30 }}
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? 0 : 25 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => onNavigate('entebbe')}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-semibold tracking-wide text-base shadow-[0_0_20px_rgba(253,106,59,0.4)] transition-all hover:scale-105 active:scale-95 border border-orange-400/30"
        >
          Add Invited Member
        </button>
        <button
          onClick={() => onNavigate('serve')}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl font-semibold tracking-wide text-base shadow-[0_0_20px_rgba(1,135,23,0.4)] transition-all hover:scale-105 active:scale-95 border border-green-400/30"
        >
          Register to Serve
        </button>
      </motion.div>

    </div>
  );
}
