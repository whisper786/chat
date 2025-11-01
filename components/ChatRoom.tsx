import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Participant, Message } from '../types';
import useMediaStream from '../hooks/useMediaStream';
import ParticipantView from './ParticipantView';
import ParticipantList from './ParticipantList';
import Controls from './Controls';
import DraggableResizableWindow from './DraggableResizableWindow';
import { SendIcon, UsersIcon, CloseIcon } from './icons/Icons';

interface ChatRoomProps {
  roomId: string;
  userName: string;
  isHost: boolean;
  onLeave: () => void;
}

// Mock data for demonstration
const MOCK_PARTICIPANTS: Participant[] = [
  { id: 'user-2', name: 'Alice', isHost: false },
  { id: 'user-3', name: 'Bob', isHost: false },
];

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, userName, isHost, onLeave }) => {
  const { stream, isCameraOn, isMicOn, toggleCamera, toggleMic, error, startStream } = useMediaStream();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [hiddenStreams, setHiddenStreams] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selfName = useMemo(() => isHost ? `${userName} (Host)` : userName, [isHost, userName]);

  const selfParticipant: Participant = useMemo(() => {
    return { id: 'self', name: selfName, isHost, stream: stream ?? undefined };
  }, [stream, isHost, selfName]);

  useEffect(() => {
    // Simulate joining and other participants
    setMessages([
        { id: `msg-${Date.now()}`, type: 'system', text: `You joined the room as "${userName}".` }
    ]);

    setTimeout(() => {
        setParticipants(MOCK_PARTICIPANTS);
        setMessages(prev => [...prev, { id: `msg-${Date.now()+1}`, type: 'system', text: 'Alice has joined the room.' }])
    }, 1000);

    setTimeout(() => {
        setMessages(prev => [...prev, { id: `msg-${Date.now()+2}`, type: 'system', text: 'Bob has joined the room.' }])
    }, 2500);

  }, [roomId, userName]);
  
  const allParticipants = useMemo(() => {
    return [selfParticipant, ...participants];
  }, [selfParticipant, participants]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleKickParticipant = useCallback((participantId: string) => {
    if (!isHost) return;
    const kickedParticipant = participants.find(p => p.id === participantId);
    if (kickedParticipant) {
        setMessages(prev => [...prev, { id: `msg-${Date.now()}`, type: 'system', text: `${kickedParticipant.name} was kicked by the host.` }])
        setParticipants(prev => prev.filter(p => p.id !== participantId));
    }
  }, [isHost, participants]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const message: Message = {
        id: `msg-${Date.now()}`,
        type: 'user',
        senderId: 'self',
        senderName: selfName,
        text: newMessage.trim(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };
  
  const handleToggleCamera = useCallback(async () => {
    if (!stream) {
      await startStream();
    } else {
      toggleCamera();
    }
  }, [stream, startStream, toggleCamera]);
  
  const handleToggleMic = useCallback(async () => {
    if (!stream) {
      await startStream();
    } else {
      toggleMic();
    }
  }, [stream, startStream, toggleMic]);

  const handleCloseStreamWindow = useCallback((participantId: string) => {
    setHiddenStreams(prev => {
        const newSet = new Set(prev);
        newSet.add(participantId);
        return newSet;
    });
  }, []);
  
  const renderMessage = (msg: Message) => {
    if (msg.type === 'system') {
        return (
            <div key={msg.id} className="text-center my-2">
                <span className="text-xs text-slate-400 italic px-2 py-1 bg-slate-800 rounded-full">{msg.text}</span>
            </div>
        );
    }
    // User message
    return (
        <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === 'self' ? 'justify-end' : 'justify-start'}`}>
            {msg.senderId !== 'self' && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0" title={msg.senderName}>
                {msg.senderName?.charAt(0)}
                </div>
            )}
            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.senderId === 'self' ? 'bg-brand-accent text-white rounded-br-none' : 'bg-slate-700 text-brand-light rounded-bl-none'}`}>
                <p className={`text-sm font-bold mb-1 ${msg.senderId === 'self' ? 'hidden' : 'block'}`}>{msg.senderName}</p>
                <p className="text-base break-words">{msg.text}</p>
            </div>
        </div>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h2 className="text-2xl text-brand-danger mb-4">Permission Error</h2>
        <p className="max-w-md mb-6">{error}</p>
        <button onClick={onLeave} className="px-6 py-2 bg-brand-accent text-white font-semibold rounded-lg">Back to Lobby</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-brand-primary">
      <header className="flex items-center justify-between p-4 bg-brand-secondary shadow-md z-20">
        <h1 className="text-xl font-bold text-brand-light">Room: <span className="text-brand-accent">{roomId}</span></h1>
        <div className="flex items-center gap-4">
            <button onClick={handleCopyRoomId} className="px-3 py-1.5 text-sm bg-slate-600 rounded-md hover:bg-slate-500 relative">
            {showCopied ? 'Copied!' : 'Copy Room ID'}
            </button>
            <button 
                onClick={() => setShowParticipants(true)} 
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-600 rounded-md hover:bg-slate-500"
                title="View Participants"
            >
                <UsersIcon className="w-5 h-5" />
                <span>{allParticipants.length}</span>
            </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Draggable Video Windows */}
        {allParticipants
          .filter(p => p.stream && !hiddenStreams.has(p.id))
          .map((p, index) => (
              <DraggableResizableWindow 
                key={p.id} 
                title={p.name}
                initialPosition={{ x: 20 + (index * 40), y: 20 + (index * 40)}}
                initialSize={{ width: 320, height: 180 }}
                onClose={() => handleCloseStreamWindow(p.id)}
              >
                <ParticipantView participant={p} />
              </DraggableResizableWindow>
        ))}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
          {/* Message Input */}
          <div className="p-4 bg-brand-secondary/50 border-t border-slate-700">
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 text-brand-light bg-slate-700 border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <button
                    type="submit"
                    className="w-10 h-10 flex items-center justify-center bg-brand-accent text-white rounded-full hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-brand-secondary transition-transform transform hover:scale-110 disabled:bg-slate-500 disabled:scale-100"
                    aria-label="Send message"
                    disabled={!newMessage.trim()}
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="w-full flex justify-center p-4 bg-brand-secondary/80 backdrop-blur-sm">
        <Controls
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          onToggleCamera={handleToggleCamera}
          onToggleMic={handleToggleMic}
          onLeave={onLeave}
        />
      </footer>

      {/* Participants Modal */}
      {showParticipants && (
        <div 
            className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4"
            onClick={() => setShowParticipants(false)}
        >
            <div 
                className="bg-brand-secondary rounded-lg shadow-xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-brand-light">Participants ({allParticipants.length})</h2>
                    <button 
                        onClick={() => setShowParticipants(false)}
                        className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-600"
                        title="Close"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <ParticipantList
                        participants={allParticipants}
                        isHost={isHost}
                        onKick={handleKickParticipant}
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
