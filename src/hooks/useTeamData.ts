import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, query, where, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type { CalendarEvent, TagConfig, Team } from '../types';
import { DEFAULT_TAGS } from '../types';

export function useTeamData(teamId: string | null) {
    const [team, setTeam] = useState<Team | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Default local state (Fallback when Firebase is not setup)
    const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() => {
        const saved = localStorage.getItem('local_events');
        return saved ? JSON.parse(saved) : [];
    });
    const [localTeams, setLocalTeams] = useState<Record<string, Team>>(() => {
        const saved = localStorage.getItem('local_teams');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        if (!teamId) return;

        if (!isFirebaseConfigured || !db) {
            // Local Storage Fallback
            let myTeam = localTeams[teamId];
            if (!myTeam) {
                myTeam = { id: teamId, displayName: teamId, tags: DEFAULT_TAGS };
                const newTeams = { ...localTeams, [teamId]: myTeam };
                setLocalTeams(newTeams);
                localStorage.setItem('local_teams', JSON.stringify(newTeams));
            }
            setTeam(myTeam);
            setEvents(localEvents.filter(e => e.teamId === teamId));
            setLoading(false);
            return;
        }

        // Firebase Implementation
        setLoading(true);

        const teamRef = doc(db, 'teams', teamId);

        let unsubTeam: () => void;
        let unsubEvents: () => void;

        // Fetch team once to initialize if missing
        getDoc(teamRef).then(snap => {
            if (!snap.exists()) {
                setDoc(teamRef, { id: teamId, displayName: teamId, tags: DEFAULT_TAGS });
            }

            // Start listening after confirming it exists/created
            unsubTeam = onSnapshot(teamRef, (docSnap) => {
                if (docSnap.exists()) {
                    setTeam(docSnap.data() as Team);
                }
            });

            // Start listening to events
            if (db) {
                const q = query(collection(db, 'events'), where('teamId', '==', teamId));
                unsubEvents = onSnapshot(q, (snapshot) => {
                    const dbEvents: CalendarEvent[] = [];
                    snapshot.forEach(docSnap => {
                        dbEvents.push({ ...docSnap.data(), id: docSnap.id } as CalendarEvent);
                    });
                    setEvents(dbEvents);
                    setLoading(false);
                });
            }
        });

        return () => {
            if (unsubTeam) unsubTeam();
            if (unsubEvents) unsubEvents();
        };

    }, [teamId]);

    const saveEvent = async (event: CalendarEvent) => {
        if (!teamId) return;

        if (!isFirebaseConfigured || !db) {
            const idx = localEvents.findIndex(e => e.id === event.id);
            let newEvents;
            if (idx !== -1) {
                newEvents = [...localEvents];
                newEvents[idx] = event;
            } else {
                newEvents = [...localEvents, event];
            }
            setLocalEvents(newEvents);
            localStorage.setItem('local_events', JSON.stringify(newEvents));
            setEvents(newEvents.filter(e => e.teamId === teamId));
            return;
        }

        const eventRef = doc(db, 'events', event.id);

        // Firestore SDK crashes if any value is statically `undefined`. 
        // We strip undefined properties cleanly by parsing a stringified instance.
        const cleanEvent = JSON.parse(JSON.stringify(event));

        await setDoc(eventRef, cleanEvent);
    };

    const deleteEvent = async (eventId: string) => {
        if (!isFirebaseConfigured || !db) {
            const newEvents = localEvents.filter(e => e.id !== eventId);
            setLocalEvents(newEvents);
            localStorage.setItem('local_events', JSON.stringify(newEvents));
            setEvents(newEvents.filter(e => e.teamId === teamId));
            return;
        }
        // Delete from FS
        const { deleteDoc, doc: fDoc } = await import('firebase/firestore');
        await deleteDoc(fDoc(db, 'events', eventId));
    };

    const saveTags = async (tags: TagConfig[]) => {
        if (!teamId || !team) return;

        if (!isFirebaseConfigured || !db) {
            const newTeam = { ...team, tags };
            const newTeams = { ...localTeams, [teamId]: newTeam };
            setLocalTeams(newTeams);
            localStorage.setItem('local_teams', JSON.stringify(newTeams));
            setTeam(newTeam);
            return;
        }

        const teamRef = doc(db, 'teams', teamId);
        await setDoc(teamRef, { tags }, { merge: true });
    };

    return { team, events, loading, saveEvent, deleteEvent, saveTags };
}
