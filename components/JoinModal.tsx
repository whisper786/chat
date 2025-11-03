import React, { useState } from 'react';
import { LoginIcon } from './icons/Icons';

interface JoinModalProps {
  onJoin: (userName: string) => Promise<void>;
}

const JoinModal: React.FC<JoinModalProps> = ({ onJoin }) => {
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && !isJoining) {
      setIsJoining(true);
      try {
        await onJoin(userName.trim());
      } catch (error) {
        console.error("Join failed:", error);
        // Error is handled in App.tsx, but we can reset loading state if we want to allow retry
        setIsJoining(false); 
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-brand-secondary rounded-xl shadow-2xl">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-brand-light">Nexus Chat</h1>
                <p className="mt-2 text-slate-400">Enter your name to join or create a room.</p>
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
                        className="w-full px-4 py-3 text-brand-light bg-brand-primary border border-brand-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-highlight"
                        required
                        minLength={2}
                        autoFocus
                    />
                </div>
                <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-brand-highlight rounded-lg shadow-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:opacity-70 disabled:scale-100"
                    disabled={!userName.trim() || isJoining}
                >
                    {isJoining ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Joining...
                        </>
                    ) : (
                        <>
                            <LoginIcon />
                            Join Room
                        </>
                    )}
                </button>
            </form>
        </div>
    </div>
  );
};

export default JoinModal;