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
    type: 'chat' | 'user-joined' | 'user-left' | 'participant-list' | 'name-taken' | 'all-participants' | 'kick' | 'promote-host' | 'call-request' | 'call-accepted' | 'call-rejected' | 'call-ended';
    payload: any;
}

const PEER_CONFIG = {
  // For development, you can set a high debug level.
  // In production, you'd want to lower or remove this.
  // debug: 3, 
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  },
};


const useRoomConnection = (userName: string | null, roomName: string | null, localStream: MediaStream | null) => {
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  
  const [callState, setCallState] = useState<'idle' | 'outgoing' | 'incoming' | 'connected'>('idle');
  const [callPartner, setCallPartner] = useState<Participant | null>(null);

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

  const resetCallState = useCallback(() => {
    if (callPartner?.id) {
        const call = callsRef.current.get(callPartner.id);
        call?.close();
        callsRef.current.delete(callPartner.id);
    }
    setCallState('idle');
    setCallPartner(null);
  }, [callPartner]);


  const cleanup = useCallback(() => {
    isJoiningRef.current = false;
    resetCallState();
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
  }, [resetCallState]);

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
        if (callPartner?.id === peerId) {
            addMessage(`${name} left, call ended.`);
            resetCallState();
        } else if (reason === 'kicked') {
            addMessage(`${name} was kicked from the room.`);
        } else {
            addMessage(`${name} has left the room.`);
        }
        setParticipants(prev => prev.filter(p => p.id !== peerId));
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
      case 'promote-host': {
          const { peerId, promoterName } = data.payload;
          setParticipants(prev => prev.map(p => p.id === peerId ? { ...p, isHost: true } : p));
          if (peerId === myPeerId) {
              setIsHost(true);
              addMessage(`You were made a host by ${promoterName}.`);
          } else {
              const promotedUser = participants.find(p => p.id === peerId);
              if (promotedUser) {
                  addMessage(`${promotedUser.name} was made a host by ${promoterName}.`);
              }
          }
          break;
      }
      case 'call-request': {
        console.log(`[CALL_DEBUG] ${myPeerId} received call request from ${data.payload.callerId}`);
        if (callState !== 'idle') { // Busy
            console.log(`[CALL_DEBUG] Busy, rejecting call request from ${data.payload.callerId}`);
            conn.send({ type: 'call-rejected', payload: { calleeId: myPeerId, reason: 'busy' } });
            return;
        }
        const caller = participants.find(p => p.id === data.payload.callerId);
        if (caller) {
            setCallPartner(caller);
            setCallState('incoming');
        } else {
            console.warn(`[CALL_DEBUG] Received call request from unknown peer ID: ${data.payload.callerId}`);
        }
        break;
      }
      case 'call-accepted': {
        if (callState === 'outgoing' && callPartner?.id === data.payload.calleeId) {
            console.log(`[CALL_DEBUG] Call accepted by ${data.payload.calleeId}. Placing media call.`);
            setCallState('connected');
            if (localStreamRef.current) {
                const call = peerRef.current!.call(data.payload.calleeId, localStreamRef.current);
                setupMediaConnection(call);
            } else {
                console.error("[CALL_DEBUG] CRITICAL: Cannot make call, localStream is not available.");
                addMessage('Could not start call: your video/mic is not ready.');
                resetCallState();
            }
        }
        break;
      }
      case 'call-rejected': {
        if (callState === 'outgoing' && callPartner?.id === data.payload.calleeId) {
            const reason = data.payload.reason === 'busy' ? 'is busy' : 'declined the call';
            addMessage(`${callPartner.name} ${reason}.`);
            resetCallState();
        }
        break;
      }
      case 'call-ended': {
        if (callPartner?.id === data.payload.fromId) {
             addMessage(`${callPartner.name} ended the call.`);
             resetCallState();
        }
        break;
      }
    }
  };

  const setupDataConnection = (conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);
    conn.on('data', (data: any) => handleIncomingData(data, conn));
    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      if (isHost) {
          const leftParticipant = participants.find(p => p.id === conn.peer);
          if (leftParticipant) {
             broadcast({ type: 'user-left', payload: { peerId: leftParticipant.id, name: leftParticipant.name, reason: 'left' } });
             setParticipants(prev => prev.filter(p => p.id !== conn.peer));
             addMessage(`${leftParticipant.name} has left the room.`);
             if (callPartner?.id === leftParticipant.id) resetCallState();
             callsRef.current.get(conn.peer)?.close();
             callsRef.current.delete(conn.peer);
          }
      }
    });
    conn.on('error', (err) => console.error(`Connection error with ${conn.peer}:`, err));
  };
  
  const setupMediaConnection = (call: MediaConnection) => {
      callsRef.current.set(call.peer, call);
      call.on('stream', (remoteStream) => {
        console.log(`[CALL_DEBUG] Stream received from ${call.peer}`);
        const updateWithStream = (p: Participant) => p.id === call.peer ? { ...p, stream: remoteStream } : p;
        setParticipants(prev => prev.map(updateWithStream));
        setCallPartner(prev => (prev && prev.id === call.peer) ? { ...prev, stream: remoteStream } : prev);
      });
      call.on('close', () => {
          console.log(`[CALL_DEBUG] Media call closed with ${call.peer}`);
          addMessage('Call ended.');
          resetCallState();
      });
      call.on('error', (err) => {
          console.error(`[CALL_DEBUG] Media call error with ${call.peer}:`, err);
          addMessage(`An error occurred during the call.`);
          resetCallState();
      });
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
      console.log(`[CALL_DEBUG] Received incoming media call from ${call.peer}`);
      // Automatically answer incoming calls, as acceptance is handled at the signaling level.
      if (localStreamRef.current) {
        console.log('[CALL_DEBUG] Answering media call with local stream.');
        call.answer(localStreamRef.current);
        setupMediaConnection(call);
      } else {
         console.error("[CALL_DEBUG] CRITICAL: Received a media call but localStream is not available.");
         addMessage('Could not answer call: your video/mic is not ready.');
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
          const newUser: Participant = { id: conn.peer, name: newUserName, isHost: false };
          const currentParticipants = [...participants, newUser];
          
          conn.send({ type: 'all-participants', payload: currentParticipants });
          broadcast({ type: 'user-joined', payload: newUser }, conn.peer);
          
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
      const hostPeer = new Peer(roomName, PEER_CONFIG) as PeerJS;
      peerRef.current = hostPeer;
      hostPeer.on('open', (id) => {
          setIsHost(true);
          setMyPeerId(id);
          const self: Participant = { id, name: userName!, isHost: true };
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

    const guestPeer = new Peer(undefined, PEER_CONFIG) as PeerJS;
    peerRef.current = guestPeer;
    
    guestPeer.on('open', (id) => {
        setMyPeerId(id);
        const hostConnection = guestPeer.connect(roomName, { metadata: { name: userName } });
        hostConnection.on('open', () => setupDataConnection(hostConnection));
        setupPeerListeners(guestPeer);
    });

  }, [userName, roomName, cleanup]);

  useEffect(() => {
    if (localStream && myPeerId && participants.some(p => p.id === myPeerId && p.stream !== localStream)) {
      setParticipants(prev =>
        prev.map(p =>
          p.id === myPeerId ? { ...p, stream: localStream } : p
        )
      );
    }
  }, [localStream, myPeerId, participants]);

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
    if (isHost) {
        broadcast({ type: 'user-left', payload: { peerId: myPeerId, name: userName, reason: 'left' } });
    }
    cleanup();
  }, [cleanup, myPeerId, userName, isHost]);

  const kickUser = useCallback((peerId: string) => {
    if (!isHost) return;
    const conn = connectionsRef.current.get(peerId);
    const participantToKick = participants.find(p => p.id === peerId);

    if (conn && participantToKick) {
        conn.send({ type: 'kick', payload: {} });
        broadcast({ type: 'user-left', payload: { peerId: participantToKick.id, name: participantToKick.name, reason: 'kicked' } });
        setParticipants(prev => prev.filter(p => p.id !== peerId));
        callsRef.current.get(peerId)?.close();
        callsRef.current.delete(peerId);
        setTimeout(() => conn.close(), 100);
        connectionsRef.current.delete(peerId);
    }
  }, [isHost, participants]);
  
  const promoteToHost = useCallback((peerId: string) => {
      if (!isHost || !userName) return;
      
      const payload = { peerId, promoterName: userName };
      broadcast({ type: 'promote-host', payload });
      
      // Also update self
      setParticipants(prev => prev.map(p => p.id === peerId ? { ...p, isHost: true } : p));
      const promotedUser = participants.find(p => p.id === peerId);
      if (promotedUser) {
        addMessage(`${promotedUser.name} was made a host by you.`);
      }

  }, [isHost, userName, participants, addMessage]);

  const makeCall = useCallback((peerId: string) => {
    if (callState !== 'idle' || !myPeerId) return;
    const partner = participants.find(p => p.id === peerId);
    if (partner) {
      console.log(`[CALL_DEBUG] Initiating call from ${myPeerId} to ${peerId}`);
      setCallPartner(partner);
      setCallState('outgoing');
      const conn = connectionsRef.current.get(peerId);
      conn?.send({ type: 'call-request', payload: { callerId: myPeerId } });
    } else {
        console.error(`[CALL_DEBUG] Could not find participant with ID ${peerId} to call.`);
    }
  }, [participants, myPeerId, callState]);

  const answerCall = useCallback(() => {
    if (callState !== 'incoming' || !callPartner || !myPeerId) return;
    console.log(`[CALL_DEBUG] ${myPeerId} is answering call from ${callPartner.id}`);
    const conn = connectionsRef.current.get(callPartner.id);
    conn?.send({ type: 'call-accepted', payload: { calleeId: myPeerId } });
    setCallState('connected');
  }, [callState, callPartner, myPeerId]);

  const rejectCall = useCallback(() => {
    if (callState !== 'incoming' || !callPartner || !myPeerId) return;
    console.log(`[CALL_DEBUG] ${myPeerId} is rejecting call from ${callPartner.id}`);
    const conn = connectionsRef.current.get(callPartner.id);
    conn?.send({ type: 'call-rejected', payload: { calleeId: myPeerId, reason: 'declined' } });
    resetCallState();
  }, [callState, callPartner, myPeerId, resetCallState]);
  
  const hangUp = useCallback(() => {
    if ((callState === 'connected' || callState === 'outgoing') && callPartner) {
        const conn = connectionsRef.current.get(callPartner.id);
        conn?.send({ type: 'call-ended', payload: { fromId: myPeerId } });
    }
    resetCallState();
  }, [callState, callPartner, myPeerId, resetCallState]);


  return { myPeerId, participants, messages, sendMessage, joinRoom, endCall, isConnected, isConnecting, error, isHost, kickUser, promoteToHost, callState, callPartner, makeCall, answerCall, rejectCall, hangUp };
};

export default useRoomConnection;