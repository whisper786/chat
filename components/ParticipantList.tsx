import React from 'react';
import type { Participant } from '../types';
import { KickIcon, UserIcon } from './icons/Icons';

interface ParticipantListProps {
  participants: Participant[];
  myPeerId: string;
  isHost: boolean;
  onKick: (id: string) => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, myPeerId, isHost, onKick }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="font-bold text-lg text-brand-light">Participants ({participants.length})</h3>
        <ul>
            {participants.map(p => (
                <li key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 group">
                    <div className="flex items-center gap-3">
                        <UserIcon className="w-6 h-6 text-slate-400" />
                        <span className="font-medium">{p.name} {p.id === myPeerId ? '(You)' : ''} {isHost && p.id === myPeerId ? '(Host)' : ''}</span>
                    </div>
                    {isHost && p.id !== myPeerId && (
                        <button 
                            onClick={() => onKick(p.id)}
                            title={`Kick ${p.name}`}
                            className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <KickIcon className="w-5 h-5"/>
                        </button>
                    )}
                </li>
            ))}
        </ul>
    </div>
  );
};

export default ParticipantList;
