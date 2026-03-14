'use client';

import { useState, useEffect, useCallback } from 'react';

export type WeatherType = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'THUNDER' | 'LOADING';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type UpdateStep = 'IDLE' | 'GEOLOCATING' | 'FETCHING_WEATHER' | 'FETCHING_LOCATION' | 'COMPLETED' | 'FAILED' | 'DENIED';

interface WeatherData {
  type: WeatherType;
  temperature?: number;
  maxTemp?: number;
  minTemp?: number;
  timeOfDay: TimeOfDay;
  sunrise?: string; // "HH:MM" in local time
  sunset?: string;  // "HH:MM" in local time
  locationName?: string;
  updateStep: UpdateStep;
  refresh: () => void;
}

const WEATHER_CACHE_KEY = 'weather_cache';

/** Parse ISO datetime string (e.g. "2026-03-12T06:23") → total minutes since midnight */
function parseISOToMinutes(iso: string): number {
  if (!iso) return 0;
  const timePart = iso.split('T')[1];
  if (!timePart) return 0;
  const [h, m] = timePart.split(':').map(Number);
  return h * 60 + m;
}

function calcTimeOfDay(sunriseISO: string, sunsetISO: string): TimeOfDay {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const rise = parseISOToMinutes(sunriseISO);
  const set  = parseISOToMinutes(sunsetISO);

  // Simple ranges: 
  // Dawn: Sunrise ± 30m
  // Dusk: Sunset ± 30m
  if (currentMinutes >= rise - 30 && currentMinutes < rise + 30) return 'dawn';
  if (currentMinutes >= set - 30  && currentMinutes < set + 30)  return 'dusk';
  if (currentMinutes >= rise + 30 && currentMinutes < set - 30)  return 'day';
  return 'night';
}

function fallbackTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

function formatHHMM(iso: string): string {
  if (!iso) return '';
  const timePart = iso.split('T')[1];
  return timePart || '';
}


export function useWeather(): WeatherData {
  const [weather, setWeather] = useState<WeatherData>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const overrideWeather = params.get('weather')?.toUpperCase() as WeatherType | null;
      const overrideTime    = params.get('time')?.toLowerCase()    as TimeOfDay   | null;
      const validWeatherTypes: WeatherType[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'THUNDER'];
      const validTimes: TimeOfDay[]          = ['dawn', 'day', 'dusk', 'night'];

      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      let cachedData: Partial<WeatherData> | null = null;
      if (cached) {
        try { cachedData = JSON.parse(cached); } catch {}
      }

      const resolvedTime = (overrideTime && validTimes.includes(overrideTime))
        ? overrideTime
        : (cachedData?.timeOfDay ?? fallbackTimeOfDay());

      if (overrideWeather && validWeatherTypes.includes(overrideWeather)) {
        return { ...cachedData, type: overrideWeather, timeOfDay: resolvedTime, updateStep: 'IDLE', refresh: () => {} };
      }
      if (overrideTime && validTimes.includes(overrideTime)) {
        return { ...cachedData, type: 'CLEAR', timeOfDay: overrideTime, updateStep: 'IDLE', refresh: () => {} };
      }

      if (cachedData) {
        return {
          ...cachedData,
          type: 'LOADING',
          timeOfDay: resolvedTime,
          updateStep: 'IDLE',
          refresh: () => {}
        } as WeatherData;
      }
    }
    return { type: 'LOADING', timeOfDay: fallbackTimeOfDay(), updateStep: 'IDLE', refresh: () => {} };
  });

  const performUpdate = async () => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('weather') || params.get('time')) return;

    const fetchWeather = async (lat: number, lon: number) => {
      setWeather(prev => ({ ...prev, updateStep: 'FETCHING_WEATHER' }));
      try {
        const weatherPromise = fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=auto`
        ).then(res => res.json());

        setWeather(prev => ({ ...prev, updateStep: 'FETCHING_LOCATION' }));
        const locationPromise = fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        ).then(res => res.json());

        const [data, locData] = await Promise.all([weatherPromise, locationPromise]);

        const code: number = data.current_weather.weathercode;
        const temp: number = data.current_weather.temperature;
        const sunriseISO: string = data.daily?.sunrise?.[0] ?? '';
        const sunsetISO: string  = data.daily?.sunset?.[0]  ?? '';
        const tod = sunriseISO && sunsetISO ? calcTimeOfDay(sunriseISO, sunsetISO) : fallbackTimeOfDay();

        let type: WeatherType = 'CLEAR';
        if (code >= 1 && code <= 3) type = 'CLOUDY';
        else if (code >= 45 && code <= 48) type = 'CLOUDY';
        else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) type = 'RAIN';
        else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) type = 'SNOW';
        else if (code >= 95) type = 'THUNDER';

        const locationName = locData.city || locData.locality || locData.principalSubdivision || 'Unknown Location';

        const updatedWeather: WeatherData = {
          type,
          temperature: temp,
          maxTemp: data.daily?.temperature_2m_max?.[0],
          minTemp: data.daily?.temperature_2m_min?.[0],
          timeOfDay: tod,
          sunrise: sunriseISO ? formatHHMM(sunriseISO) : undefined,
          sunset:  sunsetISO  ? formatHHMM(sunsetISO)  : undefined,
          locationName,
          updateStep: 'COMPLETED',
          refresh: () => {}, // placeholder
        };

        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(updatedWeather));
        setWeather({ ...updatedWeather, refresh: performUpdate });
        
        // Auto-dismiss COMPLETED status after 5s
        setTimeout(() => {
          setWeather(prev => ({ ...prev, updateStep: 'IDLE' }));
        }, 5000);
      } catch (error: unknown) {
        console.error('Failed to fetch weather/location:', error);
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        const baseData = cached ? JSON.parse(cached) : { type: 'CLEAR', timeOfDay: fallbackTimeOfDay() };
        setWeather({ ...baseData, updateStep: 'FAILED', refresh: performUpdate });
        // Auto-dismiss FAILED status after 8s
        setTimeout(() => {
          setWeather(prev => ({ ...prev, updateStep: 'IDLE' }));
        }, 8000);
      }
    };

    if ('geolocation' in navigator) {
      setWeather(prev => ({ ...prev, updateStep: 'GEOLOCATING' }));
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        (error) => {
          console.warn('Geolocation denied or failed:', error);
          const cached = localStorage.getItem(WEATHER_CACHE_KEY);
          const baseData = cached ? JSON.parse(cached) : { type: 'CLEAR', timeOfDay: fallbackTimeOfDay() };
          const step: UpdateStep = error.code === 1 ? 'DENIED' : 'FAILED';
          setWeather({ ...baseData, updateStep: step, refresh: performUpdate });
          // Auto-dismiss errors after 8s
          setTimeout(() => {
            setWeather(prev => ({ ...prev, updateStep: 'IDLE' }));
          }, 8000);
        },
        { timeout: 10000 }
      );
    } else {
      setWeather(prev => ({ ...prev, updateStep: 'FAILED', refresh: performUpdate }));
      setTimeout(() => {
        setWeather(prev => ({ ...prev, updateStep: 'IDLE' }));
      }, 8000);
    }
  };

  useEffect(() => {
    // Break the cascading render by pushing the update to the next tick
    const timer = setTimeout(() => {
      performUpdate();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return { ...weather, refresh: performUpdate };
}
