import React, { useState, useCallback } from 'react';
import ChatRoom from './components/ChatRoom';
import useRoomConnection from './hooks/useRoomConnection';
import useMediaStream from './hooks/useMediaStream';
import JoinModal from './components/JoinModal';

const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);
  const ROOM_NAME = 'global-secret-chat-room'; // Hardcoded room name

  const { 
    stream, 
    isCameraOn, 
    isMicOn, 
    toggleCamera, 
    toggleMic, 
    error: mediaError 
  } = useMediaStream();
  
  const {
    myPeerId,
    participants,
    messages,
    sendMessage,
    endCall,
    kickUser,
    isHost,
    isConnected,
    isConnecting,
    error: peerError,
    joinRoom,
  } = useRoomConnection(userInfo?.name, ROOM_NAME, stream);

  const handleJoin = (name: string) => {
    setUserInfo({ name });
    joinRoom();
  };

  const handleLeave = useCallback(() => {
    endCall();
    setUserInfo(null);
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
          myPeerId={myPeerId}
          participants={participants}
          messages={messages}
          sendMessage={sendMessage}
          onLeave={handleLeave}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          userName={userInfo.name}
          isConnecting={isConnecting}
          isConnected={isConnected}
          isHost={isHost}
          kickUser={kickUser}
        />
      )}
    </div>
  );
};

export default App;
