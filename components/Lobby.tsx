import React, { useState, useCallback } from 'react';
import { LoginIcon, CopyIcon } from './icons/Icons';

interface LobbyProps {
  onJoin: (userName: string) => void;
  myPeerId: string | null;
  connectToPeer: (peerId: string) => void;
  isConnecting: boolean;
  userNameEntered: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ onJoin, myPeerId, connectToPeer, isConnecting, userNameEntered }) => {
  const [userName, setUserName] = useState('');
  const [friendId, setFriendId] = useState('');
  const [showCopied, setShowCopied] = useState(false);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      onJoin(userName.trim());
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (friendId.trim()) {
      connectToPeer(friendId.trim());
    }
  };
  
  const handleCopyId = () => {
    if (!myPeerId) return;
    navigator.clipboard.writeText(myPeerId);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  if (!userNameEntered) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 space-y-8 bg-brand-secondary rounded-xl shadow-2xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-brand-light">Secret Chat Room</h1>
            <p className="mt-2 text-slate-400">Enter your name to get started.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-6">
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
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-brand-accent rounded-lg shadow-lg hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:opacity-70 disabled:scale-100"
              disabled={!userName.trim()}
            >
              <LoginIcon />
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
     <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-brand-secondary rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-light">Ready to Connect</h1>
          <p className="mt-2 text-slate-400">Share your ID with a friend, or enter their ID to connect.</p>
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Your Connection ID</label>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    readOnly
                    value={isConnecting ? 'Generating ID...' : myPeerId || 'Error...'}
                    className="w-full px-4 py-3 text-brand-light bg-slate-800 border border-slate-600 rounded-lg focus:outline-none truncate"
                />
                <button
                    onClick={handleCopyId}
                    disabled={isConnecting || !myPeerId}
                    className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50"
                    title="Copy ID"
                >
                    <CopyIcon />
                </button>
            </div>
             {showCopied && <p className="text-sm text-green-400 text-center">ID Copied!</p>}
        </div>

        <div className="text-center text-slate-400 font-bold">OR</div>
        
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label htmlFor="friendId" className="block text-sm font-medium text-slate-300 mb-2">Friend's Connection ID</label>
            <input
              id="friendId"
              type="text"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
              placeholder="Paste your friend's ID here"
              className="w-full px-4 py-3 text-brand-light bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-brand-accent rounded-lg shadow-lg hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:opacity-70 disabled:scale-100"
            disabled={!friendId.trim() || isConnecting}
          >
            Connect
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center pt-4">You will automatically join the call when a friend connects to you using your ID.</p>
      </div>
    </div>
  );
};

export default Lobby;