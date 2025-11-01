import React, { useEffect, useRef } from 'react';
import type { Participant } from '../types';
import { UserIcon, MicOffIcon, KickIcon } from './icons/Icons';

interface ParticipantViewProps {
  participant: Participant;
  isSelf?: boolean;
  isMicOn?: boolean; // For self view, to show status
  isHost?: boolean;
  onKick?: (id: string) => void;
}

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, isSelf = false, isMicOn, isHost = false, onKick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream && participant.stream.getVideoTracks().some(track => track.enabled);

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center relative group aspect-video">
      {participant.stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center text-slate-400">
            <UserIcon className="w-16 h-16" />
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className="p-1 px-3 bg-black/50 rounded-full text-sm text-white flex items-center gap-2">
          {!isSelf && !participant.stream?.getAudioTracks().some(t => t.enabled) && <MicOffIcon className="w-4 h-4 text-red-400" />}
          {isSelf && !isMicOn && <MicOffIcon className="w-4 h-4 text-red-400" />}
          <span>{participant.name}{isSelf ? ' (You)' : ''}</span>
        </div>
      </div>

      {isHost && !isSelf && onKick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
            onClick={() => onKick(participant.id)} 
            title={`Kick ${participant.name}`}
            className="flex items-center justify-center w-8 h-8 font-semibold text-white bg-brand-danger/80 rounded-full shadow-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-brand-secondary"
          >
            <KickIcon className="w-5 h-5"/>
          </button>
        </div>
      )}
    </div>
  );
};

export default ParticipantView;
