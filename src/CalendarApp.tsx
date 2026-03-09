import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, AlignLeft, Clock,
  User, Tag as TagIcon, LayoutGrid, CalendarDays, Search, X, MessageSquare, Send,
  Users, MapPin
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parse,
  subDays,
} from 'date-fns';

import type { CalendarEvent, Comment, TagConfig } from './types';
import { useTeamData } from './hooks/useTeamData';
import { TagSettingsModal } from './TagSettingsModal';


export function CalendarApp({ teamId, onLeaveTeam }: { teamId: string, onLeaveTeam: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { team, events, saveEvent, deleteEvent, saveTags } = useTeamData(teamId);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dynamic Tags Map
  const TAG_MAP: Record<string, TagConfig> = {};
  team?.tags.forEach(t => TAG_MAP[t.label] = t);
  const defaultTag = team?.tags?.[0]?.label || '기타';

  // View State
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  // Modal States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Details Modal States
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [currentUser] = useState('Current User');

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    title: '',
    time: '09:00',
    durationMinutes: 60,
    creator: '',
    attendees: '',
    location: '',
    description: '',
    tag: defaultTag,
    customTag: ''
  });


  // --- Navigation Logistics ---
  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // --- Handlers ---
  const handleDateClick = (day: Date, timeStr: string = '09:00') => {
    setSelectedDate(day);
    setFormData({
      title: '', time: timeStr, durationMinutes: 60, creator: '',
      attendees: '', location: '', description: '', tag: defaultTag, customTag: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEventDetails = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setFormData({
      title: event.title, time: event.time, durationMinutes: event.durationMinutes,
      creator: event.creator, attendees: event.attendees, location: event.location,
      description: event.description || '', tag: event.tag, customTag: event.customTag || ''
    });
    setIsEditMode(false);
    setIsDetailsModalOpen(true);
  };

  const handleOpenDayView = (e: React.MouseEvent, day: Date) => {
    e.stopPropagation();
    setCurrentDate(day);
    setViewMode('day');
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && selectedEvent) {
      // Update existing
      const updatedEvent = {
        ...selectedEvent, title: formData.title, time: formData.time, durationMinutes: Number(formData.durationMinutes),
        description: formData.description, tag: formData.tag, customTag: formData.tag === '기타' ? formData.customTag : undefined,
        creator: formData.creator, attendees: formData.attendees, location: formData.location
      };
      saveEvent(updatedEvent);
      setSelectedEvent(updatedEvent);
      setIsEditMode(false);
    } else {
      // Add new
      if (!selectedDate) return;
      const eventToAdd: CalendarEvent = {
        id: crypto.randomUUID(),
        teamId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: formData.time, durationMinutes: Number(formData.durationMinutes),
        title: formData.title, description: formData.description,
        creator: formData.creator, attendees: formData.attendees, location: formData.location,
        tag: formData.tag, customTag: formData.tag === '기타' ? formData.customTag : undefined,
        comments: []
      };
      saveEvent(eventToAdd);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    if (confirm('Are you sure you want to delete this event?')) {
      deleteEvent(selectedEvent.id);
      setIsDetailsModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !newCommentText.trim()) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      text: newCommentText,
      author: currentUser,
      timestamp: new Date().toISOString()
    };

    const updatedEvent = { ...selectedEvent, comments: [...selectedEvent.comments, newComment] };
    saveEvent(updatedEvent);
    setSelectedEvent(updatedEvent);
    setNewCommentText('');
  };


  // --- Event Overlap Logic ---
  interface ProcessedEvent extends CalendarEvent {
    _startMinutes: number;
    _endMinutes: number;
    _col: number;      // which column it sits in
    _maxCols: number;  // total columns in this overlapping group
  }

  const calculateOverlaps = (dayEvents: CalendarEvent[]): ProcessedEvent[] => {
    // 1. Convert times to minutes and sort by start time, then duration (longest first)
    const procEvents: ProcessedEvent[] = dayEvents.map(e => {
      const [h, m] = e.time.split(':').map(Number);
      const start = h * 60 + m;
      return { ...e, _startMinutes: start, _endMinutes: start + e.durationMinutes, _col: 0, _maxCols: 1 };
    }).sort((a, b) => a._startMinutes - b._startMinutes || b._endMinutes - a._endMinutes);

    // 2. Group overlapping events
    let columns: ProcessedEvent[][] = [];
    let lastEventEnding = null;

    for (let ev of procEvents) {
      if (lastEventEnding !== null && ev._startMinutes >= lastEventEnding) {
        // New distinct group, calculate maxCols for previous group and reset
        let maxC = columns.length;
        columns.forEach(col => col.forEach(ce => ce._maxCols = maxC));
        columns = [];
        lastEventEnding = null;
      }

      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastInCol = col[col.length - 1];
        if (ev._startMinutes >= lastInCol._endMinutes) {
          col.push(ev);
          ev._col = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev._col = columns.length;
        columns.push([ev]);
      }

      if (lastEventEnding === null || ev._endMinutes > lastEventEnding) {
        lastEventEnding = ev._endMinutes;
      }
    }

    if (columns.length > 0) {
      let maxC = columns.length;
      columns.forEach(col => col.forEach(ce => ce._maxCols = maxC));
    }

    return procEvents;
  };


  // --- Renderers ---

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(cloneDay, "d");
        const dateStr = format(cloneDay, 'yyyy-MM-dd');

        const dayEvents = events.filter(e => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

        days.push(
          <div
            key={cloneDay.toString()}
            onClick={() => handleDateClick(cloneDay)}
            className={`
              min-h-[140px] p-2 border-r border-b border-slate-200 cursor-pointer transition-colors duration-200
              hover:bg-slate-50 relative group flex flex-col
              ${!isSameMonth(day, monthStart) ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-slate-700'}
              ${isSameDay(day, new Date()) ? 'bg-brand-50/30' : ''}
            `}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`
                 text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                 ${isSameDay(day, new Date()) ? 'bg-brand-500 text-white' : ''}
               `}>
                {formattedDate}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={(e) => handleOpenDayView(e, cloneDay)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-brand-600 rounded-md hover:bg-brand-50"
                  title="Detail View (Day Calendar)"
                >
                  <Search size={14} strokeWidth={2.5} />
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-brand-500 rounded-full hover:bg-slate-100">
                  <Plus size={14} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
              {dayEvents.map(event => {
                const colors = TAG_MAP[event.tag] || { bg: 'bg-slate-500 text-white', text: 'text-slate-600', border: 'border-slate-200', tagBg: 'bg-slate-50' };
                return (
                  <div
                    key={event.id}
                    onClick={(e) => handleOpenEventDetails(e, event)}
                    className={`text-[11px] px-1.5 py-1 rounded shadow-sm cursor-pointer hover:brightness-95 transition-all flex flex-col ${colors.bg}`}
                  >
                    <div className="font-semibold truncate leading-tight flex justify-between items-center">
                      <span>{event.title}</span>
                      {event.comments.length > 0 && <span className="text-[9px] bg-black/20 px-1 rounded-sm ml-1">{event.comments.length}</span>}
                    </div>
                    <div className="text-[9px] opacity-90 truncate leading-tight mt-0.5">{event.time} • {event.tag === '기타' ? event.customTag : event.tag}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-full">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
          {weekDays.map(wDay => (
            <div key={wDay} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {wDay}
            </div>
          ))}
        </div>
        <div className="flex flex-col bg-slate-200/50 gap-[1px] flex-1">
          {rows}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayEventsRaw = events.filter(e => e.date === dateStr);

    // Process overlapping logic
    const dayEvents = calculateOverlaps(dayEventsRaw);

    const HOUR_HEIGHT = 80; // pixels per hour (5rem)

    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col animate-fade-in h-[calc(100vh-140px)]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{format(currentDate, 'EEEE')}</h2>
            <p className="text-slate-500 font-medium">{format(currentDate, 'MMMM do, yyyy')}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDateClick(currentDate); }}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Add Event</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* Timeline Background Grid */}
            <div className="absolute left-16 right-0 top-0 bottom-0 flex flex-col">
              {hours.map(hour => (
                <div key={hour} className="border-t border-slate-200 relative group cursor-pointer shrink-0" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => handleDateClick(currentDate, `${hour.toString().padStart(2, '0')}:00`)}>
                  <div className="absolute inset-0 bg-brand-50/0 group-hover:bg-brand-50/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-brand-500 text-sm font-medium flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm"><Plus size={14} /> Add</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Time labels axis */}
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col z-10 bg-transparent">
              {hours.map(hour => (
                <div key={hour} className="relative flex justify-end pr-4 text-xs font-medium text-slate-400 font-mono -mt-2 shrink-0" style={{ height: `${HOUR_HEIGHT}px` }}>
                  {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                </div>
              ))}
            </div>

            {/* Render Overlapping Events */}
            <div className="absolute left-16 right-0 top-0 bottom-0">
              {dayEvents.map(event => {
                const topPx = (event._startMinutes / 60) * HOUR_HEIGHT;
                const heightPx = (event.durationMinutes / 60) * HOUR_HEIGHT;

                // Width calculation based on overlap columns
                const widthPerc = 100 / event._maxCols;
                const leftPerc = widthPerc * event._col;

                const colors = TAG_MAP[event.tag] || { bg: 'bg-slate-500 text-white', text: 'text-slate-600', border: 'border-slate-200', tagBg: 'bg-slate-50' };

                return (
                  <div
                    key={event.id}
                    onClick={(e) => handleOpenEventDetails(e, event)}
                    className={`absolute rounded-lg p-3 border shadow-sm cursor-pointer hover:shadow-md hover:z-20 transition-all overflow-hidden ${colors.tagBg} ${colors.border}`}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx - 2}px`, // Slight gap between stacked items
                      left: `${leftPerc}%`,
                      width: `${widthPerc}%`,
                      zIndex: 10 + event._col // Ensure later columns overlap slightly if needed or just sit side-by-side cleanly
                    }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-slate-800 text-sm truncate leading-tight">{event.title}</span>
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg}`}>{event.tag === '기타' && event.customTag ? event.customTag : event.tag}</span>
                      </div>

                      {heightPx > 50 && (
                        <div className="text-[11px] font-medium text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="flex items-center gap-1"><Clock size={11} className="opacity-70" /> {event.time} ({event.durationMinutes}m)</span>
                          {event.location && <span className="flex items-center gap-1"><MapPin size={11} className="opacity-70" /> {event.location}</span>}
                        </div>
                      )}

                      {heightPx > 80 && event.attendees && (
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate"><Users size={11} /> {event.attendees}</div>
                      )}

                      {heightPx > 100 && event.description && <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{event.description}</div>}

                      <div className="mt-auto pt-1 flex items-center justify-between text-[10px] text-slate-500 opacity-80">
                        <div className="flex items-center gap-1 shrink-0"><User size={10} /> {event.creator}</div>
                        {event.comments.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0 bg-white px-1 rounded shadow-sm"><MessageSquare size={10} /> {event.comments.length}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-10 shadow-sm shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onLeaveTeam} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mr-1">
              <ChevronLeft size={20} />
            </button>
            <div className="bg-brand-500 p-2 rounded-xl text-white shadow-md">
              <CalendarIcon size={22} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">
              {team?.displayName || 'Loading...'} <span className="text-brand-500 font-normal opacity-75">Calendar</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <TagIcon size={16} /> 설정
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button onClick={() => setViewMode('month')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid size={16} /> <span className="hidden sm:block leading-none">Month</span>
              </button>
              <button onClick={() => setViewMode('day')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <CalendarDays size={16} /> <span className="hidden sm:block leading-none">Day</span>
              </button>
            </div>

            <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm">
              Today
            </button>
            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-sm">
              <button onClick={navigatePrev} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"><ChevronLeft size={18} /></button>
              <span className="px-4 text-[15px] font-semibold text-slate-800 w-36 text-center select-none">
                {viewMode === 'month' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'MMM d, yyyy')}
              </span>
              <button onClick={navigateNext} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col min-h-0">
        {viewMode === 'month' ? renderMonthView() : renderDayView()}
      </main>

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-slide-up ring-1 ring-black/5 my-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Add New Event</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="md:col-span-2 text-sm font-medium text-brand-700 bg-brand-50 p-3 rounded-lg flex items-center gap-2 mb-2 border border-brand-100">
                <CalendarIcon size={18} className="text-brand-500" />
                {selectedDate && format(selectedDate, 'EEEE, MMMM do, yyyy')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 object-uppercase">Title</label>
                <input type="text" required autoFocus value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="Event title" />
              </div>

              {/* Row 2: Time & Duration */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Time</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Clock size={16} className="text-slate-400" /></div>
                  <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (Minutes)</label>
                <select value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none font-medium">
                  <option value={15}>15 Min</option>
                  <option value={30}>30 Min</option>
                  <option value={45}>45 Min</option>
                  <option value={60}>1 Hour</option>
                  <option value={90}>1.5 Hours</option>
                  <option value={120}>2 Hours</option>
                  <option value={180}>3 Hours</option>
                  <option value={240}>4 Hours</option>
                  <option value={480}>All Day (8 Hours)</option>
                </select>
              </div>

              {/* Row 3: Creator & Attendees */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Creator</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-slate-400" /></div>
                  <input type="text" required value={formData.creator} onChange={e => setFormData({ ...formData, creator: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-400 font-medium" placeholder="Your Name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Attendees</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Users size={16} className="text-slate-400" /></div>
                  <input type="text" value={formData.attendees} onChange={e => setFormData({ ...formData, attendees: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-400 font-medium" placeholder="e.g. Alex, Marketing TF" />
                </div>
              </div>

              {/* Row 4: Location */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin size={16} className="text-slate-400" /></div>
                  <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-400 font-medium" placeholder="e.g. 회의실 A, Zoom link..." />
                </div>
              </div>

              {/* Tag Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tag (Category)</label>
                <div className="flex flex-wrap gap-2">
                  {team?.tags.map(tObj => {
                    const tag = tObj.label;
                    const active = formData.tag === tag;
                    return (
                      <label key={tag} className={`flex items-center py-1.5 px-3 border rounded-full cursor-pointer transition-all text-xs font-bold ${active ? `ring-2 ring-offset-1 ring-slate-400 ${tObj.bg} border-transparent` : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 mr-1'}`}>
                        <input type="radio" value={tag} checked={active} onChange={() => setFormData({ ...formData, tag, customTag: tag === '기타' ? formData.customTag : '' })} className="sr-only" />
                        {tag}
                      </label>
                    )
                  })}
                </div>
                {/* Custom Tag Input if '기타' is selected */}
                {formData.tag === '기타' && (
                  <div className="mt-3 animate-fade-in relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><TagIcon size={14} className="text-slate-400" /></div>
                    <input type="text" required value={formData.customTag} onChange={e => setFormData({ ...formData, customTag: e.target.value })} className="w-full md:w-1/2 pl-9 pr-4 py-2 border-b-2 border-slate-300 bg-slate-50/50 focus:border-slate-600 outline-none text-sm transition-all" placeholder="Enter custom category name..." />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (Optional)</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 text-sm resize-none" placeholder="Add description, agenda, or links..." />
              </div>

              <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-sm rounded-lg transition-all active:scale-[0.98]">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Edit Event Details Model (Updated with new fields) */}
      {isDetailsModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row items-center md:items-stretch justify-center p-4 md:p-8 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-hidden">
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-slide-up h-full max-h-[90vh]">

            {/* Left side: View/Edit Form */}
            <div className="w-full md:w-[60%] flex flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/30 overflow-y-auto relative">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${TAG_MAP[selectedEvent.tag]?.bg.split(' ')[0] || 'bg-slate-500'}`} />
                  <h2 className="text-lg font-bold text-slate-800">
                    {isEditMode ? 'Edit Event Details' : 'Event Information'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditMode && (
                    <>
                      <button onClick={() => setIsEditMode(true)} className="px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors border border-brand-200">Edit</button>
                      <button onClick={handleDeleteEvent} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200">Delete</button>
                    </>
                  )}
                  <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 ml-2">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1">
                {isEditMode ? (
                  // --- EDIT MODE FORM (Reusing fields layout essentially) ---
                  <form id="edit-form" onSubmit={handleSaveEvent} className="flex flex-col gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                      <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Time</label>
                        <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Min)</label>
                        <input type="number" min="15" step="15" required value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Creator</label>
                        <input type="text" required value={formData.creator} onChange={e => setFormData({ ...formData, creator: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attendees</label>
                        <input type="text" value={formData.attendees} onChange={e => setFormData({ ...formData, attendees: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                      <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tag</label>
                      <div className="flex flex-wrap gap-2">
                        {team?.tags.map(tObj => {
                          const tag = tObj.label;
                          return (
                            <label key={tag} className={`flex items-center py-1.5 px-3 border rounded-full cursor-pointer text-xs font-bold ${formData.tag === tag ? `ring-2 ring-slate-400 ${tObj.bg} border-transparent` : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                              <input type="radio" value={tag} checked={formData.tag === tag} onChange={() => setFormData({ ...formData, tag, customTag: tag === '기타' ? formData.customTag : '' })} className="sr-only" />
                              {tag}
                            </label>
                          )
                        })}
                      </div>
                      {formData.tag === '기타' && (
                        <input type="text" required value={formData.customTag} onChange={e => setFormData({ ...formData, customTag: e.target.value })} className="mt-3 w-full md:w-1/2 px-3 py-1.5 border-b-2 border-slate-300 bg-transparent focus:border-slate-600 outline-none text-sm font-bold" placeholder="Custom Tag Name..." />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                      <textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm resize-none" />
                    </div>
                    <div className="mt-2 pt-4 border-t border-slate-200 flex gap-3 justify-end">
                      <button type="button" onClick={() => setIsEditMode(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                      <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-brand-500 rounded-lg hover:bg-brand-600 shadow-sm">Save Changes</button>
                    </div>
                  </form>
                ) : (
                  // --- VIEW MODE ---
                  <div className="flex flex-col gap-8">
                    <div>
                      {/* Tag Badge */}
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 shadow-sm border ${TAG_MAP[selectedEvent.tag]?.border || 'border-slate-200'} ${TAG_MAP[selectedEvent.tag]?.text || 'text-slate-600'} ${TAG_MAP[selectedEvent.tag]?.tagBg || 'bg-slate-50'}`}>
                        {selectedEvent.tag === '기타' && selectedEvent.customTag ? selectedEvent.customTag : selectedEvent.tag}
                      </div>
                      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">{selectedEvent.title}</h1>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 py-1.5 px-3 rounded-lg shadow-sm"><CalendarIcon size={16} className="text-brand-500" /> {format(parse(selectedEvent.date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM do, yyyy')}</div>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 py-1.5 px-3 rounded-lg shadow-sm"><Clock size={16} className="text-brand-500" /> {selectedEvent.time} <span className="text-slate-400 font-normal">({selectedEvent.durationMinutes}m)</span></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedEvent.location && (
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm col-span-1 sm:col-span-2 flex items-start gap-4">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><MapPin size={20} className="text-slate-500" /></div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</span>
                            <div className="font-semibold text-slate-800 text-sm md:text-base">{selectedEvent.location}</div>
                          </div>
                        </div>
                      )}
                      <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-start gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><User size={20} className="text-slate-500" /></div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Organized By</span>
                          <div className="font-semibold text-slate-800">{selectedEvent.creator}</div>
                        </div>
                      </div>
                      {selectedEvent.attendees && (
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-start gap-4">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100"><Users size={20} className="text-slate-500" /></div>
                          <div className="overflow-hidden">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Attendees</span>
                            <div className="font-semibold text-slate-800 truncate" title={selectedEvent.attendees}>{selectedEvent.attendees}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm min-h-[140px] relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><AlignLeft size={80} /></div>
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide mb-3"><AlignLeft size={16} /> Notes & Agenda</span>
                      {selectedEvent.description ? (
                        <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed relative z-10">{selectedEvent.description}</p>
                      ) : (
                        <p className="text-slate-400 italic text-sm relative z-10">No detailed notes provided for this event.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Comments Panel */}
            <div className="w-full md:w-[40%] flex flex-col bg-slate-50 border-t md:border-t-0 border-slate-200">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-white sticky top-0 z-10 shadow-sm shrink-0">
                <MessageSquare size={18} className="text-brand-500" />
                <h3 className="font-bold text-slate-800">Team Comments</h3>
                <span className="ml-auto bg-slate-100 text-slate-600 text-xs py-0.5 px-2.5 rounded-full font-bold">{selectedEvent.comments.length}</span>
              </div>

              {/* Comment List */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                {selectedEvent.comments.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-12 opacity-80">
                    <div className="bg-white p-5 rounded-full shadow-sm border border-slate-100 mb-4 text-slate-300">
                      <MessageSquare size={36} />
                    </div>
                    <p className="text-slate-600 font-bold mb-1">No comments yet</p>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-[200px]">Be the first to share notes, links, or ask questions.</p>
                  </div>
                ) : (
                  selectedEvent.comments.map(comment => (
                    <div key={comment.id} className="bg-white p-4 rounded-2xl text-sm border border-slate-100 shadow-sm animate-fade-in relative group hover:border-brand-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase">{comment.author.substring(0, 2)}</div>{comment.author}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{format(new Date(comment.timestamp), 'h:mm a • MMM d')}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap ml-6.5">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    placeholder="Type your comment..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center"
                  >
                    <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tag Settings Modal */}
      {isSettingsOpen && team && (
        <TagSettingsModal
          tags={team.tags}
          onSave={saveTags}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Dynamic Main Page Footer */}
      <footer className="mt-8 mb-4 text-center text-sm font-medium text-slate-400">
        made by Belldragon.
      </footer>
    </div>
  );
}
