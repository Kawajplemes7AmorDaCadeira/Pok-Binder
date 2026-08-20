import React from 'react';
import { motion } from 'motion/react';

interface PokeballSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PokeballSpinner: React.FC<PokeballSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} relative overflow-hidden rounded-full border-4 border-slate-900 bg-white shadow-[0_0_15px_rgba(239,68,68,0.3)]`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        {/* Top half red */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500 border-b-2 border-slate-900" />
        
        {/* Bottom half is white */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white" />
        
        {/* Center line and circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-white border-4 border-slate-900 rounded-full z-10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
        </div>
      </motion.div>
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
        Carregando...
      </span>
    </div>
  );
};
