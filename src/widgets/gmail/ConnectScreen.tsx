import { Mail, Chrome } from 'lucide-react';

export default function ConnectScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', padding: '24px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '12px', background: 'var(--accent-dim)',
        border: '1px solid rgba(124,106,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Mail size={22} color="var(--accent)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
          Connect Gmail
        </h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Sign in with Google to display your inbox with urgency-based colour coding.
        </p>
      </div>
      <a
        href="/api/auth/google"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--accent)', border: 'none', borderRadius: '8px',
          color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif", padding: '9px 18px',
          textDecoration: 'none', transition: 'opacity 150ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <Chrome size={15} />
        Sign in with Google
      </a>
      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'center', margin: 0 }}>
        Read-only access · tokens stored securely server-side
      </p>
    </div>
  );
}
