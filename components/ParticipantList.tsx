
import React from 'react';
import type { Participant } from '../types';
import { KickIcon } from './icons/Icons';

interface ParticipantListProps {
  participants: Participant[];
  isHost: boolean;
  onKick: (participantId: string) => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, isHost, onKick }) => {
  return (
    <ul className="space-y-3">
      {participants.map(p => (
        <li key={p.id} className="flex items-center justify-between p-2 rounded-md bg-slate-700">
          <span className="truncate">{p.name}</span>
          {isHost && p.id !== 'self' && (
            <button
              onClick={() => onKick(p.id)}
              className="p-1 text-slate-400 hover:text-brand-danger transition-colors"
              title={`Kick ${p.name}`}
            >
              <KickIcon />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default ParticipantList;