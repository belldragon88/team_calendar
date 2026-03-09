import { useState } from 'react';
import { CalendarIcon, Users, ArrowRight } from 'lucide-react';

interface LandingProps {
    onJoinTeam: (teamId: string) => void;
}

export function Landing({ onJoinTeam }: LandingProps) {
    const [teamName, setTeamName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (teamName.trim().length > 0) {
            // URL safe team ID
            const teamId = teamName.trim().toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '-');
            onJoinTeam(teamId);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
            <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="bg-brand-500 p-2 rounded-xl text-white shadow-md">
                    <CalendarIcon size={24} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Team Calendar
                </h1>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 max-w-md w-full animate-slide-up ring-1 ring-slate-100">
                <div className="bg-brand-50 text-brand-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-brand-100">
                    <Users size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Join a Team Space</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">Enter your team's name to view the shared schedule, or create a new team space by typing a unique name.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">Team Name</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="e.g. Marketing TF, Design Team..."
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-400 font-medium text-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!teamName.trim()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-white font-bold rounded-xl shadow-md hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mt-2"
                    >
                        Enter Team Space <ArrowRight size={20} />
                    </button>
                </form>
            </div>

            {/* Made by Footer */}
            <footer className="absolute bottom-8 text-sm font-medium text-slate-400 flex flex-col items-center">
                <p>made by Belldragon.</p>
            </footer>
        </div>
    );
}
