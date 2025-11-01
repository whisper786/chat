import React from 'react';
import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon, PhoneOffIcon } from './icons/Icons';

interface ControlsProps {
  onLeave: () => void;
  isMicOn: boolean;
  isCameraOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string, title: string, active: boolean }> = ({ onClick, children, className = '', title, active }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 ${active ? 'bg-slate-600 hover:bg-slate-500' : 'bg-brand-danger hover:bg-red-500'} ${className}`}
    >
        {children}
    </button>
);


const Controls: React.FC<ControlsProps> = ({ onLeave, isMicOn, isCameraOn, toggleMic, toggleCamera }) => {
  return (
    <div className="flex items-center justify-center gap-4 p-2 bg-brand-secondary/80 backdrop-blur-sm rounded-full shadow-2xl">
      <ControlButton 
          onClick={toggleMic} 
          title={isMicOn ? 'Mute' : 'Unmute'}
          active={isMicOn}
      >
          {isMicOn ? <MicIcon className="w-6 h-6"/> : <MicOffIcon className="w-6 h-6"/>}
      </ControlButton>
      <ControlButton 
          onClick={toggleCamera}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
          active={isCameraOn}
      >
          {isCameraOn ? <VideoIcon className="w-6 h-6"/> : <VideoOffIcon className="w-6 h-6"/>}
      </ControlButton>
      <button 
        onClick={onLeave} 
        title="Leave Room"
        className="flex items-center justify-center w-auto h-12 px-5 font-semibold text-white bg-brand-danger rounded-full shadow-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105"
      >
        <PhoneOffIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Controls;
