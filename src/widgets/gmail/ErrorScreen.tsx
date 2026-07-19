import { AlertTriangle } from 'lucide-react';

export default function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthError = message.includes('auth');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', padding: '24px' }}>
      <AlertTriangle size={28} color="var(--red)" />
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>{message}</p>
      {isAuthError ? (
        <a href="/api/auth/google" style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px',
          color: 'var(--text)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
          padding: '6px 14px', textDecoration: 'none',
        }}>
          Reconnect Gmail
        </a>
      ) : (
        <button onClick={onRetry} style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px',
          color: 'var(--text)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, padding: '6px 14px',
        }}>
          Try again
        </button>
      )}
    </div>
  );
}
