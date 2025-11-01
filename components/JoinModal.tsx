import React, { useState } from 'react';
import { LoginIcon } from './icons/Icons';

interface JoinModalProps {
  onJoin: (userName: string, roomName: string) => void;
}

const JoinModal: React.FC<JoinModalProps> = ({ onJoin }) => {
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && roomName.trim()) {
      onJoin(userName.trim(), roomName.trim().replace(/\s+/g, '-').toLowerCase());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-brand-secondary rounded-xl shadow-2xl">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-brand-light">Secret Chat Room</h1>
                <p className="mt-2 text-slate-400">Enter your name and a room name to join or create a room.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="userName" className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                    <input
                        id="userName"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g., Jane Doe"
                        className="w-full px-4 py-3 text-brand-light bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        required
                        minLength={2}
                    />
                </div>
                 <div>
                    <label htmlFor="roomName" className="block text-sm font-medium text-slate-300 mb-2">Room Name</label>
                    <input
                        id="roomName"
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g., my-secret-room"
                        className="w-full px-4 py-3 text-brand-light bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        required
                        minLength={3}
                    />
                </div>
                <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-brand-accent rounded-lg shadow-lg hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:opacity-70 disabled:scale-100"
                    disabled={!userName.trim() || !roomName.trim()}
                >
                    <LoginIcon />
                    Join Room
                </button>
            </form>
        </div>
    </div>
  );
};

export default JoinModal;
