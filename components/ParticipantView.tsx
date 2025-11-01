import React, { useEffect, useRef } from 'react';
import type { Participant } from '../types';
import { UserIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from './icons/Icons';

interface ParticipantViewProps {
  participant: Participant;
  isSelf?: boolean;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  toggleMic?: () => void;
  toggleCamera?: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string, title: string }> = ({ onClick, children, className = '', title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${className}`}
    >
        {children}
    </button>
);

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, isSelf = false, isMicOn, isCameraOn, toggleMic, toggleCamera }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="w-full h-full bg-slate-800 flex items-center justify-center relative group">
      {participant.stream && isCameraOn !== false ? (
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
            <p className="mt-2 text-sm">{isSelf ? 'Your camera is off' : 'No video stream'}</p>
        </div>
      )}
      
      {isSelf && toggleMic && toggleCamera && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ControlButton 
                onClick={toggleMic} 
                className={isMicOn ? 'bg-slate-600/80 hover:bg-slate-500' : 'bg-brand-danger/80 hover:bg-red-500'}
                title={isMicOn ? 'Mute' : 'Unmute'}
            >
                {isMicOn ? <MicIcon className="w-5 h-5"/> : <MicOffIcon className="w-5 h-5"/>}
            </ControlButton>
            <ControlButton 
                onClick={toggleCamera}
                className={isCameraOn ? 'bg-slate-600/80 hover:bg-slate-500' : 'bg-brand-danger/80 hover:bg-red-500'}
                title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
                {isCameraOn ? <VideoIcon className="w-5 h-5"/> : <VideoOffIcon className="w-5 h-5"/>}
            </ControlButton>
        </div>
      )}

      {!isSelf && participant.stream && (
         <div className="absolute bottom-2 left-2 p-1 px-2 bg-black/50 rounded-md text-xs">
           Friend
         </div>
      )}
    </div>
  );
};

export default ParticipantView;
