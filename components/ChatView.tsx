import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../hooks/useRoomConnection';
import { SendIcon } from './icons/Icons';

interface ChatViewProps {
    messages: Message[];
    sendMessage: (text: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ messages, sendMessage }) => {
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
        
        const isSelf = msg.senderId === 'self';
        return (
            <div key={msg.id} className={`flex items-end gap-2 my-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                 {!isSelf && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0" title={msg.senderName}>
                        {msg.senderName?.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow ${isSelf ? 'bg-brand-accent text-white' : 'bg-slate-700 text-brand-light'}`}>
                    {!isSelf && <p className="text-sm font-bold mb-1 text-sky-300">{msg.senderName}</p>}
                    <p className="text-base break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
            </div>
        );
    };
    
    return (
        <div className="w-full h-full bg-brand-primary flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
            </div>
            {/* Message Input */}
            <div className="p-2 bg-brand-secondary/50 border-t border-slate-700">
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
    );
};

export default ChatView;