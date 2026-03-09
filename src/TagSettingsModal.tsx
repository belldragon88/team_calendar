import { useState } from 'react';
import type { TagConfig } from './types';
import { X, Plus, Trash2, Tag as TagIcon, Save } from 'lucide-react';

interface TagSettingsModalProps {
    tags: TagConfig[];
    onSave: (tags: TagConfig[]) => void;
    onClose: () => void;
}

const PRESET_COLORS = [
    { bg: 'bg-rose-500 text-white', text: 'text-rose-600', border: 'border-rose-200', tagBg: 'bg-rose-50' },
    { bg: 'bg-amber-500 text-white', text: 'text-amber-600', border: 'border-amber-200', tagBg: 'bg-amber-50' },
    { bg: 'bg-lime-500 text-white', text: 'text-lime-600', border: 'border-lime-200', tagBg: 'bg-lime-50' },
    { bg: 'bg-emerald-500 text-white', text: 'text-emerald-600', border: 'border-emerald-200', tagBg: 'bg-emerald-50' },
    { bg: 'bg-cyan-500 text-white', text: 'text-cyan-600', border: 'border-cyan-200', tagBg: 'bg-cyan-50' },
    { bg: 'bg-blue-500 text-white', text: 'text-blue-600', border: 'border-blue-200', tagBg: 'bg-blue-50' },
    { bg: 'bg-indigo-500 text-white', text: 'text-indigo-600', border: 'border-indigo-200', tagBg: 'bg-indigo-50' },
    { bg: 'bg-purple-500 text-white', text: 'text-purple-600', border: 'border-purple-200', tagBg: 'bg-purple-50' },
    { bg: 'bg-fuchsia-500 text-white', text: 'text-fuchsia-600', border: 'border-fuchsia-200', tagBg: 'bg-fuchsia-50' },
    { bg: 'bg-slate-500 text-white', text: 'text-slate-600', border: 'border-slate-200', tagBg: 'bg-slate-50' },
];

export function TagSettingsModal({ tags: initialTags, onSave, onClose }: TagSettingsModalProps) {
    const [tags, setTags] = useState<TagConfig[]>([...initialTags]);
    const [newTagLabel, setNewTagLabel] = useState('');
    const [selectedColorIdx, setSelectedColorIdx] = useState(0);

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagLabel.trim()) return;

        // Prevent duplicate labels
        if (tags.some(t => t.label === newTagLabel.trim())) {
            alert('A tag with this name already exists.');
            return;
        }

        const newTag: TagConfig = {
            label: newTagLabel.trim(),
            ...PRESET_COLORS[selectedColorIdx]
        };

        setTags([...tags, newTag]);
        setNewTagLabel('');
    };

    const handleRemoveTag = (labelToRemove: string) => {
        if (labelToRemove === '기타') {
            alert("'기타' 태그는 삭제할 수 없습니다.");
            return;
        }
        setTags(tags.filter(t => t.label !== labelToRemove));
    };

    const handleSave = () => {
        onSave(tags);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TagIcon size={18} className="text-brand-500" />
                        Edit Team Tags
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Add New Tag section */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add New Tag</h3>
                        <form onSubmit={handleAddTag} className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={newTagLabel}
                                onChange={e => setNewTagLabel(e.target.value)}
                                placeholder="New tag name (e.g. Design Sync)"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-medium"
                            />
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedColorIdx(idx)}
                                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${color.bg.split(' ')[0]} ${idx === selectedColorIdx ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                                    />
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={!newTagLabel.trim()}
                                className="flex items-center justify-center gap-1.5 w-full py-2 bg-brand-50 text-brand-700 font-bold text-sm rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-50"
                            >
                                <Plus size={16} /> Add Tag
                            </button>
                        </form>
                    </div>

                    {/* Current Tags List */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Current Tags ({tags.length})</h3>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <div key={tag.label} className={`flex items-center gap-1.5 py-1 pl-3 pr-1 border rounded-full text-xs font-bold ${tag.bg} border-transparent shadow-sm`}>
                                    <span>{tag.label}</span>
                                    {tag.label !== '기타' ? (
                                        <button
                                            onClick={() => handleRemoveTag(tag.label)}
                                            className="p-1 hover:bg-black/20 rounded-full transition-colors ml-1"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    ) : (
                                        <span className="w-5 h-5" /> // spacing placeholder for '기타'
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} className="px-5 py-2.5 flex items-center gap-2 text-sm font-bold text-white bg-brand-500 rounded-lg hover:bg-brand-600 shadow-sm">
                        <Save size={16} /> Save Tags
                    </button>
                </div>
            </div>
        </div>
    );
}
