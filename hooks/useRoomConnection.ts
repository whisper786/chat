import { useState, useEffect, useRef, useCallback } from 'react';
import type { Participant } from '../types';

declare const Peer: any;
type PeerJS = import('peerjs').default;
type DataConnection = import('peerjs').DataConnection;
type MediaConnection = import('peerjs').MediaConnection;

export interface Message {
  id: string;
  type: 'user' | 'system';
  senderId?: string;
  senderName?: string;
  text: string;
}

interface BroadcastData {
    type: 'chat' | 'user-joined' | 'user-left' | 'participant-list' | 'name-taken' | 'all-participants';
    payload: any;
}

const useRoomConnection = (userName: string | null, roomName: string | null, localStream: MediaStream | null) => {
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const peerRef = useRef<PeerJS | null>(null);
  const isJoiningRef = useRef(false);

  useEffect(() => {
    if (myPeerId && localStream) {
      setParticipants(prev =>
        prev.map(p => (p.id === myPeerId ? { ...p, stream: localStream } : p))
      );
    }
  }, [localStream, myPeerId]);

  const addMessage = useCallback((text: string, type: 'system' | 'user' = 'system', senderName?: string, senderId?: string) => {
    const isSelf = senderId === myPeerId;
    setMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random()}`, type, text, senderName, senderId: isSelf ? 'self' : senderId }]);
  }, [myPeerId]);
  
  const broadcast = (data: BroadcastData) => {
      connectionsRef.current.forEach(conn => {
          if (conn.open) {
              conn.send(data);
          }
      });
  };

  const cleanup = useCallback(() => {
    isJoiningRef.current = false;
    peerRef.current?.destroy();
    peerRef.current = null;
    connectionsRef.current.clear();
    callsRef.current.clear();
    setIsConnected(false);
    setParticipants([]);
    setIsHost(false);
    setMyPeerId(null);
  }, []);

  const handleIncomingData = (data: BroadcastData, conn: DataConnection) => {
    switch(data.type) {
      case 'chat':
        addMessage(data.payload.text, 'user', data.payload.senderName, data.payload.senderId);
        break;
      case 'user-joined': {
        const newUser: Participant = data.payload;
        setParticipants(prev => [...prev.filter(p => p.id !== newUser.id), newUser]);
        addMessage(`${newUser.name} has joined the room.`);
        break;
      }
      case 'user-left': {
        const { peerId, name } = data.payload;
        setParticipants(prev => prev.filter(p => p.id !== peerId));
        addMessage(`${name} has left the room.`);
        callsRef.current.get(peerId)?.close();
        callsRef.current.delete(peerId);
        break;
      }
      case 'name-taken':
        setError(`The name "${userName}" is already taken. Please choose another name.`);
        cleanup();
        break;
       case 'all-participants': { // Sent from Host to new user
          const allParticipants: Participant[] = data.payload;
          setParticipants(allParticipants);
          setIsConnected(true);
          setIsConnecting(false);
          addMessage('Successfully joined the room.');
          allParticipants.forEach(p => {
              if (p.id !== myPeerId && !connectionsRef.current.has(p.id)) {
                  const dataConnection = peerRef.current!.connect(p.id, { metadata: { name: userName, initial: false } });
                  setupDataConnection(dataConnection);
              }
          });
        }
        break;
    }
  };

  const setupDataConnection = (conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);
    conn.on('data', (data: any) => handleIncomingData(data, conn));
    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      const leftParticipant = participants.find(p => p.id === conn.peer);
      if (leftParticipant) {
          setParticipants(prev => prev.filter(p => p.id !== conn.peer));
          if (isHost) { // Host notifies everyone
             broadcast({ type: 'user-left', payload: { peerId: leftParticipant.id, name: leftParticipant.name } });
          }
          addMessage(`${leftParticipant.name} has left the room.`);
          callsRef.current.get(conn.peer)?.close();
          callsRef.current.delete(conn.peer);
      }
    });
    conn.on('error', (err) => console.error(`Connection error with ${conn.peer}:`, err));
  };
  
  const setupPeerListeners = (p: PeerJS) => {
     p.on('error', (err: any) => {
      if (err.type === 'peer-unavailable' && isJoiningRef.current) {
         becomeHost();
      } else if (!p.destroyed) {
        setError(`Connection error: ${err.message}.`);
        setIsConnecting(false);
      }
    });
    
    p.on('disconnected', () => {
        if (!p.destroyed) {
            setError('Connection to server lost. Attempting to reconnect...');
            p.reconnect();
        }
    });

    p.on('call', (call) => {
      if (localStream) {
        call.answer(localStream);
        callsRef.current.set(call.peer, call);
        call.on('stream', (remoteStream) => {
          setParticipants(prev => prev.map(p => p.id === call.peer ? { ...p, stream: remoteStream } : p));
        });
        call.on('close', () => {
            callsRef.current.delete(call.peer);
            setParticipants(prev => prev.map(p => p.id === call.peer ? { ...p, stream: undefined } : p));
        });
      }
    });
    
     p.on('connection', (conn) => {
      // Host logic for new connections
      if (isHost) {
        const newUserName = conn.metadata.name;
        const nameExists = participants.some(p => p.name.toLowerCase() === newUserName.toLowerCase());
        
        if(nameExists) {
          conn.on('open', () => conn.send({ type: 'name-taken' }));
          setTimeout(() => conn.close(), 100);
          return;
        }

        conn.on('open', () => {
          setupDataConnection(conn);
          const newUser: Participant = { id: conn.peer, name: newUserName };
          const currentParticipants = [...participants, newUser];
          
          conn.send({ type: 'all-participants', payload: currentParticipants });
          broadcast({ type: 'user-joined', payload: newUser });
          
          setParticipants(currentParticipants);
          addMessage(`${newUser.name} has joined the room.`);
        });
      } else { // Guest logic for incoming connections from other guests
        setupDataConnection(conn);
      }
    });
  }

  const becomeHost = () => {
      peerRef.current?.destroy();
      isJoiningRef.current = false;
      addMessage('No room found, creating a new one...');
      const hostPeer = new Peer(roomName) as PeerJS;
      peerRef.current = hostPeer;
      hostPeer.on('open', (id) => {
          setIsHost(true);
          setMyPeerId(id);
          const self: Participant = { id, name: userName! };
          setParticipants([self]);
          setIsConnecting(false);
          setIsConnected(true);
          addMessage('You are the host. Waiting for others to join.');
          setupPeerListeners(hostPeer);
      });
  };

  const joinRoom = useCallback(() => {
    if (!userName || !roomName || isJoiningRef.current) return;
    
    cleanup();
    isJoiningRef.current = true;
    setIsConnecting(true);
    setError(null);
    setMessages([{ id: `sys-${Date.now()}`, type: 'system', text: `Attempting to join room: ${roomName}` }]);

    const guestPeer = new Peer() as PeerJS;
    peerRef.current = guestPeer;
    
    guestPeer.on('open', (id) => {
        setMyPeerId(id);
        const hostConnection = guestPeer.connect(roomName, { metadata: { name: userName } });
        hostConnection.on('open', () => setupDataConnection(hostConnection));
        setupPeerListeners(guestPeer);
    });

  }, [userName, roomName, cleanup]);

  useEffect(() => {
    if (isConnected && localStream && peerRef.current) {
        participants.forEach(p => {
            if (p.id !== myPeerId && !callsRef.current.has(p.id)) {
                const call = peerRef.current!.call(p.id, localStream);
                if (call) {
                    callsRef.current.set(p.id, call);
                    call.on('stream', (remoteStream) => {
                        setParticipants(prev => prev.map(user => user.id === p.id ? { ...user, stream: remoteStream } : user));
                    });
                }
            }
        });
    }
  }, [participants, localStream, isConnected, myPeerId]);
  
  const sendMessage = useCallback((text: string) => {
      const message: Message = {
        id: `msg-${Date.now()}`,
        type: 'user',
        senderId: myPeerId!,
        senderName: userName || 'User',
        text: text.trim(),
      };
      broadcast({type: 'chat', payload: message});
      addMessage(message.text, 'user', message.senderName, message.senderId);
  }, [myPeerId, userName, addMessage]);
  
  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return { myPeerId, participants, messages, sendMessage, joinRoom, endCall, isConnected, isConnecting, error };
};

export default useRoomConnection;