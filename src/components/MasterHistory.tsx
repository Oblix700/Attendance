'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { Attendee } from '@/types';
import { Search, User, History, Download, Filter, Pencil, X, Check } from 'lucide-react';

interface GroupedAttendee {
  email: string;
  fullName: string;
  mobile: string;
  company?: string;
  rank?: string;
  meetings: { id: string, name: string, date: string, timestamp: number }[];
}

export default function MasterHistory() {
  const [attendees, setAttendees] = useState<GroupedAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Events');
  const [uniqueMeetingNames, setUniqueMeetingNames] = useState<string[]>([]);
  
  // Edit State
  const [editingAttendee, setEditingAttendee] = useState<GroupedAttendee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      const meetingsSnap = await getDocs(collection(db, 'meetings'));
      const meetingsMap = new Map();
      const names = new Set<string>();
      meetingsSnap.docs.forEach(doc => {
        const data = doc.data();
        meetingsMap.set(doc.id, { id: doc.id, ...data });
        names.add(data.name);
      });
      setUniqueMeetingNames(Array.from(names).sort());

      const attendeesSnap = await getDocs(query(collection(db, 'attendees'), orderBy('timestamp', 'desc')));
      const grouped = new Map<string, GroupedAttendee>();

      attendeesSnap.docs.forEach(doc => {
        const data = doc.data() as Attendee;
        const key = data.email.toLowerCase();
        const meetingInfo = meetingsMap.get(data.meetingId) || { name: 'Unknown', date: '-' };

        if (!grouped.has(key)) {
          grouped.set(key, {
            email: data.email,
            fullName: data.fullName,
            mobile: data.mobile,
            company: data.company,
            rank: data.rank,
            meetings: [{ id: data.meetingId, name: meetingInfo.name, date: meetingInfo.date, timestamp: data.timestamp }]
          });
        } else {
          const existing = grouped.get(key)!;
          if (!existing.meetings.find(m => m.id === data.meetingId)) {
            existing.meetings.push({ id: data.meetingId, name: meetingInfo.name, date: meetingInfo.date, timestamp: data.timestamp });
          }
          // Use most recent metadata
          if (data.timestamp > existing.meetings[0].timestamp) {
            existing.fullName = data.fullName;
            existing.mobile = data.mobile;
            existing.company = data.company;
            existing.rank = data.rank;
          }
        }
      });

      setAttendees(Array.from(grouped.values()));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!editingAttendee) return;
    setIsSaving(true);
    try {
      const q = query(collection(db, 'attendees'), where('email', '==', editingAttendee.email.toLowerCase()));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      
      snap.docs.forEach(d => {
        batch.update(d.ref, {
          fullName: editingAttendee.fullName,
          mobile: editingAttendee.mobile,
          company: editingAttendee.company || '',
          rank: editingAttendee.rank || ''
        });
      });
      
      await batch.commit();
      setEditingAttendee(null);
      fetchGlobalData();
    } catch (error) {
      console.error(error);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All Events' || a.meetings.some(m => m.name === selectedType);
    return matchesSearch && matchesType;
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', gap: '1rem', maxWidth: '800px' }}>
          <div style={{ position: 'relative', flex: 2 }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input type="text" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '3rem' }} />
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <Filter style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%', appearance: 'none' }}>
              <option value="All Events">All Meetings</option>
              {uniqueMeetingNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Member Info</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rank & Company</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Meetings</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>Syncing global records...</td></tr>
            ) : filteredAttendees.map((a) => (
              <tr key={a.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1.5rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><User size={20} /></div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{a.fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.email} • {a.mobile}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>{a.rank || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.company || '-'}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {a.meetings.map(m => <span key={m.id} style={{ padding: '0.2rem 0.5rem', borderRadius: '0.4rem', background: 'var(--input-bg)', fontSize: '0.7rem' }}>{m.name}</span>)}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <button onClick={() => setEditingAttendee(a)} className="btn" style={{ background: 'var(--input-bg)', padding: '0.5rem', color: 'var(--primary)' }}><Pencil size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingAttendee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '500px', width: '100%', padding: '2rem', background: 'var(--background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h3>Edit Member Profile</h3>
              <button onClick={() => setEditingAttendee(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" value={editingAttendee.fullName} onChange={e => setEditingAttendee({...editingAttendee, fullName: e.target.value})} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Mobile Number</label>
                <input type="tel" value={editingAttendee.mobile} onChange={e => setEditingAttendee({...editingAttendee, mobile: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Rank / Designation</label>
                <input type="text" value={editingAttendee.rank || ''} onChange={e => setEditingAttendee({...editingAttendee, rank: e.target.value})} />
              </div>
            </div>

            <div className="input-group">
              <label>Company / Organization</label>
              <input type="text" value={editingAttendee.company || ''} onChange={e => setEditingAttendee({...editingAttendee, company: e.target.value})} />
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>* Editing will update this member across all past and future meetings.</p>

            <button onClick={saveProfile} className="btn btn-primary" style={{ width: '100%' }} disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : <><Check size={18} style={{ marginRight: '0.5rem' }} /> Save Profile</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
