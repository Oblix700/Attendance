'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Meeting, Attendee } from '@/types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function CheckInPage() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'duplicate' | 'success'>('form');
  const [existingAttendee, setExistingAttendee] = useState<Attendee | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    company: '',
    rank: '',
    consent: false
  });

  useEffect(() => {
    if (!meetingId) return;
    const fetchMeeting = async () => {
      const docRef = doc(db, 'meetings', meetingId as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMeeting({ id: docSnap.id, ...docSnap.data() } as Meeting);
      }
      setLoading(false);
    };
    fetchMeeting();
  }, [meetingId]);

  const checkDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const q = query(
        collection(db, 'attendees'),
        where('meetingId', '==', meetingId),
        where('email', '==', formData.email.toLowerCase())
      );
      const qByMobile = query(
        collection(db, 'attendees'),
        where('meetingId', '==', meetingId),
        where('mobile', '==', formData.mobile)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(qByMobile)]);
      const found = !snap1.empty ? snap1.docs[0] : (!snap2.empty ? snap2.docs[0] : null);

      if (found) {
        setExistingAttendee({ id: found.id, ...found.data() } as Attendee);
        setStep('duplicate');
      } else {
        await submitRegistration();
      }
    } catch (error) {
      console.error("Error checking/submitting:", error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async () => {
    await addDoc(collection(db, 'attendees'), {
      ...formData,
      email: formData.email.toLowerCase(),
      meetingId,
      status: 'present',
      timestamp: Date.now()
    });
    setStep('success');
  };

  const markPresent = async () => {
    if (!existingAttendee) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'attendees', existingAttendee.id);
      await updateDoc(docRef, {
        status: 'present',
        timestamp: Date.now()
      });
      setStep('success');
    } catch (error) {
      console.error("Error marking present:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !meeting) return <div className="container">Loading...</div>;
  if (!meeting && !loading) return <div className="container">Meeting not found.</div>;

  return (
    <div className="container" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center' }}>
      <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
        
        {step === 'form' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome!</h1>
              <p style={{ color: 'var(--text-muted)' }}>Check in for <strong>{meeting?.name}</strong></p>
            </div>

            <form onSubmit={checkDuplicate}>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="John Doe" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                </div>
                <div className="input-group">
                  <label>Mobile</label>
                  <input type="tel" required value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="+27..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Rank / Designation</label>
                  <input type="text" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} placeholder="e.g. Lt Col" />
                </div>
                <div className="input-group">
                  <label>Representing (Optional)</label>
                  <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Unit / Office" />
                </div>
              </div>

              <div className="input-group" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem' }}>
                <input type="checkbox" required id="consent" checked={formData.consent} onChange={e => setFormData({...formData, consent: e.target.checked})} style={{ width: 'auto', marginTop: '0.25rem' }} />
                <label htmlFor="consent" style={{ color: 'var(--foreground)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  I agree to share my details for networking and comply with POPIA.
                </label>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }} disabled={loading}>
                {loading ? 'Checking...' : 'Check In Now'}
              </button>
            </form>
          </>
        )}

        {step === 'duplicate' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <AlertCircle size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Already Registered?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              We found your details ({existingAttendee?.email}). Mark present for today?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={markPresent} disabled={loading}>
                {loading ? 'Processing...' : 'Yes, Mark Me Present'}
              </button>
              <button className="btn" style={{ background: 'var(--input-bg)' }} onClick={() => setStep('form')}>No, different details</button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={80} color="var(--success)" style={{ marginBottom: '2rem' }} />
            <h2 style={{ marginBottom: '0.5rem' }}>See You Inside!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Successful check-in for {meeting?.name}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
