'use client';

import React, { useEffect, useRef } from 'react';
import { useWeather, TimeOfDay, UpdateStep } from '@/hooks/useWeather';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  vx?: number;
  w?: number;
  h?: number;
}

const SCENE_SKY: Record<TimeOfDay, string> = {
  dawn: 'linear-gradient(180deg, #6f8fb4 0%, #8db2cf 24%, #b8d0da 55%, #cedfd9 100%)',
  day: 'linear-gradient(180deg, #496d95 0%, #7fa5c6 28%, #a9c6db 62%, #d7e6e3 100%)',
  dusk: 'linear-gradient(180deg, #495f82 0%, #7f86a5 25%, #be9d9c 58%, #d9c2b7 100%)',
  night: 'linear-gradient(180deg, #0d1930 0%, #1e3556 32%, #32506f 68%, #425964 100%)',
};

const SCENE_LIGHT: Record<TimeOfDay, string> = {
  dawn: 'radial-gradient(circle at 16% 18%, rgba(255,210,170,0.42) 0%, rgba(255,210,170,0.10) 22%, transparent 52%)',
  day: 'radial-gradient(circle at 18% 14%, rgba(255,244,216,0.32) 0%, rgba(255,244,216,0.08) 20%, transparent 48%)',
  dusk: 'radial-gradient(circle at 20% 20%, rgba(255,190,150,0.26) 0%, rgba(255,190,150,0.08) 24%, transparent 56%)',
  night: 'radial-gradient(circle at 78% 16%, rgba(214,226,255,0.16) 0%, rgba(214,226,255,0.04) 16%, transparent 44%)',
};

const WATER_TONE: Record<TimeOfDay, string> = {
  dawn: 'linear-gradient(180deg, rgba(117,168,186,0.88) 0%, rgba(83,132,147,0.95) 100%)',
  day: 'linear-gradient(180deg, rgba(112,180,210,0.92) 0%, rgba(76,129,152,0.96) 100%)',
  dusk: 'linear-gradient(180deg, rgba(138,146,172,0.90) 0%, rgba(82,96,119,0.96) 100%)',
  night: 'linear-gradient(180deg, rgba(49,78,112,0.94) 0%, rgba(28,48,72,0.98) 100%)',
};

const FOREGROUND_TONE: Record<TimeOfDay, string> = {
  dawn: 'linear-gradient(180deg, #59785e 0%, #4a6550 100%)',
  day: 'linear-gradient(180deg, #62865d 0%, #4b6d47 100%)',
  dusk: 'linear-gradient(180deg, #5e7257 0%, #485647 100%)',
  night: 'linear-gradient(180deg, #374e43 0%, #25362f 100%)',
};

const MIST_OPACITY: Record<TimeOfDay, number> = {
  dawn: 0.48,
  day: 0.26,
  dusk: 0.32,
  night: 0.22,
};

const ScenicBackdrop: React.FC<{ timeOfDay: TimeOfDay; type: string }> = ({ timeOfDay, type }) => {
  const sceneProfile = (() => {
    switch (type) {
      case 'CLEAR':
        return {
          fogBoost: 0,
          sceneDim: 'transparent',
          waterOpacity: 0.94,
          waterTone: WATER_TONE[timeOfDay],
          foregroundTone: FOREGROUND_TONE[timeOfDay],
          horizonOpacity: 0.72,
          nearMountainOpacity: 0.88,
          cloudBandOpacity: 0.06,
          reflectionOpacity: timeOfDay === 'night' ? 0.22 : 0.68,
          grassHighlight: 'rgba(255,255,255,0.08)',
          figureOpacity: timeOfDay === 'night' ? 0.48 : 0.66,
          stormLayer: null,
        };
      case 'CLOUDY':
        return {
          fogBoost: 0.18,
          sceneDim: 'rgba(40, 56, 68, 0.08)',
          waterOpacity: 0.88,
          waterTone: 'linear-gradient(180deg, rgba(111,140,158,0.88) 0%, rgba(75,101,116,0.96) 100%)',
          foregroundTone: 'linear-gradient(180deg, #597065 0%, #46584f 100%)',
          horizonOpacity: 0.98,
          nearMountainOpacity: 0.9,
          cloudBandOpacity: 0.18,
          reflectionOpacity: 0.28,
          grassHighlight: 'rgba(255,255,255,0.04)',
          figureOpacity: timeOfDay === 'night' ? 0.44 : 0.6,
          stormLayer: null,
        };
      case 'RAIN':
        return {
          fogBoost: 0.14,
          sceneDim: 'rgba(16, 26, 40, 0.24)',
          waterOpacity: 0.98,
          waterTone: 'linear-gradient(180deg, rgba(84,108,125,0.96) 0%, rgba(56,76,92,0.99) 100%)',
          foregroundTone: 'linear-gradient(180deg, #4d6156 0%, #384840 100%)',
          horizonOpacity: 0.9,
          nearMountainOpacity: 0.86,
          cloudBandOpacity: 0.26,
          reflectionOpacity: 0.18,
          grassHighlight: 'rgba(180,210,220,0.04)',
          figureOpacity: timeOfDay === 'night' ? 0.42 : 0.54,
          stormLayer: 'linear-gradient(180deg, rgba(58,72,88,0.58) 0%, rgba(58,72,88,0.18) 32%, transparent 62%)',
        };
      case 'SNOW':
        return {
          fogBoost: 0.1,
          sceneDim: 'rgba(220, 234, 244, 0.10)',
          waterOpacity: 0.82,
          waterTone: 'linear-gradient(180deg, rgba(164,194,210,0.84) 0%, rgba(104,138,154,0.95) 100%)',
          foregroundTone: 'linear-gradient(180deg, #d8e1de 0%, #b5c3c1 100%)',
          horizonOpacity: 0.74,
          nearMountainOpacity: 0.72,
          cloudBandOpacity: 0.12,
          reflectionOpacity: 0.38,
          grassHighlight: 'rgba(255,255,255,0.18)',
          figureOpacity: timeOfDay === 'night' ? 0.36 : 0.48,
          stormLayer: null,
        };
      case 'THUNDER':
        return {
          fogBoost: 0.12,
          sceneDim: 'rgba(10, 16, 26, 0.34)',
          waterOpacity: 0.96,
          waterTone: 'linear-gradient(180deg, rgba(69,88,108,0.95) 0%, rgba(39,54,71,0.99) 100%)',
          foregroundTone: 'linear-gradient(180deg, #435147 0%, #2c3831 100%)',
          horizonOpacity: 0.82,
          nearMountainOpacity: 0.82,
          cloudBandOpacity: 0.32,
          reflectionOpacity: 0.14,
          grassHighlight: 'rgba(160,170,190,0.03)',
          figureOpacity: 0.4,
          stormLayer: 'linear-gradient(180deg, rgba(40,49,64,0.72) 0%, rgba(40,49,64,0.28) 36%, transparent 68%)',
        };
      default:
        return {
          fogBoost: 0,
          sceneDim: 'transparent',
          waterOpacity: 0.92,
          waterTone: WATER_TONE[timeOfDay],
          foregroundTone: FOREGROUND_TONE[timeOfDay],
          horizonOpacity: 0.9,
          nearMountainOpacity: 0.94,
          cloudBandOpacity: 0.08,
          reflectionOpacity: timeOfDay === 'night' ? 0.25 : 0.55,
          grassHighlight: 'rgba(255,255,255,0.06)',
          figureOpacity: timeOfDay === 'night' ? 0.5 : 0.65,
          stormLayer: null,
        };
    }
  })();

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          background: SCENE_SKY[timeOfDay],
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: SCENE_LIGHT[timeOfDay], mixBlendMode: 'screen', opacity: 0.95 }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 28%, transparent 55%)',
          }}
        />
        {sceneProfile.stormLayer && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: sceneProfile.stormLayer,
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            left: '-8%',
            right: '-8%',
            top: '36%',
            height: '22%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(240,246,248,0.65) 0%, rgba(240,246,248,0.18) 34%, transparent 72%)',
            filter: 'blur(22px)',
            opacity: MIST_OPACITY[timeOfDay] + sceneProfile.fogBoost,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-8%',
            right: '-8%',
            top: '18%',
            height: '16%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(208,218,228,0.55) 0%, rgba(208,218,228,0.12) 36%, transparent 76%)',
            filter: 'blur(30px)',
            opacity: sceneProfile.cloudBandOpacity,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '-5%',
            right: '-5%',
            bottom: '34%',
            height: '17%',
            background: sceneProfile.waterTone,
            borderTopLeftRadius: '40% 100%',
            borderTopRightRadius: '36% 100%',
            filter: 'blur(2px)',
            opacity: sceneProfile.waterOpacity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '6%',
            right: '8%',
            bottom: '41%',
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 18%, rgba(255,255,255,0.12) 62%, transparent 100%)',
            filter: 'blur(1px)',
            opacity: sceneProfile.reflectionOpacity,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 'auto -10% 28% -10%',
            height: '16%',
            background: timeOfDay === 'night'
              ? 'linear-gradient(180deg, rgba(52,76,93,0.70) 0%, rgba(41,58,70,0.95) 100%)'
              : 'linear-gradient(180deg, rgba(95,128,132,0.55) 0%, rgba(73,103,108,0.88) 100%)',
            clipPath: 'polygon(0 90%, 7% 68%, 13% 76%, 23% 48%, 33% 72%, 44% 42%, 57% 70%, 69% 44%, 77% 58%, 88% 38%, 100% 70%, 100% 100%, 0 100%)',
            filter: 'blur(2px)',
            opacity: sceneProfile.horizonOpacity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 'auto -14% 18% -12%',
            height: '18%',
            background: timeOfDay === 'night'
              ? 'linear-gradient(180deg, rgba(34,53,63,0.72) 0%, rgba(22,35,44,0.96) 100%)'
              : 'linear-gradient(180deg, rgba(62,96,94,0.64) 0%, rgba(49,78,76,0.98) 100%)',
            clipPath: 'polygon(0 100%, 0 76%, 11% 70%, 21% 46%, 30% 56%, 44% 30%, 54% 54%, 68% 34%, 80% 56%, 91% 44%, 100% 58%, 100% 100%)',
            filter: 'blur(1px)',
            opacity: sceneProfile.nearMountainOpacity,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 'auto -6% 12% -6%',
            height: '12%',
            background: sceneProfile.foregroundTone,
            borderTopLeftRadius: '44% 100%',
            borderTopRightRadius: '56% 100%',
            boxShadow: '0 -12px 40px rgba(40,64,40,0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-5%',
            right: '-4%',
            bottom: '7%',
            height: '17%',
            background: `linear-gradient(180deg, ${sceneProfile.grassHighlight} 0%, ${sceneProfile.foregroundTone})`,
            clipPath: 'polygon(0 100%, 0 46%, 9% 48%, 18% 38%, 27% 52%, 36% 44%, 48% 55%, 62% 40%, 74% 58%, 86% 46%, 100% 53%, 100% 100%)',
            opacity: 0.98,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '9%',
            right: '9%',
            bottom: '18%',
            height: '9%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            borderRadius: '50%',
            filter: 'blur(16px)',
            opacity: 0.4 + sceneProfile.fogBoost * 0.8,
            animation: 'mist-drift 14s ease-in-out infinite',
          }}
        />

        <OriginalAnimeInspiredFigure opacity={sceneProfile.figureOpacity} />

        {timeOfDay === 'night' && (
          <>
            <div
              style={{
                position: 'absolute',
                right: '12%',
                top: '11%',
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(225,235,255,0.24) 0%, rgba(225,235,255,0.08) 38%, transparent 72%)',
                filter: 'blur(4px)',
                opacity: 0.7,
              }}
            />
            {[
              { left: '18%', top: '14%', size: 2.2, opacity: 0.48 },
              { left: '27%', top: '11%', size: 1.8, opacity: 0.38 },
              { left: '73%', top: '20%', size: 2.4, opacity: 0.42 },
              { left: '79%', top: '13%', size: 1.6, opacity: 0.34 },
              { left: '63%', top: '9%', size: 1.8, opacity: 0.28 },
            ].map((star, index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: star.left,
                  top: star.top,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  borderRadius: '50%',
                  background: `rgba(255,255,255,${star.opacity})`,
                  boxShadow: '0 0 8px rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </>
        )}

        <div style={{ position: 'absolute', inset: 0, background: sceneProfile.sceneDim }} />
      </div>

      <style>{`
        @keyframes mist-drift {
          0%, 100% { transform: translateX(-2%) scaleX(1); opacity: 0.32; }
          50% { transform: translateX(3%) scaleX(1.04); opacity: 0.5; }
        }
        @keyframes figure-sway {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(0, -4px, 0) rotate(1.2deg); }
        }
        @keyframes coat-wave {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          50% { transform: rotate(2.2deg) translateX(1px); }
        }
        @keyframes coat-tail {
          0%, 100% { transform: rotate(0deg) translateX(0) translateY(0); }
          50% { transform: rotate(4deg) translateX(2px) translateY(-1px); }
        }
        @keyframes hair-drift {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          50% { transform: rotate(3deg) translateX(1.5px); }
        }
        @keyframes strap-shift {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(1px) rotate(1deg); }
        }
      `}</style>
    </>
  );
};

const OriginalAnimeInspiredFigure: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        right: '16%',
        bottom: '14%',
        width: '118px',
        height: '286px',
        opacity,
        transform: 'translateZ(0)',
        filter: 'drop-shadow(0 20px 28px rgba(18, 20, 38, 0.18))',
        animation: 'figure-sway 9s ease-in-out infinite',
        transformOrigin: '50% 100%',
      }}
    >
      <svg
        viewBox="0 0 118 286"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="coatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(142,136,220,0.98)" />
            <stop offset="48%" stopColor="rgba(117,111,198,0.95)" />
            <stop offset="100%" stopColor="rgba(82,78,154,0.92)" />
          </linearGradient>
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(241,241,244,0.98)" />
            <stop offset="100%" stopColor="rgba(211,210,219,0.96)" />
          </linearGradient>
          <linearGradient id="legGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(208,199,197,0.98)" />
            <stop offset="100%" stopColor="rgba(177,170,172,0.95)" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,70,78,0.98)" />
            <stop offset="100%" stopColor="rgba(46,45,54,0.96)" />
          </linearGradient>
          <linearGradient id="bagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(52,68,95,0.98)" />
            <stop offset="100%" stopColor="rgba(31,43,65,0.95)" />
          </linearGradient>
        </defs>

        <ellipse cx="58" cy="272" rx="24" ry="7" fill="rgba(18,24,34,0.16)" />

        <path
          d="M66 42 C78 48, 84 58, 87 74 C88 82, 86 90, 84 100 L82 118 C81 132, 86 154, 94 176 C100 194, 103 211, 102 236 C88 221, 73 200, 63 183 C56 170, 53 153, 51 139 L49 94 C48 71, 54 53, 66 42 Z"
          fill="url(#coatGrad)"
          opacity="0.94"
          style={{
            transformOrigin: '70% 30%',
            transformBox: 'fill-box',
            animation: 'coat-wave 6.8s ease-in-out infinite',
          }}
        />
        <path
          d="M58 63 C52 66, 47 72, 45 82 C43 95, 44 114, 44 129 C44 155, 46 183, 45 208 C45 224, 43 244, 39 263 L51 263 C55 242, 58 224, 59 206 L61 156 L65 263 L77 263 C77 240, 76 217, 78 194 C80 172, 83 151, 84 130 C85 111, 83 92, 79 78 C75 66, 68 60, 58 63 Z"
          fill="url(#legGrad)"
        />
        <path
          d="M47 262 L57 262 C58 268, 56 272, 49 273 C45 273, 44 269, 47 262 Z"
          fill="rgba(53,57,73,0.96)"
        />
        <path
          d="M73 262 L84 262 C86 268, 83 272, 76 273 C71 273, 70 269, 73 262 Z"
          fill="rgba(53,57,73,0.96)"
        />

        <path
          d="M58 52 C50 53, 44 59, 42 69 C39 82, 40 98, 42 112 C44 125, 49 138, 57 141 C67 143, 78 138, 83 126 C88 115, 90 93, 88 77 C86 61, 75 51, 58 52 Z"
          fill="url(#shirtGrad)"
        />
        <path
          d="M56 47 C61 45, 69 46, 73 52 C76 57, 75 67, 69 71 C64 74, 56 73, 52 68 C47 62, 49 50, 56 47 Z"
          fill="rgba(230,213,204,0.98)"
        />
        <path
          d="M50 48 C52 36, 62 30, 72 31 C80 32, 88 39, 89 48 C89 57, 84 63, 77 67 C72 70, 66 69, 60 68 C55 66, 49 60, 50 48 Z"
          fill="url(#hairGrad)"
        />
        <path
          d="M71 34 C83 43, 88 54, 88 69 C86 82, 78 92, 68 99 C78 92, 87 85, 95 86 C96 73, 93 56, 86 43 C81 35, 76 31, 71 34 Z"
          fill="rgba(56,53,65,0.92)"
          style={{
            transformOrigin: '60% 12%',
            transformBox: 'fill-box',
            animation: 'hair-drift 5.8s ease-in-out infinite',
          }}
        />

        <path
          d="M41 78 C35 87, 34 94, 35 108 C36 118, 38 129, 41 136"
          stroke="rgba(217,209,208,0.96)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M81 82 C88 90, 94 97, 98 108"
          stroke="rgba(220,211,209,0.96)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M96 107 C101 108, 106 112, 107 118 C108 123, 104 127, 99 126 C94 125, 92 118, 96 107 Z"
          fill="rgba(230,213,204,0.98)"
        />

        <path
          d="M41 97 C47 93, 56 92, 66 95 C73 98, 78 103, 79 109 C80 116, 76 121, 69 123 C58 126, 46 125, 40 117 C36 111, 36 102, 41 97 Z"
          fill="url(#coatGrad)"
          opacity="0.92"
        />
        <path
          d="M72 99 C83 103, 94 108, 102 118 C108 126, 111 138, 109 151 C102 146, 97 141, 90 137 C81 132, 73 128, 67 122 C62 116, 64 104, 72 99 Z"
          fill="url(#coatGrad)"
          opacity="0.9"
          style={{
            transformOrigin: '75% 30%',
            transformBox: 'fill-box',
            animation: 'coat-tail 7.4s ease-in-out infinite',
          }}
        />

        <path
          d="M84 108 C88 103, 95 101, 103 104 C108 106, 112 111, 113 117 C113 129, 103 136, 92 133 C84 131, 80 123, 84 108 Z"
          fill="url(#bagGrad)"
          opacity="0.92"
        />
        <path
          d="M76 78 C84 83, 91 93, 96 106"
          stroke="rgba(70,79,110,0.78)"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
          style={{
            transformOrigin: '80% 20%',
            transformBox: 'fill-box',
            animation: 'strap-shift 7s ease-in-out infinite',
          }}
        />

        <path
          d="M51 52 C55 59, 57 66, 57 74"
          stroke="rgba(255,255,255,0.26)"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M69 95 C72 121, 75 144, 83 167"
          stroke="rgba(255,255,255,0.20)"
          strokeWidth="1.2"
          fill="none"
          style={{
            transformOrigin: '70% 40%',
            transformBox: 'fill-box',
            animation: 'coat-wave 6.8s ease-in-out infinite',
          }}
        />
      </svg>
    </div>
  );
};

/* ─── Main WeatherBackground ─── */
export const WeatherBackground: React.FC = () => {
  const { type, timeOfDay, sunrise, sunset, maxTemp, minTemp, locationName, updateStep, refresh } = useWeather();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frameId  = useRef<number>(0);

  // Solar and Lunar Date
  const [dates] = React.useState(() => {
    const now = new Date();
    // Use en-US for English formatting
    const solarStr = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(now);

    const lunarStr = new Intl.DateTimeFormat('en-US-u-ca-chinese', {
      month: 'numeric',
      day: 'numeric'
    }).format(now);

    return { solar: solarStr, lunar: `Lunar ${lunarStr}` };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles.current = [];
      if (type === 'RAIN' || type === 'THUNDER') {
        for (let i = 0; i < 110; i++) {
          particles.current.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            speed: Math.random() * 6 + 7, size: Math.random() * 1.5 + 1,
            opacity: Math.random() * 0.4 + 0.2,
          });
        }
      } else if (type === 'SNOW') {
        for (let i = 0; i < 80; i++) {
          particles.current.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            speed: Math.random() * 1.2 + 0.4, size: Math.random() * 3 + 2,
            opacity: Math.random() * 0.5 + 0.3,
            vx: (Math.random() - 0.5) * 0.8,
          });
        }
      } else if (type === 'CLOUDY') {
        for (let i = 0; i < 6; i++) {
          particles.current.push({
            x: Math.random() * canvas.width, y: 30 + Math.random() * 120,
            speed: Math.random() * 0.18 + 0.06, size: 0,
            opacity: Math.random() * 0.18 + 0.12,
            w: 180 + Math.random() * 160, h: 55 + Math.random() * 45,
            vx: Math.random() > 0.5 ? 1 : -1,
          });
        }
      }
    };

    const drawCloud = (p: Particle) => {
      if (!p.w || !p.h) return;
      const grd = ctx.createRadialGradient(p.x, p.y, p.h * 0.1, p.x, p.y, p.w * 0.5);
      grd.addColorStop(0, `rgba(200,210,220,${p.opacity})`);
      grd.addColorStop(1, `rgba(200,210,220,0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.w * 0.5, p.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (type === 'RAIN' || type === 'THUNDER') {
        ctx.strokeStyle = 'rgba(174,194,224,0.45)';
        ctx.lineWidth = 1;
        particles.current.forEach(p => {
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1, p.y + p.size * 6);
          ctx.stroke();
          p.y += p.speed;
          if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
        });
        ctx.globalAlpha = 1;
      } else if (type === 'SNOW') {
        ctx.fillStyle = 'white';
        particles.current.forEach(p => {
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speed;
          p.x += (p.vx || 0);
          if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
          if (p.x > canvas.width) p.x = 0;
          if (p.x < 0) p.x = canvas.width;
        });
        ctx.globalAlpha = 1;
      } else if (type === 'CLOUDY') {
        particles.current.forEach(p => {
          drawCloud(p);
          p.x += (p.vx || 1) * p.speed;
          if (p.x - (p.w || 0) / 2 > canvas.width) p.x = -(p.w || 0) / 2;
          if (p.x + (p.w || 0) / 2 < 0) p.x = canvas.width + (p.w || 0) / 2;
        });
      }
      frameId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId.current);
    };
  }, [type]);

  // if (type === 'LOADING') return null; // Removed to allow progress visualization

  const badgeBg  = timeOfDay === 'night' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const badgeClr = timeOfDay === 'night' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.55)';

  return (
    <>
      <ScenicBackdrop timeOfDay={timeOfDay} type={type} />

      {/* Particle canvas */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
        <canvas id="weather-background" ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        {type === 'THUNDER' && <ThunderOverlay />}
      </div>

      {/* Weather and Date Information Widgets - Positioning Refined to avoid moon/sun overlap */}
      <div style={{
        position: 'fixed', top: '210px', right: '12px',
        zIndex: 20, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: '6px', pointerEvents: 'none',
      }}>
        {/* Location Badge */}
        {locationName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px',
            color: badgeClr, background: 'rgba(0,0,0,0.08)', borderRadius: '8px',
            padding: '3px 10px', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `0.5px solid ${timeOfDay === 'night' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            textTransform: 'uppercase'
          }}>
            📍 {locationName}
          </div>
        )}

        {/* Date Badge */}
        {dates.solar && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
            color: badgeClr, background: badgeBg, borderRadius: '10px',
            padding: '5px 10px', backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: `0.5px solid ${timeOfDay === 'night' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
          }}>
            <div>{dates.solar}</div>
            <div style={{ opacity: 0.8, fontSize: '10px' }}>{dates.lunar}</div>
          </div>
        )}

        {/* Temperature Badge */}
        {(maxTemp !== undefined || minTemp !== undefined) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
            color: badgeClr, background: badgeBg, borderRadius: '8px',
            padding: '4px 10px', backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}>
            {maxTemp !== undefined && <span style={{ color: '#ff4d4d' }}>H: {Math.round(maxTemp)}°</span>}
            {minTemp !== undefined && <span style={{ color: '#4da6ff' }}>L: {Math.round(minTemp)}°</span>}
          </div>
        )}

        {/* Sunrise / Sunset Badge */}
        {(sunrise || sunset) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
            color: badgeClr, background: badgeBg, borderRadius: '8px',
            padding: '4px 10px', backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}>
            {sunrise && <span>🌅 {sunrise}</span>}
            {sunset && <span>🌇 {sunset}</span>}
          </div>
        )}
      </div>

      {/* Weather Update Progress Visualization */}
      <WeatherUpdateProgress step={updateStep} timeOfDay={timeOfDay} onRetry={refresh} />
    </>
  );
};

/* ─── Thunder flash overlay ─── */
const ThunderOverlay: React.FC = () => {
  const [active, setActive] = React.useState(false);
  useEffect(() => {
    const flash = () => {
      if (Math.random() > 0.98) {
        setActive(true);
        setTimeout(() => setActive(false), 60 + Math.random() * 120);
      }
      requestAnimationFrame(flash);
    };
    const id = requestAnimationFrame(flash);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: 'rgba(255,255,255,0.28)',
      opacity: active ? 1 : 0, transition: 'opacity 60ms',
      pointerEvents: 'none',
    }} />
  );
};

/* ─── Weather Update Progress Visualization ─── */
const WeatherUpdateProgress: React.FC<{ 
  step: UpdateStep; 
  timeOfDay: TimeOfDay;
  onRetry: () => void;
}> = ({ step, timeOfDay, onRetry }) => {
  if (step === 'COMPLETED' || step === 'IDLE') return null;

  const labels: Record<UpdateStep, string> = {
    IDLE: '',
    GEOLOCATING: 'Locating...',
    FETCHING_WEATHER: 'Fetching Weather...',
    FETCHING_LOCATION: 'Detecting City...',
    COMPLETED: 'Done',
    FAILED: 'Update Failed',
    DENIED: 'Location Denied'
  };

  const isNight = timeOfDay === 'night';
  const textColor = isNight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const barColor = isNight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  const progressColor = isNight ? '#fff' : '#4da6ff';

  const isError = step === 'FAILED' || step === 'DENIED';

  // Simple progress % based on step
  const progressMap: Record<UpdateStep, number> = {
    IDLE: 0,
    GEOLOCATING: 20,
    FETCHING_WEATHER: 50,
    FETCHING_LOCATION: 80,
    COMPLETED: 100,
    FAILED: 100,
    DENIED: 100
  };

  return (
    <div 
      onClick={() => isError && onRetry()}
      style={{
        position: 'fixed', bottom: '32px', left: '50%',
        transform: 'translateX(-50%)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        pointerEvents: isError ? 'auto' : 'none', 
        width: '180px',
        cursor: isError ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
      onMouseEnter={(e) => isError && (e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)')}
      onMouseLeave={(e) => isError && (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
    >
      <div style={{
        fontSize: '11px', fontWeight: 900, color: textColor,
        textTransform: 'uppercase', letterSpacing: '1.5px',
        textShadow: isNight ? '0 2px 8px rgba(0,0,0,0.6)' : '0 1px 3px rgba(255,255,255,0.8)',
        animation: 'pulse-text 2s ease-in-out infinite'
      }}>
        {labels[step]} {isError && ' ↻'}
      </div>
      <div style={{
        width: '100%', height: '4px', background: barColor,
        borderRadius: '4px', overflow: 'hidden', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: isNight ? '0 0 15px rgba(255,255,255,0.05)' : '0 0 15px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          width: `${progressMap[step]}%`, height: '100%',
          background: isError ? '#ff4d4d' : `linear-gradient(90deg, ${progressColor}, #fff)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite linear',
          transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: isError ? '0 0 8px rgba(255,77,77,0.4)' : `0 0 10px ${progressColor}`
        }} />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.7; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
