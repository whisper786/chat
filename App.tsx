import React, { useState, useCallback } from 'react';
import ChatRoom from './components/ChatRoom';
import useRoomConnection from './hooks/useRoomConnection';
import useMediaStream from './hooks/useMediaStream';
import JoinModal from './components/JoinModal';

const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<{ name: string; room: string } | null>(null);

  const { 
    stream, 
    isCameraOn, 
    isMicOn, 
    toggleCamera, 
    toggleMic, 
    error: mediaError, 
    startStream 
  } = useMediaStream();
  
  const {
    myPeerId,
    friendStream,
    messages,
    sendMessage,
    endCall,
    isConnected,
    isConnecting,
    error: peerError,
    joinRoom,
  } = useRoomConnection(userInfo?.name, userInfo?.room, stream);

  const handleJoin = (name: string, room: string) => {
    setUserInfo({ name, room });
    joinRoom();
  };

  const handleLeave = useCallback(() => {
    endCall();
    setUserInfo(null);
    // A full reload ensures a clean state for rejoining.
    window.location.reload();
  }, [endCall]);

  const error = mediaError || peerError;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h2 className="text-2xl text-brand-danger mb-4">An Error Occurred</h2>
        <p className="max-w-md mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-brand-accent text-white font-semibold rounded-lg">Reload</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-primary font-sans overflow-hidden">
      {!userInfo ? (
        <JoinModal onJoin={handleJoin} />
      ) : (
        <ChatRoom
          localStream={stream}
          remoteStream={friendStream}
          messages={messages}
          sendMessage={sendMessage}
          onLeave={handleLeave}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          startStream={startStream}
          userName={userInfo.name}
          roomName={userInfo.room}
          isConnecting={isConnecting}
          isConnected={isConnected}
        />
      )}
    </div>
  );
};

export default App;
