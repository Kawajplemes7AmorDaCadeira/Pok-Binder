import React, { useState } from 'react';
import { ImageOff, Sparkles, Star, Zap } from 'lucide-react';
import { CardVariant, PokemonCard } from '../types';

interface CardImageProps {
  src?: string;
  alt: string;
  className?: string;
  rarity?: string;
  isHolo?: boolean;
  variant?: CardVariant;
  onClick?: () => void;
  showZoomHint?: boolean;
  showVariantBadge?: boolean;
  card?: PokemonCard;
}

export const CardImage: React.FC<CardImageProps> = ({
  src,
  alt,
  className = '',
  rarity,
  isHolo,
  variant = 'normal',
  onClick,
  showZoomHint = false,
  showVariantBadge = false,
  card,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    shineX: 50,
    shineY: 50,
    active: false,
  });

  // Effective variant determination
  const effectiveVariant: CardVariant =
    variant ||
    (isHolo ? 'holo' : undefined) ||
    (rarity && rarity.toLowerCase().includes('holo') ? 'holo' : 'normal');

  const isSecretRare =
    rarity &&
    ['secret rare', 'hyper rare', 'special illustration rare', 'gold'].some((r) =>
      rarity.toLowerCase().includes(r)
    );
  const isIllustrationRare =
    rarity &&
    ['illustration rare', 'character rare', 'ultra rare'].some((r) =>
      rarity.toLowerCase().includes(r)
    );

  const isFoil =
    effectiveVariant === 'holo' ||
    effectiveVariant === 'reverse' ||
    effectiveVariant === 'cosmosHolo' ||
    effectiveVariant === 'promo' ||
    effectiveVariant === 'stamped' ||
    effectiveVariant === 'firstEdition' ||
    isSecretRare ||
    isIllustrationRare ||
    isHolo;

  // Dynamic border and glow styling based on variant & rarity
  let borderClasses = 'border border-slate-800/80';
  if (!isLoading) {
    if (effectiveVariant === 'reverse') {
      borderClasses =
        'ring-2 ring-pink-500/50 hover:ring-2 hover:ring-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.25)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]';
    } else if (effectiveVariant === 'holo' || effectiveVariant === 'cosmosHolo') {
      borderClasses =
        'ring-2 ring-purple-500/50 hover:ring-2 hover:ring-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]';
    } else if (effectiveVariant === 'promo' || isSecretRare) {
      borderClasses =
        'ring-2 ring-amber-400/50 hover:ring-2 hover:ring-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]';
    } else if (isIllustrationRare) {
      borderClasses =
        'ring-1 ring-cyan-400/40 hover:ring-2 hover:ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]';
    } else if (effectiveVariant === 'stamped') {
      borderClasses =
        'ring-2 ring-emerald-400/50 hover:ring-2 hover:ring-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized position from center (-0.5 to 0.5)
    const normX = x / rect.width - 0.5;
    const normY = y / rect.height - 0.5;

    // Calculate 3D rotations (up to 16 degrees tilt)
    const rotateX = normY * -16;
    const rotateY = normX * 16;

    // Exact percentage coordinates for the holographic shimmer
    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, shineX, shineY, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, shineX: 50, shineY: 50, active: false });
  };

  const rawCategory = card?.category || 'Pokemon';
  const nameToAnalyze = (card?.name || alt || '').toLowerCase();

  let cardCategory = rawCategory;
  if (nameToAnalyze.includes('energia') || nameToAnalyze.includes('energy')) {
    cardCategory = 'Energy';
  } else if (
    nameToAnalyze.includes('bola') ||
    nameToAnalyze.includes('ball') ||
    nameToAnalyze.includes('pesquisa') ||
    nameToAnalyze.includes('research') ||
    nameToAnalyze.includes('ordens') ||
    nameToAnalyze.includes('orders') ||
    nameToAnalyze.includes('chefe') ||
    nameToAnalyze.includes('boss') ||
    nameToAnalyze.includes('item') ||
    nameToAnalyze.includes('treinador') ||
    nameToAnalyze.includes('trainer')
  ) {
    cardCategory = 'Trainer';
  }

  const cardTypes = card?.types || [];
  const primaryType = cardTypes[0] || 'Colorless';

  const getTypeStyling = () => {
    if (cardCategory === 'Trainer') {
      return {
        bgGradient: 'from-slate-800 via-slate-850 to-teal-950',
        borderColor: 'border-cyan-600/55',
        textColor: 'text-cyan-200',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        typeSymbol: 'T',
        cardBgHex: '#0f2b38',
      };
    }
    if (cardCategory === 'Energy') {
      return {
        bgGradient: 'from-amber-950 via-slate-900 to-slate-950',
        borderColor: 'border-amber-600/55',
        textColor: 'text-amber-200',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        typeSymbol: 'E',
        cardBgHex: '#2e1808',
      };
    }

    switch (primaryType.toLowerCase()) {
      case 'grass':
      case 'planta':
        return {
          bgGradient: 'from-emerald-950 via-slate-900 to-emerald-900/60',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-300',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          typeSymbol: '🌿',
          cardBgHex: '#064e3b',
        };
      case 'fire':
      case 'fogo':
        return {
          bgGradient: 'from-red-950 via-slate-900 to-orange-950/60',
          borderColor: 'border-red-500/40',
          textColor: 'text-red-300',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
          typeSymbol: '🔥',
          cardBgHex: '#7f1d1d',
        };
      case 'water':
      case 'água':
      case 'agua':
        return {
          bgGradient: 'from-blue-950 via-slate-900 to-cyan-950/60',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-300',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          typeSymbol: '💧',
          cardBgHex: '#1e3a8a',
        };
      case 'lightning':
      case 'elétrico':
      case 'eletrico':
        return {
          bgGradient: 'from-amber-950 via-slate-900 to-yellow-950/60',
          borderColor: 'border-yellow-500/40',
          textColor: 'text-yellow-300',
          badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          typeSymbol: '⚡',
          cardBgHex: '#713f12',
        };
      case 'psychic':
      case 'psíquico':
      case 'psiquico':
        return {
          bgGradient: 'from-purple-950 via-slate-900 to-pink-950/60',
          borderColor: 'border-purple-500/40',
          textColor: 'text-purple-300',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          typeSymbol: '👁️',
          cardBgHex: '#581c87',
        };
      case 'fighting':
      case 'lutador':
      case 'luta':
        return {
          bgGradient: 'from-amber-950 via-slate-900 to-stone-900',
          borderColor: 'border-amber-700/50',
          textColor: 'text-amber-400',
          badgeBg: 'bg-amber-700/20 text-amber-300 border-amber-600/30',
          typeSymbol: '👊',
          cardBgHex: '#451a03',
        };
      case 'darkness':
      case 'noturno':
      case 'escuridão':
        return {
          bgGradient: 'from-slate-950 via-slate-900 to-neutral-950',
          borderColor: 'border-slate-700/50',
          textColor: 'text-slate-300',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          typeSymbol: '🌙',
          cardBgHex: '#18181b',
        };
      case 'metal':
      case 'metálico':
      case 'metalico':
        return {
          bgGradient: 'from-zinc-900 via-slate-900 to-slate-950',
          borderColor: 'border-zinc-400/40',
          textColor: 'text-zinc-300',
          badgeBg: 'bg-zinc-700/30 text-zinc-200 border-zinc-500/30',
          typeSymbol: '⚙️',
          cardBgHex: '#27272a',
        };
      case 'dragon':
      case 'dragão':
      case 'dragao':
        return {
          bgGradient: 'from-yellow-950 via-slate-900 to-emerald-950',
          borderColor: 'border-yellow-600/50',
          textColor: 'text-yellow-300',
          badgeBg: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
          typeSymbol: '🐉',
          cardBgHex: '#422006',
        };
      default:
        return {
          bgGradient: 'from-slate-900 via-slate-850 to-slate-950',
          borderColor: 'border-slate-700/50',
          textColor: 'text-slate-200',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          typeSymbol: '⚪',
          cardBgHex: '#1e293b',
        };
    }
  };

  const style = getTypeStyling();

  // Fallback programmatic card rendering if image fails
  if (hasError || !src) {
    return (
      <div
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative aspect-[3/4] w-full rounded-2xl p-3 flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-b ${style.bgGradient} border-2 ${style.borderColor} ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
        style={{
          transform: tilt.active
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.03, 1.03, 1.03)`
            : `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
          transition: tilt.active ? 'transform 0.05s ease-out' : 'transform 0.4s ease-out',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Header Row */}
        <div className="flex justify-between items-start gap-1 z-10">
          <div className="flex-1 min-w-0">
            <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider block">
              {card?.stage || (cardCategory === 'Pokemon' ? 'Básico' : cardCategory)}
            </span>
            <h4 className="text-xs font-black text-white truncate drop-shadow-sm">
              {card?.name || alt}
            </h4>
          </div>
          {card?.hp && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[7.5px] font-black text-slate-400 font-mono">HP</span>
              <span className="text-xs font-black text-red-400 font-mono">{card.hp}</span>
              <span className="text-xs leading-none">{style.typeSymbol}</span>
            </div>
          )}
        </div>

        {/* Center Artwork Box */}
        <div className="relative flex-1 my-1.5 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-700/60 flex items-center justify-center text-xl shadow-inner mb-1">
            {style.typeSymbol}
          </div>
          <span className="text-[8.5px] font-black text-white/90 drop-shadow line-clamp-1">
            {card?.name || alt}
          </span>
          <span className="text-[7px] text-slate-400 uppercase font-mono mt-0.5">
            {card?.rarity || 'Comum'}
          </span>
        </div>

        {/* Attacks */}
        <div className="space-y-1 z-10">
          {card?.attacks && card.attacks.length > 0 ? (
            card.attacks.slice(0, 2).map((atk, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 rounded-lg p-1 border border-white/5 flex flex-col"
              >
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="font-bold text-slate-200 truncate">{atk.name}</span>
                  {atk.damage && (
                    <span className="font-mono font-black text-red-400 shrink-0">{atk.damage}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-1 text-[7px] text-slate-400">
              {card?.setName || 'Pokémon TCG'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-1 flex justify-between items-center text-[7px] font-mono text-slate-400">
          <span>{card?.setName || 'Set'}</span>
          <span>
            {card?.localId || '?'}/{card?.setTotalCards || '?'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group overflow-hidden rounded-2xl bg-slate-950 transition-all ${borderClasses} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        transform: tilt.active
          ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.04, 1.04, 1.04)`
          : `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
        transition: tilt.active ? 'transform 0.05s ease-out' : 'transform 0.4s ease-out',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Skeleton Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-3 overflow-hidden rounded-2xl select-none z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer pointer-events-none" />
          <div className="flex justify-between items-center">
            <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-4 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="w-full flex-1 my-2 bg-slate-900 rounded-lg animate-pulse flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-slate-700 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-2 w-3/4 bg-slate-850 rounded animate-pulse" />
          </div>
        </div>
      )}

      {/* Main Card Image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-contain rounded-2xl transition-all duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${effectiveVariant === 'reverse' ? 'contrast-[1.06] saturate-[1.12]' : ''}`}
      />

      {/* ========================================================================= */}
      {/* 1. HOLO FOIL (Prismatic Sheen & Rainbow Specular Light)                   */}
      {/* ========================================================================= */}
      {effectiveVariant === 'holo' && !isLoading && (
        <>
          {/* Prismatic Rainbow Angle Sweep */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-85 transition-opacity duration-300 mix-blend-color-dodge z-10"
            style={{
              background: `linear-gradient(${
                tilt.rotateX * 3 + tilt.rotateY * 2 + 135
              }deg, rgba(255,0,128,0.4) 0%, rgba(121,40,202,0.45) 25%, rgba(0,223,216,0.5) 50%, rgba(255,77,77,0.45) 75%, rgba(245,166,35,0.4) 100%)`,
            }}
          />
          {/* Dynamic Specular Hotspot Highlight */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-90 transition-opacity duration-300 mix-blend-screen z-10"
            style={{
              background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255, 255, 255, 0.75) 0%, rgba(168, 85, 247, 0.35) 30%, rgba(59, 130, 246, 0.2) 60%, transparent 80%)`,
            }}
          />
          {/* Glitter / Sparkle Particles Sheen */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-70 transition-opacity duration-500 mix-blend-overlay z-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"
          />
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. REVERSE HOLO (Full Metallic Card Body Sheen with Etched Grooves)      */}
      {/* ========================================================================= */}
      {effectiveVariant === 'reverse' && !isLoading && (
        <>
          {/* Metallic Mirror Sheen covering card borders & text box */}
          <div
            className="absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-90 transition-opacity duration-300 mix-blend-color-dodge z-10"
            style={{
              background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255, 240, 250, 0.8) 0%, rgba(236, 72, 153, 0.5) 35%, rgba(56, 189, 248, 0.45) 65%, rgba(168, 85, 247, 0.3) 100%)`,
            }}
          />
          {/* Characteristic Etched Holographic Groove Lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25 group-hover:opacity-50 transition-opacity duration-300 mix-blend-overlay z-10"
            style={{
              backgroundImage: `repeating-linear-gradient(${
                tilt.rotateY * 2 + 45
              }deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 2px, transparent 2px, transparent 6px)`,
            }}
          />
          {/* Metallic Chrome Refraction Band */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 group-hover:opacity-75 transition-opacity duration-300 mix-blend-hard-light z-10"
            style={{
              background: `linear-gradient(${
                tilt.rotateX * 4 + 60
              }deg, transparent 20%, rgba(255,255,255,0.45) 45%, rgba(236,72,153,0.3) 55%, transparent 80%)`,
            }}
          />
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. COSMOS HOLO (Galaxy Swirls & Twinkling Celestial Nebula)              */}
      {/* ========================================================================= */}
      {effectiveVariant === 'cosmosHolo' && !isLoading && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-45 group-hover:opacity-85 transition-opacity duration-300 mix-blend-color-dodge z-10"
            style={{
              background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255, 255, 255, 0.8) 0%, rgba(147, 51, 234, 0.5) 35%, rgba(14, 165, 233, 0.4) 65%, transparent 85%)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-35 group-hover:opacity-80 transition-opacity duration-400 mix-blend-screen z-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.9) 1.5px, transparent 3px), radial-gradient(circle at 75% 40%, rgba(255,255,255,0.8) 2px, transparent 4px), radial-gradient(circle at 45% 70%, rgba(255,255,255,0.9) 1.5px, transparent 3px), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.85) 2px, transparent 4px)`,
              backgroundSize: '80px 80px',
            }}
          />
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. PROMO / STAMPED / ULTRA RARE FOIL                                     */}
      {/* ========================================================================= */}
      {(effectiveVariant === 'promo' || isSecretRare || effectiveVariant === 'stamped') &&
        !isLoading && (
          <div
            className="absolute inset-0 pointer-events-none opacity-35 group-hover:opacity-80 transition-opacity duration-300 mix-blend-color-dodge z-10"
            style={{
              background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255, 250, 205, 0.8) 0%, rgba(245, 158, 11, 0.5) 40%, rgba(217, 119, 6, 0.3) 70%, transparent 90%)`,
            }}
          />
        )}

      {/* ========================================================================= */}
      {/* 5. NORMAL MATTE SHEEN (Subtle Soft Natural Light Reflection)             */}
      {/* ========================================================================= */}
      {effectiveVariant === 'normal' && !isFoil && !isLoading && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-300 mix-blend-soft-light z-10"
          style={{
            background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255, 255, 255, 0.6) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Variant Overlay Badge Indicator on Card (Optional or on demand) */}
      {showVariantBadge && !isLoading && (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          {effectiveVariant === 'reverse' && (
            <span className="bg-pink-950/85 text-pink-300 border border-pink-500/50 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1 animate-pulse">
              <Sparkles className="w-2.5 h-2.5 text-pink-400" />
              Reverse Holo
            </span>
          )}
          {effectiveVariant === 'holo' && (
            <span className="bg-purple-950/85 text-purple-200 border border-purple-500/50 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1 animate-pulse">
              <Star className="w-2.5 h-2.5 text-cyan-400" />
              Holo Foil
            </span>
          )}
          {effectiveVariant === 'cosmosHolo' && (
            <span className="bg-indigo-950/85 text-cyan-200 border border-cyan-500/50 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1">
              🌌 Cosmos
            </span>
          )}
          {effectiveVariant === 'promo' && (
            <span className="bg-amber-950/85 text-amber-200 border border-amber-500/50 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1">
              ⭐ Promo
            </span>
          )}
          {effectiveVariant === 'stamped' && (
            <span className="bg-emerald-950/85 text-emerald-200 border border-emerald-500/50 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1">
              🎖️ Stamped
            </span>
          )}
        </div>
      )}

      {/* Zoom Icon Hint */}
      {showZoomHint && !isLoading && (
        <div className="absolute bottom-2 right-2 bg-slate-950/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-slate-700 z-20">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
      )}
    </div>
  );
};
