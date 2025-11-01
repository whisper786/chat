import React, { useEffect, useRef } from 'react';
import type { Participant } from '../types';
import { UserIcon, MicOffIcon } from './icons/Icons';

interface ParticipantViewProps {
  participant: Participant;
  isSelf?: boolean;
  isMicOn?: boolean; // For self view, to show status
}

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, isSelf = false, isMicOn }) => {
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
            {!isSelf && <p className="mt-2 text-sm animate-pulse">Connecting...</p>}
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className="p-1 px-3 bg-black/50 rounded-full text-sm text-white flex items-center gap-2">
          {!isSelf && participant.stream && !participant.stream.getAudioTracks().some(t => t.enabled) && <MicOffIcon className="w-4 h-4 text-red-400" />}
          {isSelf && !isMicOn && <MicOffIcon className="w-4 h-4 text-red-400" />}
          <span>{participant.name}{isSelf ? ' (You)' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default ParticipantView;