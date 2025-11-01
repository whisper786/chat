import React, { useState, useMemo } from 'react';
import type { Message } from '../hooks/useRoomConnection';
import type { Participant } from '../types';
import Controls from './Controls';
import ParticipantView from './ParticipantView';
import ChatView from './ChatView';
import ParticipantList from './ParticipantList';
import { UsersIcon, ChatIcon } from './icons/Icons';

interface ChatRoomProps {
    localStream: MediaStream | null;
    myPeerId: string | null;
    participants: Participant[];
    messages: Message[];
    sendMessage: (text: string) => void;
    onLeave: () => void;
    isMicOn: boolean;
    isCameraOn: boolean;
    toggleMic: () => void;
    toggleCamera: () => void;
    userName: string;
    isConnecting: boolean;
    isConnected: boolean;
    isHost: boolean;
    kickUser: (id: string) => void;
}

type SidebarTab = 'chat' | 'participants';

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');

    const sortedParticipants = useMemo(() => {
        return [...props.participants].sort((a, b) => {
            if (a.id === props.myPeerId) return -1;
            if (b.id === props.myPeerId) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [props.participants, props.myPeerId]);


    return (
        <div className="h-screen w-screen flex flex-col bg-brand-primary text-brand-light">
            <header className="flex-shrink-0 bg-brand-secondary p-2 text-center text-sm shadow-md z-10">
                 {props.isConnecting && <p className="text-yellow-400">Connecting...</p>}
                 {!props.isConnecting && (props.participants.length > 1 ? <p className="text-green-400">Connected with {props.participants.length - 1} other(s)</p> : <p className="text-slate-400">Waiting for others to join...</p>)}
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Video Grid */}
                <div className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 auto-rows-min content-start overflow-y-auto">
                    {sortedParticipants.map(p => (
                        <ParticipantView
                            key={p.id}
                            participant={p}
                            isSelf={p.id === props.myPeerId}
                            isMicOn={p.id === props.myPeerId ? props.isMicOn : undefined}
                            isHost={props.isHost}
                            onKick={props.kickUser}
                        />
                    ))}
                </div>

                {/* Sidebar */}
                <aside className="w-80 bg-brand-secondary flex flex-col border-l border-slate-700">
                    <div className="flex-shrink-0 flex border-b border-slate-700">
                        <button onClick={() => setSidebarTab('chat')} className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 ${sidebarTab === 'chat' ? 'bg-slate-700 text-brand-accent' : 'text-slate-400 hover:bg-slate-800'}`}>
                            <ChatIcon className="w-5 h-5" /> Chat
                        </button>
                        <button onClick={() => setSidebarTab('participants')} className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 ${sidebarTab === 'participants' ? 'bg-slate-700 text-brand-accent' : 'text-slate-400 hover:bg-slate-800'}`}>
                            <UsersIcon className="w-5 h-5" /> Participants ({props.participants.length})
                        </button>
                    </div>

                    {sidebarTab === 'chat' ? (
                        <ChatView messages={props.messages} sendMessage={props.sendMessage} />
                    ) : (
                        <ParticipantList participants={props.participants} myPeerId={props.myPeerId!} isHost={props.isHost} onKick={props.kickUser} />
                    )}
                </aside>
            </main>

            {/* Main Controls */}
            <footer className="flex-shrink-0 flex justify-center p-3 bg-brand-primary/80 backdrop-blur-sm z-10">
                <Controls
                    onLeave={props.onLeave}
                    isMicOn={props.isMicOn}
                    isCameraOn={props.isCameraOn}
                    toggleMic={props.toggleMic}
                    toggleCamera={props.toggleCamera}
                />
            </footer>
        </div>
    );
};

export default ChatRoom;
