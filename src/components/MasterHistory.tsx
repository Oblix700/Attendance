'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { Attendee } from '@/types';
import { Search, User, History, Download, Filter, Pencil, X, Check, Trash2, Phone, Mail } from 'lucide-react';

interface GroupedAttendee {
  email: string;
  fullName: string;
  mobile: string;
  officeTel?: string;
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
            officeTel: data.officeTel,
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
            existing.officeTel = data.officeTel;
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
          officeTel: editingAttendee.officeTel || '',
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

  const deleteMemberGlobally = async (attendee: GroupedAttendee) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: Are you sure you want to delete ${attendee.fullName} and ALL their attendance history? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'attendees'), where('email', '==', attendee.email.toLowerCase()));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      fetchGlobalData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete member.");
      setLoading(false);
    }
  };

  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase()) || (a.rank && a.rank.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'All Events' || a.meetings.some(m => m.name === selectedType);
    return matchesSearch && matchesType;
  });

  const exportMasterCSV = () => {
    const headers = ['Ser No', 'Rank', 'Init & Surname', 'Representing', 'Office Tel', 'Cell No', 'Email'];
    const rows = filteredAttendees.map((a, index) => [
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
    link.download = `master_register_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', gap: '1rem', maxWidth: '800px' }}>
          <div style={{ position: 'relative', flex: 2 }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input type="text" placeholder="Search by name, rank, or unit..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '3rem' }} />
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <Filter style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%', appearance: 'none' }}>
              <option value="All Events">All Meetings</option>
              {uniqueMeetingNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={exportMasterCSV} disabled={attendees.length === 0}>
           <Download size={18} style={{ marginRight: '0.4rem' }} /> Export Global
        </button>
      </div>

      <div className="glass-card" style={{ padding: '2rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', width: '60px' }}>Ser No</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', width: '100px' }}>Rank</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Init & Surname</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Representing</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Contact Summary</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Syncing...</td></tr>
            ) : filteredAttendees.map((a, index) => (
              <tr key={a.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ padding: '1rem' }}>{a.rank || '-'}</td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>{a.fullName}</td>
                <td style={{ padding: '1rem' }}>{a.company || '-'}</td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={10} /> {a.officeTel} (O) / {a.mobile} (C)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0.6 }}><Mail size={10} /> {a.email}</div>
                      <div style={{ opacity: 0.4, marginTop: '0.2rem' }}>Hits: {a.meetings.length}</div>
                   </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => setEditingAttendee(a)} className="btn" style={{ background: 'var(--input-bg)', padding: '0.4rem', color: 'var(--primary)' }} title="Edit"><Pencil size={14} /></button>
                    <button onClick={() => deleteMemberGlobally(a)} className="btn" style={{ background: 'var(--input-bg)', padding: '0.4rem', color: '#ef4444' }} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingAttendee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', width: '100%', padding: '2rem', background: 'var(--background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h3>Edit Profile</h3>
              <button onClick={() => setEditingAttendee(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
               <div className="input-group">
                <label>Rank</label>
                <input type="text" value={editingAttendee.rank || ''} onChange={e => setEditingAttendee({...editingAttendee, rank: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Initials & Surname</label>
                <input type="text" value={editingAttendee.fullName} onChange={e => setEditingAttendee({...editingAttendee, fullName: e.target.value})} />
              </div>
            </div>
            
            <div className="input-group">
                <label>Representing</label>
                <input type="text" value={editingAttendee.company || ''} onChange={e => setEditingAttendee({...editingAttendee, company: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Office Tel</label>
                <input type="tel" value={editingAttendee.officeTel || ''} onChange={e => setEditingAttendee({...editingAttendee, officeTel: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Cell No</label>
                <input type="tel" value={editingAttendee.mobile} onChange={e => setEditingAttendee({...editingAttendee, mobile: e.target.value})} />
              </div>
            </div>

            <button onClick={saveProfile} className="btn btn-primary" style={{ width: '100%', gap: '0.5rem', marginTop: '1rem' }} disabled={isSaving}>
              {isSaving ? 'Processing...' : <><Check size={18} /> Update Global Record</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
