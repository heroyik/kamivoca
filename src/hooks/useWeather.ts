'use client';

import { useState, useEffect } from 'react';

export type WeatherType = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'THUNDER' | 'LOADING';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type UpdateStep = 'IDLE' | 'GEOLOCATING' | 'FETCHING_WEATHER' | 'FETCHING_LOCATION' | 'COMPLETED' | 'FAILED';

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
}

/** Parse ISO datetime string (e.g. "2026-03-12T06:23") → total minutes since midnight */
function toMinutes(iso: string): number {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function formatHHMM(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

/** Calculate time-of-day based on real sunrise/sunset.
 *  - night:  before (sunrise - 60min) or after (sunset + 60min)
 *  - dawn:   within 60 min before/after sunrise
 *  - dusk:   within 60 min before/after sunset
 *  - day:    everything in between
 */
function calcTimeOfDay(sunriseISO: string, sunsetISO: string): TimeOfDay {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sr = toMinutes(sunriseISO);
  const ss = toMinutes(sunsetISO);

  if (nowMin >= sr - 60 && nowMin <= sr + 60) return 'dawn';
  if (nowMin >= ss - 60 && nowMin <= ss + 60) return 'dusk';
  if (nowMin > sr + 60 && nowMin < ss - 60) return 'day';
  return 'night';
}

/** Fallback: fixed hour ranges when geolocation is unavailable */
function fallbackTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 18) return 'day';
  if (h >= 18 && h < 21) return 'dusk';
  return 'night';
}

const WEATHER_CACHE_KEY = 'kv-weather-data';

export function useWeather(): WeatherData {
  const [weather, setWeather] = useState<WeatherData>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const overrideWeather = params.get('weather')?.toUpperCase() as WeatherType | null;
      const overrideTime    = params.get('time')?.toLowerCase()    as TimeOfDay   | null;
      const validWeatherTypes: WeatherType[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'THUNDER'];
      const validTimes: TimeOfDay[]          = ['dawn', 'day', 'dusk', 'night'];

      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      let cachedData: WeatherData | null = null;
      if (cached) {
        try {
          cachedData = JSON.parse(cached);
        } catch {
          // ignore
        }
      }

      const resolvedTime = (overrideTime && validTimes.includes(overrideTime))
        ? overrideTime
        : (cachedData?.timeOfDay ?? fallbackTimeOfDay());

      if (overrideWeather && validWeatherTypes.includes(overrideWeather)) {
        return { ...cachedData, type: overrideWeather, timeOfDay: resolvedTime } as WeatherData;
      }
      if (overrideTime && validTimes.includes(overrideTime)) {
        return { ...cachedData, type: 'CLEAR', timeOfDay: overrideTime } as WeatherData;
      }

      if (cachedData) {
        return { ...cachedData, type: 'LOADING', updateStep: 'IDLE' };
      }
    }
    return { type: 'LOADING', timeOfDay: fallbackTimeOfDay(), updateStep: 'IDLE' };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // We still check for overrides here to decide if we should SKIP fetching
    const params = new URLSearchParams(window.location.search);
    const overrideWeather = params.get('weather')?.toUpperCase() as WeatherType | null;
    const overrideTime    = params.get('time')?.toLowerCase()    as TimeOfDay   | null;
    const validWeatherTypes: WeatherType[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'THUNDER'];
    const validTimes: TimeOfDay[]          = ['dawn', 'day', 'dusk', 'night'];

    // If we have a valid weather override, we don't need to fetch anything
    if (overrideWeather && validWeatherTypes.includes(overrideWeather)) {
      return;
    }
    
    // If we only have time override, we might still want to fetch weather (unless we are okay with CLEAR default)
    // For now, let's say overrides skip fetch to be simple and avoid re-renders.
    if (overrideTime && validTimes.includes(overrideTime) && !params.get('weather')) {
      // Just keep the initial CLEAR state with overridden time
      return;
    }


    const fetchWeather = async (lat: number, lon: number) => {
      setWeather(prev => ({ ...prev, updateStep: 'FETCHING_WEATHER' }));
      try {
        // Fetch weather data
        const weatherPromise = fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current_weather=true` +
          `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min` +
          `&timezone=auto`
        ).then(res => res.json());

        // Fetch location name (reverse geocoding)
        setWeather(prev => ({ ...prev, updateStep: 'FETCHING_LOCATION' }));
        const locationPromise = fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        ).then(res => res.json());

        const [data, locData] = await Promise.all([weatherPromise, locationPromise]);

        const code: number = data.current_weather.weathercode;
        const temp: number = data.current_weather.temperature;

        // Parse sunrise / sunset
        const sunriseISO: string = data.daily?.sunrise?.[0] ?? '';
        const sunsetISO: string  = data.daily?.sunset?.[0]  ?? '';
        const tod = sunriseISO && sunsetISO
          ? calcTimeOfDay(sunriseISO, sunsetISO)
          : fallbackTimeOfDay();

        let type: WeatherType = 'CLEAR';
        if (code >= 1 && code <= 3) type = 'CLOUDY';
        else if (code >= 45 && code <= 48) type = 'CLOUDY';
        else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) type = 'RAIN';
        else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) type = 'SNOW';
        else if (code >= 95) type = 'THUNDER';

        // Get city or locality name
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
        };

        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(updatedWeather));
        setWeather(updatedWeather);
      } catch (error: unknown) {
        console.error('Failed to fetch weather/location:', error);
        // Fallback to cache if available, otherwise minimal default
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
          try {
            setWeather({ ...JSON.parse(cached), updateStep: 'FAILED' });
          } catch {
            setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay(), updateStep: 'FAILED' });
          }
        } else {
          setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay(), updateStep: 'FAILED' });
        }
      }
    };

    if ('geolocation' in navigator) {
      setTimeout(() => setWeather(prev => ({ ...prev, updateStep: 'GEOLOCATING' })), 0);
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        (error) => {
          console.warn('Geolocation denied or failed:', error);
          const cached = localStorage.getItem(WEATHER_CACHE_KEY);
          if (cached) {
            try {
              setWeather({ ...JSON.parse(cached), updateStep: 'FAILED' });
            } catch {
              setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay(), updateStep: 'FAILED' });
            }
          } else {
            setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay(), updateStep: 'FAILED' });
          }
        },
        { timeout: 10000 }
      );
    } else {
      setTimeout(() => setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay(), updateStep: 'FAILED' }), 0);
    }
  }, []);

  return weather;
}
