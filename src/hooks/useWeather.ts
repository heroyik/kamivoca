'use client';

import { useState, useEffect } from 'react';

export type WeatherType = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'SNOW' | 'THUNDER' | 'LOADING';

interface WeatherData {
  type: WeatherType;
  temperature?: number;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>({ type: 'LOADING' });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await response.json();
        const code = data.current_weather.weathercode;
        const temp = data.current_weather.temperature;

        let type: WeatherType = 'CLEAR';

        // Mapping WMO codes to our types
        if (code >= 1 && code <= 3) type = 'CLOUDY';
        else if (code >= 45 && code <= 48) type = 'CLOUDY'; // Fog as cloudy
        else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) type = 'RAIN';
        else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) type = 'SNOW';
        else if (code >= 95) type = 'THUNDER';

        setWeather({ type, temperature: temp });
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        setWeather({ type: 'CLEAR' }); // Fallback
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocation denied or failed:', error);
          setWeather({ type: 'CLEAR' });
        },
        { timeout: 10000 }
      );
    } else {
      setWeather({ type: 'CLEAR' });
    }
  }, []);

  return weather;
}
