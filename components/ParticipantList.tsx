import React, { useState } from 'react';
import type { Participant } from '../types';
import { KickIcon, UserIcon, CrownIcon, UserPlusIcon, CopyIcon } from './icons/Icons';

interface ParticipantListProps {
  participants: Participant[];
  myPeerId: string;
  isHost: boolean;
  onKick: (id: string) => void;
  onPromote: (id: string) => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, myPeerId, isHost, onKick, onPromote }) => {
  const [copied, setCopied] = useState(false);
  
  const handleInvite = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-brand-secondary text-brand-light">
      <div className="p-4 border-b border-brand-accent/50">
        <h3 className="font-bold text-lg">Participants ({participants.length})</h3>
        <button 
            onClick={handleInvite}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-brand-accent rounded-lg shadow-lg hover:bg-brand-accent/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-highlight focus:ring-offset-brand-secondary transition-all"
        >
          {copied ? (
            <>
              <CopyIcon className="w-5 h-5"/>
              Copied!
            </>
          ) : (
            <>
              <UserPlusIcon className="w-5 h-5"/>
              Invite Friends
            </>
          )}
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {participants.map(p => (
              <li key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-accent/30 group">
                  <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserIcon className="w-8 h-8 text-slate-400" />
                        {p.isHost && <CrownIcon className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />}
                      </div>
                      <span className="font-medium">{p.name} {p.id === myPeerId ? '(You)' : ''}</span>
                  </div>
                  {isHost && p.id !== myPeerId && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!p.isHost && (
                             <button 
                                onClick={() => onPromote(p.id)}
                                title={`Make ${p.name} a host`}
                                className="p-2 text-yellow-400 hover:text-white hover:bg-yellow-500 rounded-full"
                            >
                                <CrownIcon className="w-5 h-5"/>
                            </button>
                          )}
                          <button 
                              onClick={() => onKick(p.id)}
                              title={`Kick ${p.name}`}
                              className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-full"
                          >
                              <KickIcon className="w-5 h-5"/>
                          </button>
                      </div>
                  )}
              </li>
          ))}
      </ul>
    </div>
  );
};

export default ParticipantList;
