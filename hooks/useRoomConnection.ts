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
    type: 'chat' | 'user-joined' | 'user-left' | 'participant-list' | 'name-taken' | 'all-participants' | 'kick';
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

  const addMessage = useCallback((text: string, type: 'system' | 'user' = 'system', senderName?: string, senderId?: string) => {
    const isSelf = senderId === myPeerId;
    setMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random()}`, type, text, senderName, senderId: isSelf ? 'self' : senderId }]);
  }, [myPeerId]);
  
  const broadcast = (data: BroadcastData, exceptPeerId?: string) => {
      connectionsRef.current.forEach((conn, peerId) => {
          if (peerId !== exceptPeerId && conn.open) {
              conn.send(data);
          }
      });
  };

  const cleanup = useCallback(() => {
    isJoiningRef.current = false;
    peerRef.current?.destroy();
    peerRef.current = null;
    connectionsRef.current.forEach(conn => conn.close());
    connectionsRef.current.clear();
    callsRef.current.forEach(call => call.close());
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
        if (participants.every(p => p.id !== newUser.id)) {
            setParticipants(prev => [...prev, newUser]);
            addMessage(`${newUser.name} has joined the room.`);
        }
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
        setError(`The name "${userName}" is already taken in this room. Please choose another name.`);
        cleanup();
        break;
      case 'kick':
        setError('You have been kicked from the room.');
        cleanup();
        break;
       case 'all-participants': { 
          const allParticipants: Participant[] = data.payload;
          setParticipants(allParticipants);
          setIsConnected(true);
          setIsConnecting(false);
          addMessage('Successfully joined the room.');
          allParticipants.forEach(p => {
              if (p.id !== myPeerId && !connectionsRef.current.has(p.id)) {
                  const dataConnection = peerRef.current!.connect(p.id, { metadata: { name: userName } });
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
      // Host handles broadcasting the leave message
      if (isHost) {
          const leftParticipant = participants.find(p => p.id === conn.peer);
          if (leftParticipant) {
             broadcast({ type: 'user-left', payload: { peerId: leftParticipant.id, name: leftParticipant.name } });
             setParticipants(prev => prev.filter(p => p.id !== conn.peer));
             addMessage(`${leftParticipant.name} has left the room.`);
             callsRef.current.get(conn.peer)?.close();
             callsRef.current.delete(conn.peer);
          }
      }
    });
    conn.on('error', (err) => console.error(`Connection error with ${conn.peer}:`, err));
  };
  
  const setupPeerListeners = (p: PeerJS) => {
     p.on('error', (err: any) => {
      if (err.type === 'peer-unavailable' && isJoiningRef.current) {
         becomeHost();
      } else if (err.type === 'network') {
          setError('Cannot connect to the signaling server. Please check your network and try again.');
          cleanup();
      } else if (!p.destroyed) {
        console.error('PeerJS error:', err);
        setError(`A connection error occurred: ${err.message}.`);
        setIsConnecting(false);
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
          broadcast({ type: 'user-joined', payload: newUser }, conn.peer); // Broadcast to others
          
          setParticipants(currentParticipants);
          addMessage(`${newUser.name} has joined the room.`);
        });
      } else { 
        setupDataConnection(conn);
      }
    });
  }

  const becomeHost = () => {
      peerRef.current?.destroy();
      isJoiningRef.current = false;
      addMessage('No one is here... creating a new room!');
      const hostPeer = new Peer(roomName) as PeerJS;
      peerRef.current = hostPeer;
      hostPeer.on('open', (id) => {
          setIsHost(true);
          setMyPeerId(id);
          const self: Participant = { id, name: userName! };
          setParticipants([self]);
          setIsConnecting(false);
          setIsConnected(true);
          addMessage('You are the host. Share the link to invite others.');
          setupPeerListeners(hostPeer);
      });
  };

  const joinRoom = useCallback(() => {
    if (!userName || !roomName || isJoiningRef.current || (peerRef.current && !peerRef.current.destroyed)) return;
    
    cleanup();
    isJoiningRef.current = true;
    setIsConnecting(true);
    setError(null);
    setMessages([{ id: `sys-${Date.now()}`, type: 'system', text: `Joining room: ${roomName}...` }]);

    const guestPeer = new Peer() as PeerJS;
    peerRef.current = guestPeer;
    
    guestPeer.on('open', (id) => {
        setMyPeerId(id);
        const hostConnection = guestPeer.connect(roomName, { metadata: { name: userName } });
        hostConnection.on('open', () => setupDataConnection(hostConnection));
        setupPeerListeners(guestPeer);
    });

  }, [userName, roomName, cleanup]);

  // CRITICAL FIX: This effect ensures the local stream is added to the participant list
  // as soon as it's available, solving the "camera not showing" bug.
  useEffect(() => {
    if (localStream && myPeerId && participants.some(p => p.id === myPeerId)) {
      setParticipants(prev =>
        prev.map(p =>
          p.id === myPeerId ? { ...p, stream: localStream } : p
        )
      );
    }
  }, [localStream, myPeerId, participants.length]);


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
    // Notify others that this user is leaving before cleaning up
    if (isHost) {
        broadcast({ type: 'user-left', payload: { peerId: myPeerId, name: userName } });
    } else {
        // A guest only needs to notify the host
        const hostConn = connectionsRef.current.get(roomName!);
        if (hostConn && hostConn.open) {
            hostConn.close(); // Closing connection will trigger 'close' event on host
        }
    }
    cleanup();
  }, [cleanup, myPeerId, userName, isHost, roomName]);

  const kickUser = useCallback((peerId: string) => {
    if (!isHost) return;
    const conn = connectionsRef.current.get(peerId);
    if (conn) {
        conn.send({ type: 'kick', payload: {} });
        setTimeout(() => conn.close(), 100); // Give time for message to send before closing
    }
  }, [isHost]);

  return { myPeerId, participants, messages, sendMessage, joinRoom, endCall, isConnected, isConnecting, error, isHost, kickUser };
};

export default useRoomConnection;