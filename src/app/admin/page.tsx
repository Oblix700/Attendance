'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, orderBy, query, doc, deleteDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Meeting } from '@/types';
import Link from 'next/link';
import { Plus, Users, Calendar, ArrowRight, ExternalLink, House, Search, PlusCircle, X, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import MasterHistory from '@/components/MasterHistory';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'meetings' | 'history'>('meetings');
  const [showArchived, setShowArchived] = useState(false);
  
  // State for Quick Create
  const [quickCreateId, setQuickCreateId] = useState<string | null>(null);
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const q = query(collection(db, 'meetings'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meeting[];
      setMeetings(data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async (e: React.FormEvent, nameOverride?: string, dateOverride?: string) => {
    e.preventDefault();
    const finalName = nameOverride || newName;
    const finalDate = dateOverride || new Date().toISOString().split('T')[0];
    
    if (!finalName) return;

    try {
      setIsCreating(true);
      await addDoc(collection(db, 'meetings'), {
        name: finalName,
        date: finalDate,
        createdAt: Date.now(),
        status: 'active'
      });
      setNewName('');
      setQuickCreateId(null);
      fetchMeetings();
    } catch (error) {
      console.error("Error creating meeting:", error);
      alert("Failed to create meeting.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickCreate = async (meeting: Meeting) => {
    await createMeeting({ preventDefault: () => {} } as React.FormEvent, meeting.name, quickDate);
  };

  const toggleArchive = async (meeting: Meeting) => {
    try {
      const docRef = doc(db, 'meetings', meeting.id);
      await updateDoc(docRef, {
        status: meeting.status === 'archived' ? 'active' : 'archived'
      });
      fetchMeetings();
    } catch (error) {
      console.error("Error archiving meeting:", error);
    }
  };

  const deleteMeeting = async (meeting: Meeting) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: This will also delete ALL attendee data for this session.`)) {
      return;
    }

    try {
      const attendeeQuery = query(collection(db, 'attendees'), where('meetingId', '==', meeting.id));
      const attendeesSnapshot = await getDocs(attendeeQuery);
      const batch = writeBatch(db);
      attendeesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      await deleteDoc(doc(db, 'meetings', meeting.id));
      fetchMeetings();
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const filteredMeetings = meetings.filter(m => (m.status || 'active') === (showArchived ? 'archived' : 'active'));

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Admin Console</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your meetings and track global attendance</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ThemeToggle />
          <div className="glass-card" style={{ padding: '0.5rem', borderRadius: '1rem', display: 'flex', gap: '0.25rem' }}>
            <button 
              onClick={() => setActiveTab('meetings')}
              className={`btn ${activeTab === 'meetings' ? 'btn-primary' : ''}`}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '0.75rem', background: activeTab === 'meetings' ? '' : 'transparent' }}
            >
              <House size={18} style={{ marginRight: '0.4rem' }} /> Events
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`btn ${activeTab === 'history' ? 'btn-primary' : ''}`}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '0.75rem', background: activeTab === 'history' ? '' : 'transparent' }}
            >
              <Users size={18} style={{ marginRight: '0.4rem' }} /> History
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'meetings' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Create Meeting */}
          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} color="var(--primary)" />
              New Meeting
            </h2>
            <form onSubmit={createMeeting}>
              <div className="input-group">
                <label>Event Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Weekly Tech Sync" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>

          {/* Meetings List */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="var(--primary)" />
                {showArchived ? 'Archived Events' : 'Your Events'}
              </h2>
              <button 
                onClick={() => setShowArchived(!showArchived)}
                style={{ fontSize: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showArchived ? '← View Active' : 'View Archived'}
              </button>
            </div>
            
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : filteredMeetings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Empty list.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredMeetings.map((meeting) => (
                  <div 
                    key={meeting.id} 
                    style={{ 
                      padding: '1.25rem', 
                      borderRadius: '1rem', 
                      background: 'var(--input-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      opacity: meeting.status === 'archived' ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{meeting.name}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{meeting.date}</p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => setQuickCreateId(quickCreateId === meeting.id ? null : meeting.id)}
                          className="btn" 
                          style={{ 
                            background: quickCreateId === meeting.id ? 'var(--secondary)' : 'var(--input-bg)', 
                            padding: '0.5rem',
                            color: 'white'
                          }} 
                          title="Schedule next session"
                        >
                           {quickCreateId === meeting.id ? <X size={18} /> : <PlusCircle size={18} />}
                        </button>
                        <Link href={`/dashboard/${meeting.id}`} className="btn" style={{ background: 'var(--input-bg)', padding: '0.5rem' }} title="Live Display" target="_blank">
                           <ExternalLink size={18} />
                        </Link>
                        <Link href={`/admin/${meeting.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                          Manage <ArrowRight size={16} />
                        </Link>
                        
                        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--glass-border)' }}>
                          <button onClick={() => toggleArchive(meeting)} className="btn" style={{ background: 'transparent', padding: '0.5rem', color: 'var(--text-muted)' }} title="Archive">
                             {meeting.status === 'archived' ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                          </button>
                          <button onClick={() => deleteMeeting(meeting)} className="btn" style={{ background: 'transparent', padding: '0.5rem', color: '#ef4444' }} title="Delete">
                             <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {quickCreateId === meeting.id && (
                      <div className="animate-fade-in" style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '0.75rem', border: '1px solid var(--primary)' }}>
                        <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: '600' }}>Schedule next session:</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <input type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} />
                          <button onClick={() => handleQuickCreate(meeting)} className="btn btn-primary" disabled={isCreating}>
                            {isCreating ? '...' : 'Quick Create'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <MasterHistory />
      )}
    </div>
  );
}
