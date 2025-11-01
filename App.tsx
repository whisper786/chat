import React, { useState, useCallback } from 'react';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';
import usePeerConnection from './hooks/usePeerConnection';
import useMediaStream from './hooks/useMediaStream';

const App: React.FC = () => {
  const [userName, setUserName] = useState('');
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
    connectToPeer,
    endCall,
    isConnected,
    isConnecting,
    error: peerError,
  } = usePeerConnection(userName, stream);

  const handleJoin = (name: string) => {
    setUserName(name);
    if (!stream) {
      startStream();
    }
  };

  const handleLeave = useCallback(() => {
    endCall();
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
    <div className="min-h-screen bg-brand-primary font-sans">
      {isConnected && stream ? (
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
        />
      ) : (
        <Lobby
          onJoin={handleJoin}
          myPeerId={myPeerId}
          connectToPeer={connectToPeer}
          isConnecting={isConnecting}
          userNameEntered={!!userName}
        />
      )}
    </div>
  );
};

export default App;