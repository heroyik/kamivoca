'use client';

import { useState, useEffect } from 'react';

export type WeatherType = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'THUNDER' | 'LOADING';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

interface WeatherData {
  type: WeatherType;
  temperature?: number;
  maxTemp?: number;
  minTemp?: number;
  timeOfDay: TimeOfDay;
  sunrise?: string; // "HH:MM" in local time
  sunset?: string;  // "HH:MM" in local time
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

export function useWeather(): WeatherData {
  const [weather, setWeather] = useState<WeatherData>({ type: 'LOADING', timeOfDay: fallbackTimeOfDay() });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dev overrides: ?weather=RAIN|SNOW|...  &  ?time=night|day|...  (both independent)
    const params = new URLSearchParams(window.location.search);
    const overrideWeather = params.get('weather')?.toUpperCase() as WeatherType | null;
    const overrideTime    = params.get('time')?.toLowerCase()    as TimeOfDay   | null;
    const validWeatherTypes: WeatherType[] = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'THUNDER'];
    const validTimes: TimeOfDay[]          = ['dawn', 'day', 'dusk', 'night'];

    const resolvedTime: TimeOfDay =
      overrideTime && validTimes.includes(overrideTime)
        ? overrideTime
        : fallbackTimeOfDay();

    if (overrideWeather && validWeatherTypes.includes(overrideWeather)) {
      setWeather({ type: overrideWeather, timeOfDay: resolvedTime });
      return;
    }

    // ?time only (no weather override) → use CLEAR + overridden time
    if (overrideTime && validTimes.includes(overrideTime)) {
      setWeather({ type: 'CLEAR', timeOfDay: overrideTime });
      return;
    }

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current_weather=true` +
          `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min` +
          `&timezone=auto`
        );
        const data = await response.json();
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

        setWeather({
          type,
          temperature: temp,
          maxTemp: data.daily?.temperature_2m_max?.[0],
          minTemp: data.daily?.temperature_2m_min?.[0],
          timeOfDay: tod,
          sunrise: sunriseISO ? formatHHMM(sunriseISO) : undefined,
          sunset:  sunsetISO  ? formatHHMM(sunsetISO)  : undefined,
        });
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay() });
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        (error) => {
          console.warn('Geolocation denied or failed:', error);
          setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay() });
        },
        { timeout: 10000 }
      );
    } else {
      setWeather({ type: 'CLEAR', timeOfDay: fallbackTimeOfDay() });
    }
  }, []);

  return weather;
}
