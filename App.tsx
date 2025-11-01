
import React, { useState, useCallback } from 'react';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';

const App: React.FC = () => {
  const [room, setRoom] = useState<{ id: string; userName: string; isHost: boolean } | null>(null);

  const handleJoinRoom = useCallback((roomId: string, userName: string, isHost: boolean) => {
    setRoom({ id: roomId, userName, isHost });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setRoom(null);
  }, []);

  return (
    <div className="min-h-screen bg-brand-primary font-sans">
      {room ? (
        <ChatRoom 
          roomId={room.id} 
          userName={room.userName}
          isHost={room.isHost} 
          onLeave={handleLeaveRoom} 
        />
      ) : (
        <Lobby onJoin={handleJoinRoom} />
      )}
    </div>
  );
};

export default App;
