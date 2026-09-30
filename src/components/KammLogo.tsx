import React from 'react';
import { Shield } from 'lucide-react';

export const KammLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; variant?: string }> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base'
  }[size];

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>

      <div className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black tracking-wider`}>
        <Shield className="h-5 w-5 fill-white/20" />
      </div>
      <div>
        <div className="flex items-center space-x-1.5 leading-none">
          <span className="font-black text-white tracking-wider text-base">KAMM</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            MANADO
          </span>
        </div>
        <p className="text-[10px] text-[#8e96a8] tracking-tight mt-0.5 font-medium">
          Super App Operasional &amp; Sales
        </p>
      </div>
    </div>
  );
};
