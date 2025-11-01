import React, { useState } from 'react';
import type { Message } from '../hooks/useRoomConnection';
import type { Participant } from '../types';
import Controls from './Controls';
import ParticipantView from './ParticipantView';
import ChatView from './ChatView';
import DraggableResizableWindow from './DraggableResizableWindow';
import ParticipantList from './ParticipantList';

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
    isHost: boolean;
    onKick: (peerId: string) => void;
}

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

    return (
        <div className="h-screen w-screen flex bg-brand-primary text-brand-light relative overflow-hidden">
            {/* Main content area */}
            <main className="flex-1 flex flex-col relative">
                {/* Chat view as background */}
                <div className="absolute inset-0 z-0 pb-20"> {/* Padding at bottom for controls */}
                    <ChatView messages={props.messages} sendMessage={props.sendMessage} />
                </div>

                {/* Video participants as draggable windows */}
                {props.participants.map((p, index) => (
                    <DraggableResizableWindow
                        key={p.id}
                        title={p.name + (p.id === props.myPeerId ? ' (You)' : '')}
                        initialPosition={{ x: 50 + (index * 40), y: 50 + (index * 40) }}
                        initialSize={{ width: 320, height: 240 }}
                        onClose={() => { /* No-op for now, could hide window in future */ }}
                    >
                        <ParticipantView
                            participant={p}
                            isSelf={p.id === props.myPeerId}
                            isMicOn={p.id === props.myPeerId ? props.isMicOn : undefined}
                        />
                    </DraggableResizableWindow>
                ))}

                {/* Main Controls Overlay */}
                <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                    <Controls
                        onLeave={props.onLeave}
                        isMicOn={props.isMicOn}
                        isCameraOn={props.isCameraOn}
                        toggleMic={props.toggleMic}
                        toggleCamera={props.toggleCamera}
                        onToggleParticipants={() => setIsParticipantsOpen(prev => !prev)}
                    />
                </footer>
            </main>
            
            {/* Participants Sidebar */}
            <aside className={`w-80 bg-brand-secondary/90 backdrop-blur-sm border-l border-slate-700 flex flex-col transition-transform duration-300 ease-in-out ${isParticipantsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {props.myPeerId && (
                    <ParticipantList
                        participants={props.participants}
                        myPeerId={props.myPeerId}
                        isHost={props.isHost}
                        onKick={props.onKick}
                    />
                )}
            </aside>
        </div>
    );
};

export default ChatRoom;