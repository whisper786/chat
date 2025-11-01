import React from 'react';
import { VideoIcon, PhoneOffIcon } from './icons/Icons';

interface ControlsProps {
  onStartStream: () => void;
  isStreamActive: boolean;
  onLeave: () => void;
}

const Controls: React.FC<ControlsProps> = ({ onStartStream, isStreamActive, onLeave }) => {
  return (
    <div className="flex items-center justify-center gap-4 p-2 bg-brand-secondary/80 backdrop-blur-sm rounded-full shadow-2xl">
      {!isStreamActive && (
         <button 
          onClick={onStartStream} 
          title="Start Camera & Mic"
          className="flex items-center gap-2 px-6 py-3 font-semibold text-white bg-green-600 rounded-full shadow-lg hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105"
        >
          <VideoIcon />
          <span>Start Camera & Mic</span>
        </button>
      )}
      <button 
        onClick={onLeave} 
        title="Leave Room"
        className="flex items-center gap-2 px-6 py-3 font-semibold text-white bg-brand-danger rounded-full shadow-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105"
      >
        <PhoneOffIcon />
        <span>Leave Room</span>
      </button>
    </div>
  );
};

export default Controls;
