import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';
import Controls from './Controls';
import ParticipantView from './ParticipantView';
import { SendIcon } from './icons/Icons';

interface ChatRoomProps {
    localStream: MediaStream;
    remoteStream: MediaStream | null;
    messages: Message[];
    sendMessage: (text: string) => void;
    onLeave: () => void;
    isMicOn: boolean;
    isCameraOn: boolean;
    toggleMic: () => void;
    toggleCamera: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
    localStream,
    remoteStream,
    messages,
    sendMessage,
    onLeave,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera
}) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        sendMessage(newMessage);
        setNewMessage('');
    };

    const renderMessage = (msg: Message) => {
        if (msg.type === 'system') {
            return (
                <div key={msg.id} className="text-center my-2">
                    <span className="text-xs text-slate-400 italic px-2 py-1 bg-slate-800 rounded-full">{msg.text}</span>
                </div>
            );
        }
        // User message
        const isSelf = msg.senderId === 'self';
        return (
            <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                 {!isSelf && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0" title={msg.senderName}>
                    {msg.senderName?.charAt(0)}
                    </div>
                )}
                <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isSelf ? 'bg-brand-accent text-white rounded-br-none' : 'bg-slate-700 text-brand-light rounded-bl-none'}`}>
                    <p className={`text-sm font-bold mb-1 ${isSelf ? 'hidden' : 'block'}`}>{msg.senderName}</p>
                    <p className="text-base break-words">{msg.text}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-brand-primary text-brand-light">
            {/* Main Video and Chat Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Remote Video */}
                <div className="flex-1 bg-black flex items-center justify-center">
                    <ParticipantView participant={{ id: 'remote', name: 'Friend', isHost: false, stream: remoteStream }} />
                </div>

                {/* Self Video (Picture-in-Picture style) */}
                <div className="absolute top-4 right-4 w-40 h-auto md:w-64 aspect-video rounded-lg shadow-2xl overflow-hidden border-2 border-slate-700 z-10">
                    <ParticipantView participant={{ id: 'self', name: 'You', isHost: true, stream: localStream }} />
                </div>
                
                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                    <Controls
                        isCameraOn={isCameraOn}
                        isMicOn={isMicOn}
                        onToggleCamera={toggleMic}
                        onToggleMic={toggleCamera}
                        onLeave={onLeave}
                    />
                </div>
            </main>

            {/* Chat Sidebar */}
            <aside className="w-80 md:w-96 bg-brand-secondary flex flex-col border-l border-slate-700">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold">Chat</h2>
                </div>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            </aside>
        </div>
    );
};

export default ChatRoom;