import React, { useState } from 'react';
import type { Message } from '../hooks/useRoomConnection';
import Controls from './Controls';
import ParticipantView from './ParticipantView';
import DraggableResizableWindow from './DraggableResizableWindow';
import ChatView from './ChatView';

interface ChatRoomProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    messages: Message[];
    sendMessage: (text: string) => void;
    onLeave: () => void;
    isMicOn: boolean;
    isCameraOn: boolean;
    toggleMic: () => void;
    toggleCamera: () => void;
    startStream: () => void;
    userName: string;
    roomName: string;
    isConnecting: boolean;
    isConnected: boolean;
}

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
    const [showSelfView, setShowSelfView] = useState(true);
    const [showFriendView, setShowFriendView] = useState(true);
    const [showChat, setShowChat] = useState(true);
    
    return (
        <div className="h-screen w-screen relative bg-brand-primary text-brand-light overflow-hidden">
            {/* Connection Status */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-brand-secondary px-4 py-2 rounded-lg shadow-lg text-sm z-50">
                <p>Room: <span className="font-bold text-brand-accent">{props.roomName}</span></p>
                {props.isConnecting && <p className="text-yellow-400">Connecting...</p>}
                {props.isConnected ? <p className="text-green-400">Connected</p> : <p className="text-slate-400">Waiting for friend...</p>}
            </div>

            {/* Draggable Windows */}
            {showSelfView && props.localStream && (
                <DraggableResizableWindow
                    title={`${props.userName} (You)`}
                    onClose={() => setShowSelfView(false)}
                    initialPosition={{ x: 20, y: 80 }}
                >
                    <ParticipantView
                        participant={{ id: 'self', stream: props.localStream }}
                        isMicOn={props.isMicOn}
                        isCameraOn={props.isCameraOn}
                        toggleMic={props.toggleMic}
                        toggleCamera={props.toggleCamera}
                        isSelf={true}
                    />
                </DraggableResizableWindow>
            )}

            {showFriendView && props.remoteStream && (
                 <DraggableResizableWindow
                    title="Friend"
                    onClose={() => setShowFriendView(false)}
                    initialPosition={{ x: 380, y: 80 }}
                    initialSize={{ width: 480, height: 270 }}
                >
                    <ParticipantView participant={{ id: 'remote', stream: props.remoteStream }} />
                </DraggableResizableWindow>
            )}

            {showChat && (
                <DraggableResizableWindow
                    title="Chat"
                    onClose={() => setShowChat(false)}
                    initialPosition={{ x: 20, y: 400 }}
                    initialSize={{ width: 320, height: 400 }}
                >
                   <ChatView messages={props.messages} sendMessage={props.sendMessage} />
                </DraggableResizableWindow>
            )}

            {/* Main Controls */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 bg-gradient-to-t from-black/80 to-transparent z-40">
                <Controls
                    onLeave={props.onLeave}
                    onStartStream={props.startStream}
                    isStreamActive={!!props.localStream}
                />
            </div>
        </div>
    );
};

export default ChatRoom;
