import React from 'react';
import type { Message } from '../hooks/useRoomConnection';
import type { Participant } from '../types';
import Controls from './Controls';
import ParticipantView from './ParticipantView';
import ChatView from './ChatView';
import DraggableResizableWindow from './DraggableResizableWindow';

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
}

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
    return (
        <div className="h-screen w-screen flex flex-col bg-brand-primary text-brand-light relative overflow-hidden">
            {/* Chat view as background */}
            <div className="absolute inset-0 z-0 pb-20"> {/* Padding at bottom for controls */}
                <ChatView messages={props.messages} sendMessage={props.sendMessage} />
            </div>

            {/* Video participants as draggable windows */}
            {props.participants.map((p, index) => (
                <DraggableResizableWindow
                    key={p.id}
                    title={p.name + (p.id === props.myPeerId ? ' (You)' : '')}
                    initialPosition={{ x: 50 + (index * 30), y: 50 + (index * 30) }}
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
                />
            </footer>
        </div>
    );
};

export default ChatRoom;