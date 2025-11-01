
import React from 'react';
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, PhoneOffIcon } from './icons/Icons';

interface ControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string, title: string }> = ({ onClick, children, className = '', title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary ${className}`}
    >
        {children}
    </button>
);


const Controls: React.FC<ControlsProps> = ({ isMicOn, isCameraOn, onToggleMic, onToggleCamera, onLeave }) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <ControlButton 
        onClick={onToggleMic} 
        className={isMicOn ? 'bg-slate-600 hover:bg-slate-500 focus:ring-slate-500' : 'bg-brand-danger hover:bg-red-500 focus:ring-red-500'}
        title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
      >
        {isMicOn ? <MicIcon /> : <MicOffIcon />}
      </ControlButton>
      <ControlButton 
        onClick={onToggleCamera}
        className={isCameraOn ? 'bg-slate-600 hover:bg-slate-500 focus:ring-slate-500' : 'bg-brand-danger hover:bg-red-500 focus:ring-red-500'}
        title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {isCameraOn ? <VideoIcon /> : <VideoOffIcon />}
      </ControlButton>
      <ControlButton 
        onClick={onLeave} 
        className="bg-brand-danger hover:bg-red-500 focus:ring-red-500"
        title="Leave Room"
      >
        <PhoneOffIcon />
      </ControlButton>
    </div>
  );
};

export default Controls;
