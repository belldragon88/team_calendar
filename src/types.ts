export type ViewMode = 'month' | 'day';

export interface Comment {
    id: string;
    text: string;
    author: string;
    timestamp: string; // ISO string
}

export interface TagConfig {
    label: string;
    bg: string;
    text: string;
    border: string;
    tagBg: string;
}

export interface CalendarEvent {
    id: string;
    teamId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    durationMinutes: number; // For block height
    isAllDay?: boolean;
    title: string;
    creator: string;
    attendees: string;
    location: string;
    tag: string; // The selected tag label
    customTag?: string; // Used if tag is '기타'
    comments: Comment[];
    description?: string;
}

export interface Team {
    id: string; // team code
    displayName: string;
    tags: TagConfig[];
}

export const DEFAULT_TAGS: TagConfig[] = [
    { label: '젤리업', bg: 'bg-rose-500 text-white', text: 'text-rose-600', border: 'border-rose-200', tagBg: 'bg-rose-50' },
    { label: '무무', bg: 'bg-amber-500 text-white', text: 'text-amber-600', border: 'border-amber-200', tagBg: 'bg-amber-50' },
    { label: '리뷰&플랜', bg: 'bg-lime-500 text-white', text: 'text-lime-600', border: 'border-lime-200', tagBg: 'bg-lime-50' },
    { label: '옥외&DOOH', bg: 'bg-emerald-500 text-white', text: 'text-emerald-600', border: 'border-emerald-200', tagBg: 'bg-emerald-50' },
    { label: '디지털&퍼포먼스', bg: 'bg-cyan-500 text-white', text: 'text-cyan-600', border: 'border-cyan-200', tagBg: 'bg-cyan-50' },
    { label: 'PPL&시딩', bg: 'bg-blue-500 text-white', text: 'text-blue-600', border: 'border-blue-200', tagBg: 'bg-blue-50' },
    { label: 'TVC&모델', bg: 'bg-indigo-500 text-white', text: 'text-indigo-600', border: 'border-indigo-200', tagBg: 'bg-indigo-50' },
    { label: '홈웨어', bg: 'bg-purple-500 text-white', text: 'text-purple-600', border: 'border-purple-200', tagBg: 'bg-purple-50' },
    { label: '산책회앱', bg: 'bg-fuchsia-500 text-white', text: 'text-fuchsia-600', border: 'border-fuchsia-200', tagBg: 'bg-fuchsia-50' },
    { label: '기타', bg: 'bg-slate-500 text-white', text: 'text-slate-600', border: 'border-slate-200', tagBg: 'bg-slate-50' },
];
