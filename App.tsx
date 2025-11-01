import React, { useState, useCallback, useEffect } from 'react';
import ChatRoom from './components/ChatRoom';
import useRoomConnection from './hooks/useRoomConnection';
import useMediaStream from './hooks/useMediaStream';
import JoinModal from './components/JoinModal';

const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
    // Read room name from hash on initial load
    if (window.location.hash) {
      setRoomName(decodeURIComponent(window.location.hash.substring(1)));
    }
  }, []);

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
    isConnected,
    isConnecting,
    error: peerError,
    joinRoom,
    isHost,
    kickUser,
  } = useRoomConnection(userInfo?.name, roomName, stream);

  const handleJoin = (name: string) => {
    const info = { name: name.trim() };
    setUserInfo(info);
    
    // If there's no room name from the hash, create one from the user's name
    if (!window.location.hash) {
      const newRoomName = encodeURIComponent(info.name.replace(/\s+/g, '-'));
      window.location.hash = newRoomName;
      setRoomName(newRoomName);
    }
  };

  useEffect(() => {
    // Automatically join room once user info and room name are available
    if (userInfo && roomName && !isConnected && !isConnecting) {
        joinRoom();
    }
  }, [userInfo, roomName, isConnected, isConnecting, joinRoom]);


  const handleLeave = useCallback(() => {
    endCall();
    setUserInfo(null);
    // Clear hash and reload to start fresh
    window.location.hash = '';
    window.location.reload();
  }, [endCall]);

  const error = mediaError || peerError;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h2 className="text-2xl text-brand-danger mb-4">An Error Occurred</h2>
        <p className="max-w-md mb-6">{error}</p>
        <button onClick={() => { window.location.hash = ''; window.location.reload(); }} className="px-6 py-2 bg-brand-accent text-white font-semibold rounded-lg">Start Over</button>
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
          isHost={isHost}
          onKick={kickUser}
        />
      )}
    </div>
  );
};

export default App;