import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../hooks/useRoomConnection';
import type { Participant } from '../types';
import Controls from './Controls';
import ParticipantView from './ParticipantView';
import ChatView from './ChatView';
import DraggableResizableWindow from './DraggableResizableWindow';
import ParticipantList from './ParticipantList';
import { PhoneIcon, VideoIcon } from './icons/Icons';

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
    callState: 'idle' | 'outgoing' | 'incoming' | 'connected';
    callPartner: Participant | null;
    makeCall: (peerId: string) => void;
    answerCall: () => void;
    rejectCall: () => void;
    hangUp: () => void;
}

const RoomHeader: React.FC<{
    otherParticipant: Participant | undefined;
    callState: 'idle' | 'outgoing' | 'incoming' | 'connected';
    makeCall: () => void;
}> = ({ otherParticipant, callState, makeCall }) => {
    let statusText = "Secret Chat Room";
    if (otherParticipant) {
        statusText = otherParticipant.name;
    }
    if (callState === 'outgoing') {
        statusText = `Calling ${otherParticipant?.name}...`;
    } else if (callState === 'connected') {
        statusText = `In call with ${otherParticipant?.name}`;
    }

    return (
        <header className="flex items-center justify-between p-3 bg-brand-secondary border-b border-slate-700 shadow-md z-40">
            <h1 className="text-xl font-bold">{statusText}</h1>
            {otherParticipant && callState === 'idle' && (
                <button
                    onClick={makeCall}
                    title={`Call ${otherParticipant.name}`}
                    className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full hover:bg-green-400 transition-colors"
                >
                    <PhoneIcon className="w-6 h-6 text-white" />
                </button>
            )}
        </header>
    );
};

const IncomingCallAlert: React.FC<{
    callPartner: Participant;
    answerCall: () => void;
    rejectCall: () => void;
}> = ({ callPartner, answerCall, rejectCall }) => {
    return (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-800 p-4 rounded-lg shadow-2xl z-50 flex items-center gap-4 animate-pulse">
            <p className="font-semibold">{callPartner.name} is calling...</p>
            <button onClick={answerCall} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-400">Answer</button>
            <button onClick={rejectCall} className="px-4 py-2 bg-brand-danger text-white rounded-md hover:bg-red-500">Decline</button>
        </div>
    );
};

const CallView: React.FC<{
    localStream: MediaStream | null;
    callPartner: Participant;
    isCameraOn: boolean;
    isMicOn: boolean;
}> = ({ localStream, callPartner, isCameraOn, isMicOn }) => {
    const localVideoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = localVideoRef.current;
        if (!node) return;

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const dragMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e: MouseEvent) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            node.style.top = (node.offsetTop - pos2) + "px";
            node.style.left = (node.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };
        
        node.onmousedown = dragMouseDown;

        return () => {
           node.onmousedown = null;
        }

    }, []);

    return (
        <div className="w-full h-full bg-black flex items-center justify-center relative">
            {/* Remote Video */}
            <div className="w-full h-full">
                <ParticipantView participant={callPartner} />
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div
                ref={localVideoRef}
                className="absolute top-4 right-4 w-48 h-36 z-20 cursor-move shadow-2xl rounded-lg overflow-hidden border-2 border-brand-accent"
                style={{ touchAction: 'none' }}
            >
                {isCameraOn ? (
                    <ParticipantView
                        participant={{ id: 'local', name: 'You', stream: localStream! }}
                        isSelf={true}
                        isMicOn={isMicOn}
                    />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                        Camera Off
                    </div>
                )}
            </div>
        </div>
    );
};


const ChatRoom: React.FC<ChatRoomProps> = (props) => {
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
    const otherParticipant = props.participants.find(p => p.id !== props.myPeerId);

    return (
        <div className="h-screen w-screen flex flex-col bg-brand-primary text-brand-light relative overflow-hidden">
            <RoomHeader
                otherParticipant={otherParticipant}
                callState={props.callState}
                makeCall={() => otherParticipant && props.makeCall(otherParticipant.id)}
            />

            {props.callState === 'incoming' && props.callPartner && (
                <IncomingCallAlert
                    callPartner={props.callPartner}
                    answerCall={props.answerCall}
                    rejectCall={props.rejectCall}
                />
            )}

            {/* Main content area */}
            <main className="flex-1 flex flex-col relative">
                {props.callState === 'connected' && props.callPartner ? (
                    <CallView
                        localStream={props.localStream}
                        callPartner={props.callPartner}
                        isCameraOn={props.isCameraOn}
                        isMicOn={props.isMicOn}
                    />
                ) : (
                    <div className="absolute inset-0 z-0 pb-20">
                        <ChatView messages={props.messages} sendMessage={props.sendMessage} />
                    </div>
                )}

                {isParticipantsOpen && props.myPeerId && (
                    <DraggableResizableWindow
                        title={`Participants (${props.participants.length})`}
                        initialPosition={{ x: window.innerWidth - 400, y: 80 }}
                        initialSize={{ width: 350, height: 400 }}
                        onClose={() => setIsParticipantsOpen(false)}
                    >
                        <ParticipantList
                            participants={props.participants}
                            myPeerId={props.myPeerId}
                            isHost={props.isHost}
                            onKick={props.onKick}
                        />
                    </DraggableResizableWindow>
                )}

            </main>

            {/* Main Controls Overlay */}
            <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                <Controls
                    onLeave={props.onLeave}
                    isMicOn={props.isMicOn}
                    isCameraOn={props.isCameraOn}
                    toggleMic={props.toggleMic}
                    toggleCamera={props.toggleCamera}
                    onToggleParticipants={() => setIsParticipantsOpen(prev => !prev)}
                    callState={props.callState}
                    hangUp={props.hangUp}
                />
            </footer>
        </div>
    );
};

export default ChatRoom;
