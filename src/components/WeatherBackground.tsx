'use client';

import React, { useEffect, useRef } from 'react';
import { useWeather, WeatherType } from '@/hooks/useWeather';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  vx?: number;
}

export const WeatherBackground: React.FC = () => {
  const { type } = useWeather();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frameId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles.current = [];
      const count = type === 'RAIN' ? 100 : type === 'SNOW' ? 80 : 0;
      for (let i = 0; i < count; i++) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: Math.random() * 5 + 5,
          size: type === 'RAIN' ? Math.random() * 2 + 1 : Math.random() * 3 + 2,
          opacity: Math.random() * 0.5 + 0.2,
          vx: type === 'SNOW' ? (Math.random() - 0.5) * 1 : 0
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (type === 'RAIN') {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
        ctx.lineWidth = 1;
        particles.current.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.size * 5);
          ctx.stroke();

          p.y += p.speed;
          if (p.y > canvas.height) {
            p.y = -20;
            p.x = Math.random() * canvas.width;
          }
        });
      } else if (type === 'SNOW') {
        ctx.fillStyle = 'white';
        particles.current.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speed * 0.3;
          p.x += (p.vx || 0);
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
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

  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-[-1] transition-colors duration-1000 ${
        type === 'RAIN' || type === 'THUNDER' ? 'bg-black/10' : 
        type === 'CLOUDY' ? 'bg-gray-100/10' : ''
      }`}
      style={{
        background: type === 'CLOUDY' ? 'linear-gradient(to bottom, rgba(200, 200, 200, 0.1), transparent)' : 'none'
      }}
    >
      <canvas id="weather-background" ref={canvasRef} className="block w-full h-full" />
      
      {/* Thunder Flash Overlay */}
      {type === 'THUNDER' && <ThunderOverlay />}
    </div>
  );
};

const ThunderOverlay: React.FC = () => {
  const [active, setActive] = React.useState(false);

  useEffect(() => {
    const flash = () => {
      if (Math.random() > 0.98) {
        setActive(true);
        setTimeout(() => setActive(false), 50 + Math.random() * 100);
      }
      requestAnimationFrame(flash);
    };
    const id = requestAnimationFrame(flash);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div 
      className={`absolute inset-0 bg-white/30 transition-opacity duration-75 pointer-events-none ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};
