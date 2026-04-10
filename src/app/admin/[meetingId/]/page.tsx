'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { Meeting, Attendee } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Download, ArrowLeft, Calendar, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function MeetingDetails() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;

    const fetchMeeting = async () => {
      const docRef = doc(db, 'meetings', meetingId as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMeeting({ id: docSnap.id, ...docSnap.data() } as Meeting);
      }
    };

    fetchMeeting();

    const q = query(
      collection(db, 'attendees'), 
      where('meetingId', '==', meetingId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendee[];
      setAttendees(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [meetingId]);

  const exportToCSV = () => {
    if (attendees.length === 0) return;
    const headers = ['Full Name', 'Rank', 'Email', 'Mobile', 'Company', 'Status', 'Consent', 'Timestamp'];
    const rows = attendees.map(a => [
      a.fullName,
      a.rank || '',
      a.email,
      a.mobile,
      a.company || '',
      a.status,
      a.consent ? 'Yes' : 'No',
      new Date(a.timestamp).toLocaleString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${meeting?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const checkInUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${meetingId}`;

  if (loading && !meeting) return <div className="container">Loading...</div>;

  return (
    <div className="container animate-fade-in">
      <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '2rem', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{meeting?.name}</h1>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} /> {meeting?.date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> {attendees.length} Attendees</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={exportToCSV} disabled={attendees.length === 0}><Download size={18} style={{ marginRight: '0.5rem' }} /> Export CSV</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Meeting QR Code</h3>
          <div className="qr-container" style={{ marginBottom: '1.5rem' }}><QRCodeSVG value={checkInUrl} size={200} /></div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Scan to check in.</p>
          <div style={{ padding: '1rem', background: 'var(--input-bg)', borderRadius: '0.75rem', fontSize: '0.75rem', wordBreak: 'break-all' }}>{checkInUrl}</div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Recent Check-ins</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Member</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rank</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>POPIA</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600' }}>{a.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.email}</div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--foreground)' }}>{a.rank || '-'}</td>
                    <td style={{ padding: '1rem' }}><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                    <td style={{ padding: '1rem' }}>{a.consent ? <Share2 size={14} color="var(--success)" /> : <span style={{ opacity: 0.3 }}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
