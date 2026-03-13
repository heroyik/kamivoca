'use client';

import React, { useEffect, useRef } from 'react';
import { useWeather, TimeOfDay } from '@/hooks/useWeather';

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

// Time-of-day sky gradient overlays
const TIME_OVERLAYS: Record<TimeOfDay, string> = {
  dawn:  'linear-gradient(to bottom, rgba(255,140,80,0.22), rgba(255,200,140,0.10))',
  day:   'linear-gradient(to bottom, rgba(30,140,255,0.18), rgba(100,195,255,0.10))',
  dusk:  'linear-gradient(to bottom, rgba(200,70,50,0.22), rgba(255,130,60,0.12))',
  night: 'linear-gradient(to bottom, rgba(8,12,48,0.58), rgba(4,8,28,0.44))',
};

const TIME_TINT: Record<TimeOfDay, string> = {
  dawn:  'rgba(255,150,70,0.07)',
  day:   'transparent',
  dusk:  'rgba(200,70,30,0.08)',
  night: 'rgba(4,8,32,0.38)',
};

// Sun position by time-of-day (% from left, % from top)
const SUN_POS: Record<TimeOfDay, { x: string; y: string }> = {
  dawn:  { x: '10%', y: '12%' },  // top-left
  day:   { x: '10%', y: '12%' },  // top-left
  dusk:  { x: '10%', y: '12%' },  // top-left
  night: { x: '10%', y: '12%' },  // hidden (moon shows instead)
};

/* ─── Sun Component ─── */
const Sun: React.FC<{ timeOfDay: TimeOfDay }> = ({ timeOfDay }) => {
  if (timeOfDay === 'night') return null;

  const pos = SUN_POS[timeOfDay];
  const isHorizon = timeOfDay === 'dawn' || timeOfDay === 'dusk';
  const sunColor = isHorizon ? '#ffb347' : '#FFD700';
  const glowColor = isHorizon ? 'rgba(255,140,60,0.35)' : 'rgba(255,220,60,0.30)';
  const size = isHorizon ? 48 : 56;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        pointerEvents: 'none',
        transition: 'left 2s ease, top 2s ease',
      }}
    >
      {/* Outer glow */}
      <div style={{
        position: 'absolute',
        inset: `-${size * 0.7}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        animation: 'sun-pulse 4s ease-in-out infinite',
      }} />
      {/* SVG Sun with rays */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ display: 'block', filter: `drop-shadow(0 0 ${isHorizon ? 14 : 20}px ${sunColor})` }}
      >
        {/* Rays */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) * (Math.PI / 180);
          const r1 = 38, r2 = 48;
          const x1 = 50 + r1 * Math.cos(angle);
          const y1 = 50 + r1 * Math.sin(angle);
          const x2 = 50 + r2 * Math.cos(angle);
          const y2 = 50 + r2 * Math.sin(angle);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={sunColor} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
          );
        })}
        {/* Core circle */}
        <circle cx="50" cy="50" r="28"
          fill={`url(#sunGrad-${timeOfDay})`}
          style={{ filter: 'brightness(1.05)' }}
        />
        <defs>
          <radialGradient id={`sunGrad-${timeOfDay}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor={isHorizon ? '#ffe0a0' : '#fff7aa'} />
            <stop offset="100%" stopColor={sunColor} />
          </radialGradient>
        </defs>
      </svg>
      <style>{`
        @keyframes sun-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
        @keyframes sun-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/* ─── Moon Component ─── */
const Moon: React.FC = () => {
  // Crescent moon — using two overlapping circles (clip technique with SVG)
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        right: '14%',
        top:   '10%',
        zIndex: 2,
        pointerEvents: 'none',
        animation: 'moon-float 6s ease-in-out infinite',
      }}
    >
      {/* Moon glow */}
      <div style={{
        position: 'absolute',
        inset: '-28px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,215,255,0.22) 0%, transparent 70%)',
      }} />
      {/* Stars nearby */}
      {[
        { top: '-18px', left: '52px',  size: '3px', delay: '0s'    },
        { top: '-6px',  left: '70px',  size: '2px', delay: '0.6s'  },
        { top: '30px',  left: '72px',  size: '2.5px', delay: '1.2s' },
        { top: '-22px', left: '20px',  size: '2px', delay: '0.3s'  },
        { top: '10px',  left: '-18px', size: '1.8px', delay: '0.9s' },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: s.top, left: s.left,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: 'rgba(220,230,255,0.9)',
          animation: `star-twinkle 2.5s ease-in-out ${s.delay} infinite`,
        }} />
      ))}
      {/* Crescent SVG */}
      <svg width="58" height="58" viewBox="0 0 100 100"
        style={{ filter: 'drop-shadow(0 0 16px rgba(180,200,255,0.7))' }}
      >
        <defs>
          <radialGradient id="moonGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f0f4ff" />
            <stop offset="100%" stopColor="#c8d8f8" />
          </radialGradient>
          <mask id="crescentMask">
            <rect width="100" height="100" fill="white" />
            {/* Shadow circle that creates the crescent */}
            <circle cx="68" cy="36" r="34" fill="black" />
          </mask>
        </defs>
        {/* Moon disc */}
        <circle cx="46" cy="50" r="34" fill="url(#moonGrad)" mask="url(#crescentMask)" />
        {/* Subtle surface detail */}
        <circle cx="35" cy="42" r="5" fill="rgba(160,180,230,0.18)" mask="url(#crescentMask)" />
        <circle cx="52" cy="62" r="3.5" fill="rgba(160,180,230,0.14)" mask="url(#crescentMask)" />
        <circle cx="42" cy="30" r="3" fill="rgba(160,180,230,0.12)" mask="url(#crescentMask)" />
      </svg>
      <style>{`
        @keyframes moon-float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.6); }
        }
      `}</style>
    </div>
  );
};

/* ─── Main WeatherBackground ─── */
export const WeatherBackground: React.FC = () => {
  const { type, timeOfDay, sunrise, sunset, maxTemp, minTemp, locationName } = useWeather();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frameId  = useRef<number>(0);

  // Solar and Lunar Date
  const [dates, setDates] = React.useState({ solar: '', lunar: '' });

  useEffect(() => {
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

    setDates({ solar: solarStr, lunar: `Lunar ${lunarStr}` });
  }, []);

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

  if (type === 'LOADING') return null;

  const overlay  = TIME_OVERLAYS[timeOfDay];
  const tint     = TIME_TINT[timeOfDay];
  const badgeBg  = timeOfDay === 'night' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const badgeClr = timeOfDay === 'night' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.55)';

  // Hide sun/moon when raining (clouds cover sky)
  const showCelestial = type !== 'RAIN' && type !== 'THUNDER' && type !== 'CLOUDY';

  return (
    <>
      {/* Sky gradient overlay */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: overlay, pointerEvents: 'none',
        transition: 'background 1.5s ease',
      }} />
      {tint !== 'transparent' && (
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundColor: tint, pointerEvents: 'none',
          transition: 'background-color 1.5s ease',
        }} />
      )}

      {/* ☀️ Sun / 🌙 Moon */}
      {showCelestial && (
        timeOfDay === 'night'
          ? <Moon />
          : <Sun timeOfDay={timeOfDay} />
      )}

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
