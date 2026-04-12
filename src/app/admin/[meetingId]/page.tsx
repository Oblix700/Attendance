'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { Meeting, Attendee } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Download, ArrowLeft, Calendar, Mail, Phone, Share2 } from 'lucide-react';
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
      orderBy('timestamp', 'asc')
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
    const headers = ['Ser No', 'Rank', 'Init & Surname', 'Representing', 'Office Tel', 'Cell No', 'Email'];
    const rows = attendees.map((a, index) => [
      index + 1,
      a.rank || '',
      a.fullName,
      a.company || '',
      a.officeTel || '',
      a.mobile,
      a.email
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `register_${meeting?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const checkInUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${meetingId}`;

  if (loading && !meeting) return <div className="container">Loading...</div>;

  return (
    <div className="container animate-fade-in">
      <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '2rem', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{meeting?.name}</h1>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} /> {meeting?.date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> {attendees.length} Recorded</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={exportToCSV} disabled={attendees.length === 0}>
          <Download size={18} style={{ marginRight: '0.5rem' }} /> Export Register
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
            <QRCodeSVG value={checkInUrl} size={150} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Attendance QR</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scan to register attendance.</p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Invitation Tools</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Send this registration link to your team via email or messaging apps:</p>
          
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`You are invited to register for: ${meeting?.name}\n\nClick here to sign in: ${checkInUrl}`);
                alert("Invite text copied!");
              }}
              className="btn" 
              style={{ flex: 1, background: 'var(--input-bg)', fontSize: '0.85rem', gap: '0.5rem' }}
            >
              <Share2 size={16} /> Copy Invite Text
            </button>
            
            <a 
              href={`mailto:?subject=Attendance Registration: ${meeting?.name}&body=Please register your attendance for our meeting by clicking the link below:%0D%0A%0D%0A${checkInUrl}`}
              className="btn" 
              style={{ flex: 1, background: 'var(--input-bg)', color: 'var(--foreground)', fontSize: '0.85rem', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Mail size={16} /> Email Invite
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ flex: 1, wordBreak: 'break-all', opacity: 0.7 }}>{checkInUrl}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(checkInUrl);
                alert("Link copied!");
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem', overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Attendance Register</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', width: '60px' }}>Ser No</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rank</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Init & Surname</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Representing</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Contact Details</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a, index) => (
              <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{index + 1}</td>
                <td style={{ padding: '1rem' }}>{a.rank || '-'}</td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{a.fullName}</td>
                <td style={{ padding: '1rem' }}>{a.company || '-'}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={12} opacity={0.7} /> 
                      {a.officeTel ? `${a.officeTel} (O) / ` : ''}{a.mobile} (C)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.6 }}><Mail size={12} /> {a.email}</div>
                  </div>
                </td>
              </tr>
            ))}
            {attendees.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No members have registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
