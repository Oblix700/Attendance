export interface Meeting {
  id: string;
  name: string;
  date: string;
  createdAt: number;
  status: 'active' | 'archived';
}

export interface Attendee {
  id: string;
  meetingId: string;
  fullName: string;
  email: string;
  mobile: string;
  officeTel?: string;
  company?: string;
  rank?: string;
  consent: boolean;
  status: 'present' | 'registered';
  timestamp: number;
}
