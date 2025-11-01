
import React, { useEffect, useRef } from 'react';
import type { Participant } from '../types';
import { UserIcon } from './icons/Icons';

interface ParticipantViewProps {
  participant: Participant;
}

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.id === 'self'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center text-slate-400">
            <UserIcon className="w-16 h-16" />
            <p className="mt-2">No video stream</p>
        </div>
      )}
    </div>
  );
};

export default ParticipantView;
