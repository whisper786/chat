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
    error: mediaError,
    initializeStream
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

  const handleJoin = async (name: string) => {
    // This function's only job is to get permissions and set state.
    // The useEffect hook will handle the logic to join the room once all states are ready.
    const streamReady = await initializeStream();
    if (!streamReady) {
        // Error is set in the hook, UI will update.
        return; 
    }

    const info = { name: name.trim() };
    setUserInfo(info);
    
    // If there's no room name from the hash, create one.
    if (!window.location.hash) {
      const newRoomName = encodeURIComponent(info.name.replace(/\s+/g, '-').toLowerCase());
      window.location.hash = newRoomName;
      setRoomName(newRoomName);
    }
  };
  
  useEffect(() => {
    // CRITICAL FIX: The connection process should only start when the stream, user info,
    // and room name are all available. This prevents race conditions where PeerJS
    // tries to establish connections before the media stream is ready to be sent.
    if (stream && userInfo && roomName && !isConnected && !isConnecting) {
        joinRoom();
    }
  }, [stream, userInfo, roomName, isConnected, isConnecting, joinRoom]);


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