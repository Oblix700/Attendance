import Link from 'next/link';
import { QrCode, Users, Monitor, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '1rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <QrCode size={48} />
        </div>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem', fontWeight: '800' }}>EventCheck</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          The professional, real-time QR attendance system for seamless events and high-impact networking.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px', marginBottom: '4rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <Users size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>EASY CHECK-IN</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Attendees scan and join in seconds without downloading any apps.</p>
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <Monitor size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>LIVE DISPLAY</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Project a real-time list of attendees to wow your audience.</p>
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <ShieldCheck size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>COMPLIANT</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Built-in consent and POPIA compliance for secure data handling.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <Link href="/admin" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
          Go to Admin Panel
        </Link>
      </div>

      <footer style={{ marginTop: 'auto', paddingTop: '4rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Designed for speed, built for reliability. © 2026 EventCheck.
      </footer>
    </div>
  );
}
