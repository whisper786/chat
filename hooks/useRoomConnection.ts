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
  const localStreamRef = useRef(localStream);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

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
        const { peerId, name, reason } = data.payload;
        setParticipants(prev => prev.filter(p => p.id !== peerId));
        if (reason === 'kicked') {
            addMessage(`${name} was kicked from the room.`);
        } else {
            addMessage(`${name} has left the room.`);
        }
        callsRef.current.get(peerId)?.close();
        callsRef.current.delete(peerId);
        break;
      }
      case 'name-taken':
        setError(`The name "${userName}" is already taken in this room. Please choose another name.`);
        cleanup();
        break;
      case 'kick':
        setError('You have been kicked from the room by the host.');
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
      // Host handles broadcasting the leave message for graceful leaves.
      // Kicked users are handled separately for immediate feedback.
      if (isHost) {
          const leftParticipant = participants.find(p => p.id === conn.peer);
          if (leftParticipant) { // Check if they haven't been removed already (e.g., by kick)
             broadcast({ type: 'user-left', payload: { peerId: leftParticipant.id, name: leftParticipant.name, reason: 'left' } });
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
      // CRITICAL FIX: Use the ref to get the most up-to-date stream.
      // This prevents answering a call with a null stream if the call
      // event fires before React has re-rendered with the stream state.
      if (localStreamRef.current) {
        call.answer(localStreamRef.current);
        callsRef.current.set(call.peer, call);
        call.on('stream', (remoteStream) => {
          setParticipants(prev => prev.map(p => p.id === call.peer ? { ...p, stream: remoteStream } : p));
        });
        call.on('close', () => {
            callsRef.current.delete(call.peer);
            setParticipants(prev => prev.map(p => p.id === call.peer ? { ...p, stream: undefined } : p));
        });
      } else {
          console.error("CRITICAL: Received a call but localStream is not available. This can cause one-way audio/video.");
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

  // This effect ensures the local participant object always has the latest stream.
  useEffect(() => {
    if (localStream && myPeerId && participants.some(p => p.id === myPeerId && p.stream !== localStream)) {
      setParticipants(prev =>
        prev.map(p =>
          p.id === myPeerId ? { ...p, stream: localStream } : p
        )
      );
    }
  }, [localStream, myPeerId, participants]);


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
      if (!text.trim() || !myPeerId) return;
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
        broadcast({ type: 'user-left', payload: { peerId: myPeerId, name: userName, reason: 'left' } });
    } else {
        const hostConn = connectionsRef.current.get(roomName!);
        if (hostConn && hostConn.open) {
            hostConn.close();
        }
    }
    cleanup();
  }, [cleanup, myPeerId, userName, isHost, roomName]);

  const kickUser = useCallback((peerId: string) => {
    if (!isHost) return;
    const conn = connectionsRef.current.get(peerId);
    const participantToKick = participants.find(p => p.id === peerId);

    if (conn && participantToKick) {
        // 1. Send kick message to the user
        conn.send({ type: 'kick', payload: {} });

        // 2. Immediately update local state and broadcast to others
        broadcast({ type: 'user-left', payload: { peerId: participantToKick.id, name: participantToKick.name, reason: 'kicked' } });
        setParticipants(prev => prev.filter(p => p.id !== peerId));
        callsRef.current.get(peerId)?.close();
        callsRef.current.delete(peerId);

        // 3. Close the connection after a short delay to ensure message delivery
        setTimeout(() => conn.close(), 100);
        connectionsRef.current.delete(peerId);
    }
  }, [isHost, participants]);

  return { myPeerId, participants, messages, sendMessage, joinRoom, endCall, isConnected, isConnecting, error, isHost, kickUser };
};

export default useRoomConnection;