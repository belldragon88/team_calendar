import { useState, useEffect } from 'react';
import { CalendarApp } from './CalendarApp';
import { Landing } from './Landing';

function App() {
    const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

    // Restore session
    useEffect(() => {
        const savedTeam = localStorage.getItem('active_team_id');
        if (savedTeam) {
            setActiveTeamId(savedTeam);
        }
    }, []);

    const handleJoinTeam = (teamId: string) => {
        setActiveTeamId(teamId);
        localStorage.setItem('active_team_id', teamId);
    };

    const handleLeaveTeam = () => {
        setActiveTeamId(null);
        localStorage.removeItem('active_team_id');
    };

    if (!activeTeamId) {
        return <Landing onJoinTeam={handleJoinTeam} />;
    }

    return <CalendarApp teamId={activeTeamId} onLeaveTeam={handleLeaveTeam} />;
}

export default App;
