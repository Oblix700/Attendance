'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, getDoc, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Meeting, Attendee } from '@/types';
import { Users, Clock, Hash } from 'lucide-react';

export default function LiveDashboard() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      orderBy('timestamp', 'desc'),
      limit(50) // Show last 50 for performance on projector
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendee[];
      setAttendees(data);
    });

    return () => unsubscribe();
  }, [meetingId]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
      padding: '4rem',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'baseline', 
        marginBottom: '4rem',
        borderBottom: '2px solid var(--glass-border)',
        paddingBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '4rem', fontWeight: '800', marginBottom: '0.5rem' }}>{meeting?.name || 'Loading Event...'}</h1>
          <div style={{ display: 'flex', gap: '3rem', fontSize: '1.5rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={32} /> {attendees.length} Present
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={32} /> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>LIVE ATTENDANCE</p>
          <div style={{ width: '100px', height: '4px', background: 'var(--primary)', marginLeft: 'auto', borderRadius: '2px' }}></div>
        </div>
      </div>

      {/* Grid of Attendees */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem',
        alignContent: 'start'
      }}>
        {attendees.map((attendee, index) => (
          <div 
            key={attendee.id} 
            className="glass-card animate-fade-in"
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              animationDelay: `${index * 0.05}s`,
              borderLeft: attendee.status === 'present' ? '4px solid var(--success)' : '4px solid var(--primary)'
            }}
          >
             <div style={{ 
               width: '50px', 
               height: '50px', 
               borderRadius: '50%', 
               background: 'rgba(255,255,255,0.05)', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               fontSize: '1.25rem',
               fontWeight: '700',
               color: 'var(--primary)'
             }}>
               {attendee.fullName.charAt(0)}
             </div>
             <div style={{ flex: 1 }}>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '0.1rem' }}>{attendee.fullName}</h3>
               {attendee.company && (
                 <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{attendee.company}</p>
               )}
             </div>
             <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
               {new Date(attendee.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
          </div>
        ))}
      </div>

      {attendees.length === 0 && (
        <div style={{ 
          height: '50vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          <Hash size={64} style={{ marginBottom: '2rem', opacity: 0.2 }} />
          <p style={{ fontSize: '2rem' }}>Waiting for first check-in...</p>
        </div>
      )}

      {/* Footer / Call to Action */}
      <div style={{ 
        position: 'fixed', 
        bottom: '2rem', 
        left: '4rem', 
        right: '4rem',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div className="glass-card" style={{ padding: '1rem 3rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <p style={{ fontSize: '1.25rem' }}>Scan the QR code to check in and share your details!</p>
        </div>
      </div>
    </div>
  );
}
