'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { Cloud, Droplets, Wind, Thermometer, MapPin, RefreshCw } from 'lucide-react';

const WMO_CODES: Record<number, { desc: string; icon: string }> = {
  0: { desc: 'Clear sky', icon: '☀️' },
  1: { desc: 'Mainly clear', icon: '🌤️' },
  2: { desc: 'Partly cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Fog', icon: '🌫️' },
  48: { desc: 'Rime fog', icon: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️' },
  53: { desc: 'Moderate drizzle', icon: '🌦️' },
  55: { desc: 'Dense drizzle', icon: '🌧️' },
  61: { desc: 'Slight rain', icon: '🌦️' },
  63: { desc: 'Moderate rain', icon: '🌧️' },
  65: { desc: 'Heavy rain', icon: '🌧️' },
  71: { desc: 'Slight snow', icon: '🌨️' },
  73: { desc: 'Moderate snow', icon: '🌨️' },
  75: { desc: 'Heavy snow', icon: '❄️' },
  80: { desc: 'Slight showers', icon: '🌦️' },
  81: { desc: 'Moderate showers', icon: '🌧️' },
  82: { desc: 'Violent showers', icon: '⛈️' },
  95: { desc: 'Thunderstorm', icon: '⛈️' },
  96: { desc: 'Thunderstorm w/ hail', icon: '⛈️' },
  99: { desc: 'Thunderstorm w/ heavy hail', icon: '⛈️' },
};

interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    is_day: number;
  };
  current?: {
    relative_humidity_2m?: number;
  };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&current=relative_humidity_2m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

function WeatherContent({ config }: { config: Record<string, unknown> }) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const configLat = config.latitude as number | undefined;
  const configLon = config.longitude as number | undefined;
  const hasCoords = configLat != null && configLon != null;

  useEffect(() => {
    if (hasCoords) {
      setCoords({ lat: configLat!, lon: configLon! });
      return;
    }
    if (!coords) {
      detectLocation();
    }
  }, [configLat, configLon]);

  const detectLocation = () => {
    setDetecting(true);
    setGeoError(null);
    getCurrentPosition()
      .then((pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoError(null);
      })
      .catch((err: GeolocationPositionError) => {
        let msg = 'Location unavailable';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access and try again.';
        else if (err.code === 2) msg = 'Location unavailable. Check your device settings.';
        else if (err.code === 3) msg = 'Location request timed out. Try again.';
        else if (!navigator.geolocation) msg = 'Geolocation not supported by this browser.';
        setGeoError(msg);
      })
      .finally(() => setDetecting(false));
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['weather', coords],
    queryFn: () => fetchWeather(coords!.lat, coords!.lon),
    enabled: coords !== null,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  if (geoError && !coords) {
    return (
      <div className="widget-card" style={{ padding: '20px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <MapPin size={20} color="var(--text-dim)" />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '200px', lineHeight: 1.4 }}>
          {geoError}
        </p>
        <button
          onClick={detectLocation}
          disabled={detecting}
          style={{
            marginTop: '10px',
            padding: '6px 14px',
            fontSize: '0.72rem',
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            cursor: detecting ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={12} style={detecting ? { animation: 'spin 1s linear infinite' } : undefined} />
          {detecting ? 'Detecting...' : 'Try again'}
        </button>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '8px' }}>
          Or set latitude &amp; longitude in widget settings
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-card widget-skeleton" style={{ padding: '20px', justifyContent: 'center', alignItems: 'center' }}>
        {isFetching ? (
          <RefreshCw size={18} color="var(--text-dim)" style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Cloud size={20} color="var(--text-dim)" />
        )}
      </div>
    );
  }

  const wx = data.current_weather;
  const info = WMO_CODES[wx.weathercode] ?? { desc: 'Unknown', icon: '❓' };
  const humidity = data.current?.relative_humidity_2m;

  return (
    <div className="widget-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: 'var(--text)' }}>
            {Math.round(wx.temperature)}°
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {info.icon} {info.desc}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          title="Refresh"
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
            padding: '4px', display: 'flex', borderRadius: '5px',
          }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Wind size={12} color="var(--text-dim)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wx.windspeed} km/h</span>
        </div>
        {humidity != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Droplets size={12} color="var(--text-dim)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{humidity}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeatherWidget({ config }: WidgetProps) {
  return <WeatherContent config={config} />;
}

export const metadata = {
  id: 'WeatherWidget',
  displayName: 'Weather',
  description: 'Current weather from Open-Meteo',
  icon: 'Cloud',
  defaultSize: { w: 3, h: 3 } as { w: number; h: number },
  minSize: { w: 2, h: 2 } as { w: number; h: number },
  capabilities: ['configurable', 'realtime'] as WidgetCapability[],
  tags: ['utility', 'weather'],
  configurationSchema: {
    fields: [
      {
        key: 'latitude',
        label: 'Latitude',
        type: 'number' as const,
        defaultValue: undefined,
        placeholder: 'e.g. 40.7128',
      },
      {
        key: 'longitude',
        label: 'Longitude',
        type: 'number' as const,
        defaultValue: undefined,
        placeholder: 'e.g. -74.0060',
      },
    ],
  } as ConfigurationSchema,
};
