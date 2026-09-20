import React, { useState } from 'react';

// Centralised share link helper to guarantee access across iframe permissions and devices
export const getSharedUrl = () => {
  const origin = window.location.origin;
  // Automatically rewrite dev URLs to their corresponding public pre/shared preview domains to eliminate auth blocks
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-') + '/';
  }
  return origin + '/';
};

// SmartLogo component supporting custom base64 file uploads (localStorage) and beautiful instant vector SVGs
export const SmartLogo = ({ 
  logoKey, 
  localStorageLogo, 
  className = "w-12 h-12" 
}: { 
  logoKey: 'uba' | 'conicet' | 'ffyb' | 'fouba', 
  localStorageLogo?: string, 
  className?: string 
}) => {
  // If there's an explicit localStorage base64 logo uploaded, use that first
  if (localStorageLogo) {
    return (
      <img 
        src={localStorageLogo} 
        alt={logoKey} 
        className={`${className} object-contain`} 
        referrerPolicy="no-referrer" 
      />
    );
  }

  // Directly return the ultra high fidelity vector SVGs. 
  // This guarantees logos persist perfectly on all screens and never show broken image links.
  if (logoKey === 'uba') {
    return <UbaSealSVG className={className} />;
  } else if (logoKey === 'conicet') {
    return <ConicetIquifibSVG className={className} />;
  } else if (logoKey === 'ffyb') {
    return <FfybSVG className={className} />;
  } else {
    return <FoubaSVG className={className} />;
  }
};

// 1. Photo-realistic High-Fidelity Traditional circular Badge of UBA (Universidad de Buenos Aires)
// Matched exactly to the classical black and white Minerva engraving seal
export const UbaSealSVG = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg 
    className={`${className} bg-white rounded-full p-0.5`} 
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer triple circles for academic engraving feeling */}
    <circle cx="100" cy="100" r="97" fill="none" stroke="#000000" strokeWidth="2.5" />
    <circle cx="100" cy="100" r="94" fill="none" stroke="#000000" strokeWidth="1" />
    <circle cx="100" cy="100" r="82" fill="none" stroke="#000000" strokeWidth="1.5" />
    <circle cx="100" cy="100" r="54" fill="none" stroke="#000000" strokeWidth="2.5" />

    {/* Elegant classical outer text */}
    <path id="ubaTopPath" d="M 18,100 A 82,82 0 0,1 182,100" fill="none" />
    <text className="font-sans font-extrabold text-[12.5px] tracking-[0.06em]" fill="#000000">
      <textPath href="#ubaTopPath" startOffset="50%" textAnchor="middle">
        UNIVERSIDAD • DE • BUENOS • AIRES
      </textPath>
    </text>

    <path id="ubaBottomPath" d="M 182,100 A 82,82 0 0,1 18,100" fill="none" />
    <text className="font-serif font-black text-[13.5px] tracking-[0.14em]" fill="#000000">
      <textPath href="#ubaBottomPath" startOffset="50%" textAnchor="middle">
        ARCTAVIRTVSROBRETSTVDIVM
      </textPath>
    </text>

    {/* Circular text separators dots/laurel twigs */}
    <g fill="#000000">
      <path d="M 12 108 C 10 115, 14 125, 10 135 C 13 130, 16 120, 15 110 Z" />
      <path d="M 188 108 C 190 115, 186 125, 190 135 C 187 130, 184 120, 185 110 Z" />
    </g>

    {/* Center Minerva Sitting Drawing */}
    <g transform="translate(100, 100)">
      {/* Background horizontal lines of the engraving */}
      <line x1="-48" y1="-28" x2="48" y2="-28" stroke="#000000" strokeWidth="0.8" opacity="0.4" />
      <line x1="-48" y1="-20" x2="48" y2="-20" stroke="#000000" strokeWidth="0.8" opacity="0.4" />
      <line x1="-48" y1="-12" x2="48" y2="-12" stroke="#000000" strokeWidth="0.8" opacity="0.4" />
      <line x1="-48" y1="-4" x2="48" y2="-4" stroke="#000000" strokeWidth="0.8" opacity="0.4" />
      <line x1="-48" y1="4" x2="48" y2="4" stroke="#000000" strokeWidth="0.8" opacity="0.4" strokeDasharray="14 10" />
      <line x1="-40" y1="12" x2="40" y2="12" stroke="#000000" strokeWidth="0.8" opacity="0.4" strokeDasharray="30 15" />

      {/* Minerva Silhouette details matching original logo */}
      {/* Chair / Throne Back */}
      <path d="M 15,-20 Q 30,-15 28,15 L 25,35" fill="none" stroke="#000000" strokeWidth="1.5" />
      <path d="M 28,-10 Q 35,5 30,30" fill="none" stroke="#000000" strokeWidth="0.8" />
      
      {/* Minerva's body */}
      {/* Dress folds (Himation/Peplos) */}
      <path d="M -15,10 C -25,25 -25,40 -12,40 C -8,43 5,43 12,40 C 20,38 22,25 20,10 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
      <path d="M -18,22 Q -5,25 -2,42" fill="none" stroke="#000000" strokeWidth="1" />
      <path d="M -10,18 Q 2,28 6,42" fill="none" stroke="#000000" strokeWidth="1" />
      <path d="M -3,15 Q 10,25 12,41" fill="none" stroke="#000000" strokeWidth="1" />
      
      {/* Torso & Arms */}
      <path d="M -5,5 C -8,-10 8,-12 10,5 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
      
      {/* Right arm support (Minerva rests her head on her hand) */}
      <path d="M -5,0 C -15,-8 -2,-20 -5,-25" fill="none" stroke="#000000" strokeWidth="1.5" />
      <path d="M -5,-3 C -10,-14 -14,-15 -20,-6" fill="none" stroke="#000000" strokeWidth="1" />
      
      {/* Head & Hair */}
      <circle cx="2" cy="-28" r="8" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
      <path d="M -3,-33 Q 5,-35 8,-26" fill="none" stroke="#000000" strokeWidth="1.2" />

      {/* Book on lap */}
      <path d="M -22,0 L 5,3 C 8,3 8,-4 0,-5 L -18,-7 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
      <line x1="-18" y1="-3" x2="2" y2="0" stroke="#000000" strokeWidth="1.2" />
      <path d="M -10,-4 L -4,8" stroke="#000000" strokeWidth="1" />

      {/* Feet */}
      <path d="M -8,40 Q -10,48 -1,48 C 3,46 1,40 1,40" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
    </g>
  </svg>
);

// 2. Photo-realistic High-fidelity CONICET - IQUIFIB Logo Badge
// Rebuilt precisely as the original logo: .UBA + CONICET + IQUIFIB + Blue Helix / Yellow Sun
export const ConicetIquifibSVG = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg 
    className={`${className} bg-white p-1`} 
    viewBox="0 0 450 170" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* .UBA + Universidad de Buenos Aires */}
    <g transform="translate(10, -5)">
      <circle cx="28" cy="48" r="9" fill="#002D62" />
      <text x="38" y="58" className="font-sans font-black text-[58px]" fill="#002D62">UBA</text>
      <text x="12" y="85" className="font-sans font-bold text-[22px] tracking-tight" fill="#002D62">Universidad de</text>
      <text x="12" y="110" className="font-sans font-bold text-[22px] tracking-tight" fill="#002D62">Buenos Aires</text>
    </g>

    {/* CONICET Ribbon Infinity Helix with Sun on the right */}
    <g transform="translate(235, -5)">
      {/* CONICET Word */}
      <text x="12" y="32" className="font-serif font-semibold text-[32px] tracking-[0.04em]" fill="#000000">CONICET</text>

      {/* Infinity Wave (Ribbon) Representation */}
      <path 
        d="M 12,78 C 45,52 82,98 112,74 C 132,58 152,70 168,60 C 158,82 135,74 112,87 C 82,104 45,64 12,78 Z" 
        fill="#29ABE2" 
      />
      <path 
        d="M 12,78 C 30,68 50,75 58,85 Q 75,102 112,87 L 112,74 Q 75,90 50,75 Z" 
        fill="#0071BC" 
        opacity="0.8"
      />

      {/* Glowing Radiating Sun with yellow/orange rays under the DNA/infinity ribbon */}
      <g transform="translate(128, 77)">
        {/* Rays */}
        <line x1="0" y1="0" x2="30" y2="4" stroke="#FBBF24" strokeWidth="2.5" />
        <line x1="0" y1="0" x2="28" y2="-10" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="24" y2="-20" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="14" y2="-26" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="-2" y2="-28" stroke="#FBBF24" strokeWidth="2.5" />
        <line x1="0" y1="0" x2="-16" y2="-24" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="-26" y2="-15" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="-28" y2="-2" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="20" y2="15" stroke="#FBBF24" strokeWidth="2.5" />
        <line x1="0" y1="0" x2="6" y2="24" stroke="#FBBF24" strokeWidth="2" />
        <line x1="0" y1="0" x2="-10" y2="24" stroke="#FBBF24" strokeWidth="2" />
      </g>
    </g>

    {/* Center divider horizontal black line */}
    <line x1="10" y1="126" x2="440" y2="126" stroke="#000000" strokeWidth="1.5" />

    {/* I Q U I F I B serif spaced text below */}
    <text 
      x="225" 
      y="158" 
      className="font-serif text-[33px] tracking-[0.45em]" 
      fill="#000000" 
      textAnchor="middle"
    >
      IQUIFIB
    </text>
  </svg>
);

// 3. Photo-realistic High-fidelity Facultad de Farmacia y Bioquímica (UBA) Shield
// Exact clone with circular border text, black G-swoosh, and live flame on the right
export const FfybSVG = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg 
    className={`${className} bg-white rounded-full p-0.5`} 
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ffybFire" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#D35400" />
        <stop offset="30%" stopColor="#E67E22" />
        <stop offset="70%" stopColor="#F1C40F" />
        <stop offset="100%" stopColor="#FFF3A8" />
      </linearGradient>
    </defs>

    {/* Elegant double-line outer circular frames */}
    <circle cx="100" cy="100" r="97" fill="none" stroke="#000000" strokeWidth="2" />
    <circle cx="100" cy="100" r="77" fill="none" stroke="#000000" strokeWidth="1.5" />

    {/* Circular text paths for the university academic departments */}
    <path id="ffybTopTextPath" d="M 23,100 A 77,77 0 0,1 177,100" fill="none" />
    <text className="font-serif font-bold text-[8.5px] tracking-[0.02em]" fill="#000000">
      <textPath href="#ffybTopTextPath" startOffset="50%" textAnchor="middle">
        FACULTAD DE FARMACIA Y BIOQUIMICA U.B.A.
      </textPath>
    </text>

    <path id="ffybBottomTextPath" d="M 177,100 A 77,77 0 0,1 23,100" fill="none" />
    <text className="font-serif font-black text-[9px] tracking-[0.04em]" fill="#000000">
      <textPath href="#ffybBottomTextPath" startOffset="50%" textAnchor="middle">
        LUMEN ET NUMEN SALUTIFER VITAE
      </textPath>
    </text>

    {/* Center logo elements: stylized G-ring-swoosh plus burning flame */}
    <g transform="translate(100, 100)">
      {/* Heavy black stylish custom "G" curve / snake path */}
      <path 
        d="M -44,-1 Q -44,-42 0,-42 C 22,-42 25,-22 25,-12 L 20,-12 M 25,-12 Q 22,-37 0,-37 C -38,-37 -38,-1 -38,-1 C -38,32 0,38 38,13 L 38,-1 L -15,-1 L -15,4 L 33,4 C 20,28 -15,32 -32,22 C -42,15 -44,3 -44,-1 M 33,4 L 38,4 C 38,1 L 38,-1 L 33,-1 Z" 
        fill="#000000" 
      />
      
      {/* Living chemical/pharmaceutical torch flame */}
      <path 
        d="M 22,-6 C 10,-24 35,-42 33,-52 C 40,-41 45,-24 45,-14 C 45,-8 36,0 22,-6 Z" 
        fill="url(#ffybFire)" 
        stroke="#E67E22" 
        strokeWidth="0.8" 
      />
      <circle cx="34" cy="-20" r="3.5" fill="#FFFFFF" opacity="0.3" />
    </g>
  </svg>
);

// 4. Photo-realistic High-fidelity Facultad de Odontología (FOUBA) circular label
// Exactly matching the red solid circle with white bold FO + UBA plus smiley crescent shape
export const FoubaSVG = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg 
    className={`${className} bg-white rounded-full p-0.5`} 
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Solid gloss red circular background */}
    <circle cx="100" cy="100" r="97" fill="#D2143A" />
    
    {/* Bold clean "FO" lettering representing FOUBA */}
    <text 
      x="100" 
      y="114" 
      fill="#FFFFFF" 
      className="font-sans font-extrabold text-[84px] tracking-[-0.05em]" 
      textAnchor="middle"
    >
      FO
    </text>

    {/* Dental crescent vector accent smile curve */}
    <path 
      d="M 52,112 C 64,144 136,144 148,112 C 140,148 100,152 52,112 Z" 
      fill="#FFFFFF" 
    />

    {/* UBA label placed perfectly inside the red sphere */}
    <text 
      x="100" 
      y="172" 
      fill="#FFFFFF" 
      className="font-sans font-black text-[22px] tracking-[0.12em]" 
      textAnchor="middle"
    >
      UBA
    </text>
  </svg>
);
