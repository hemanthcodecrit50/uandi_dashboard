'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react';

type Phase = 'work' | 'break';

export default function PomodoroWidget({ config }: WidgetProps) {
  const workMinutes = (config.workMinutes as number) || 25;
  const breakMinutes = (config.breakMinutes as number) || 5;

  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          if (phase === 'work') {
            setSessions((s) => s + 1);
            setPhase('break');
            return breakMinutes * 60;
          } else {
            setPhase('work');
            return workMinutes * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, phase, workMinutes, breakMinutes, clearTimer]);

  const toggle = () => setIsRunning((r) => !r);

  const reset = () => {
    clearTimer();
    setIsRunning(false);
    setPhase('work');
    setSecondsLeft(workMinutes * 60);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - progress);

  const phaseColor = phase === 'work' ? 'var(--accent)' : '#22c55e';
  const PhaseIcon = phase === 'work' ? Zap : Coffee;

  return (
    <div className="widget-card" style={{ padding: '20px', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <PhaseIcon size={13} color={phaseColor} />
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, color: phaseColor,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {phase === 'work' ? 'Focus' : 'Break'}
        </span>
      </div>

      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={phaseColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 300ms ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1.5rem', fontWeight: 500, color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}>
            {timeStr}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={toggle} className="pomodoro-btn" style={{ borderColor: phaseColor, color: isRunning ? '#fff' : phaseColor, background: isRunning ? phaseColor : 'transparent' }}>
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={reset} className="pomodoro-btn">
          <RotateCcw size={14} />
        </button>
      </div>

      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
        {sessions} session{sessions !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

export const metadata = {
  id: 'PomodoroWidget',
  displayName: 'Pomodoro',
  description: 'Focus timer with work/break cycles',
  icon: 'Timer',
  defaultSize: { w: 3, h: 4 } as { w: number; h: number },
  minSize: { w: 2, h: 3 } as { w: number; h: number },
  capabilities: ['configurable'] as WidgetCapability[],
  tags: ['productivity', 'time'],
  configurationSchema: {
    fields: [
      {
        key: 'workMinutes',
        label: 'Focus Duration (min)',
        type: 'number' as const,
        defaultValue: 25,
        placeholder: '25',
      },
      {
        key: 'breakMinutes',
        label: 'Break Duration (min)',
        type: 'number' as const,
        defaultValue: 5,
        placeholder: '5',
      },
    ],
  } as ConfigurationSchema,
};
