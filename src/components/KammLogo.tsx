import React from 'react';

interface KammLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const KammLogo: React.FC<KammLogoProps> = ({ 
  className = '', 
  variant = 'full',
  size = 'md' 
}) => {
  if (variant === 'icon') {
    // Compact square icon version (KAMM block + mini waves)
    return (
      <svg 
        viewBox="0 0 120 120" 
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="120" height="120" rx="24" fill="#0f172a" />
        {/* KAMM Text */}
        <text 
          x="60" 
          y="56" 
          textAnchor="middle" 
          fontFamily="'Arial Black', 'Impact', 'Montserrat', sans-serif" 
          fontWeight="900" 
          fontSize="36" 
          letterSpacing="1"
          fill="#ffffff"
        >
          KAMM
        </text>
        
        {/* Mini 3 waves */}
        <path 
          d="M 22 74 C 36 67, 50 67, 64 74 C 78 81, 92 81, 100 75" 
          fill="none" 
          stroke="#38bdf8" 
          strokeWidth="5" 
          strokeLinecap="round" 
        />
        <path 
          d="M 22 86 C 36 79, 50 79, 64 86 C 78 93, 92 93, 100 87" 
          fill="none" 
          stroke="#60a5fa" 
          strokeWidth="5" 
          strokeLinecap="round" 
        />
        <path 
          d="M 22 98 C 36 91, 50 91, 64 98 C 78 105, 92 105, 100 99" 
          fill="none" 
          stroke="#818cf8" 
          strokeWidth="5" 
          strokeLinecap="round" 
        />
      </svg>
    );
  }

  // Full official logo banner (Matching SPANDUK BARUA-13)
  // Text: "KAMM" on left, 4 wavy lines on right, "KSP ANUGRAH MEGA MANDIRI" below
  return (
    <svg 
      viewBox="0 0 540 145" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo KAMM - KSP Anugrah Mega Mandiri"
    >
      <defs>
        <linearGradient id="kammWhiteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>

      {/* Main KAMM Block Letters */}
      <g fill="url(#kammWhiteGrad)">
        {/* K */}
        <path d="M 16 16 L 38 16 L 38 48 L 62 16 L 86 16 L 56 55 L 88 95 L 63 95 L 38 61 L 38 95 L 16 95 Z" />
        
        {/* A */}
        <path d="M 94 95 L 118 16 L 140 16 L 164 95 L 142 95 L 137 77 L 120 77 L 115 95 Z M 123 60 L 134 60 L 128.5 37 Z" />
        
        {/* M (first) */}
        <path d="M 172 16 L 194 16 L 206 58 L 218 16 L 240 16 L 240 95 L 221 95 L 221 44 L 211 78 L 201 78 L 191 44 L 191 95 L 172 95 Z" />
        
        {/* M (second) */}
        <path d="M 248 16 L 270 16 L 282 58 L 294 16 L 316 16 L 316 95 L 297 95 L 297 44 L 287 78 L 277 78 L 267 44 L 267 95 L 248 95 Z" />
      </g>

      {/* 4 Waves on Right Side */}
      <g fill="none" stroke="#ffffff" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Wave 1 (Top) */}
        <path d="M 334 26 C 362 14, 386 14, 414 26 C 442 38, 466 38, 494 26 C 506 21, 518 20, 526 23" />
        
        {/* Wave 2 */}
        <path d="M 334 46 C 362 34, 386 34, 414 46 C 442 58, 466 58, 494 46 C 506 41, 518 40, 526 43" />
        
        {/* Wave 3 */}
        <path d="M 334 66 C 362 54, 386 54, 414 66 C 442 78, 466 78, 494 66 C 506 61, 518 60, 526 63" />
        
        {/* Wave 4 (Bottom) */}
        <path d="M 334 86 C 362 74, 386 74, 414 86 C 442 98, 466 98, 494 86 C 506 81, 518 80, 526 83" />
      </g>

      {/* Subtitle / Full Name: KSP ANUGRAH MEGA MANDIRI */}
      <text 
        x="16" 
        y="130" 
        fontFamily="'Arial Black', 'Impact', 'Montserrat', 'Trebuchet MS', sans-serif" 
        fontWeight="900" 
        fontSize="28.5" 
        letterSpacing="2.5" 
        fill="#ffffff"
      >
        KSP ANUGRAH MEGA MANDIRI
      </text>
    </svg>
  );
};
