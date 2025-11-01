import { useState, useEffect, useRef, useCallback } from 'react';

// Since we're loading PeerJS from a CDN, we need to declare its type for TypeScript
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

const useRoomConnection = (userName: string | null, roomName: string | null, localStream: MediaStream | null) => {
  const [peer, setPeer] = useState<PeerJS | null>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [friendStream, setFriendStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const isHostRef = useRef(false);
  const peerRef = useRef<PeerJS | null>(null);

  const cleanup = () => {
    if (callRef.current) {
      callRef.current.close();
    }
    if (dataConnectionRef.current) {
      dataConnectionRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    callRef.current = null;
    dataConnectionRef.current = null;
    peerRef.current = null;
    setPeer(null);
    setIsConnected(false);
    setFriendStream(null);
  };

  const setupPeerListeners = (p: PeerJS) => {
    p.on('connection', (conn) => {
      console.log('Incoming data connection');
      dataConnectionRef.current = conn;
      conn.on('data', (data: any) => {
        setMessages(prev => [...prev, data as Message]);
      });
      conn.on('open', () => {
        setIsConnected(true);
        setIsConnecting(false);
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'Friend has joined the room.' }]);
      });
      conn.on('close', () => {
        setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'Friend has left the room.' }]);
        setIsConnected(false);
        setFriendStream(null);
      });
    });

    p.on('call', (call) => {
      console.log('Incoming call');
      if (localStream) {
        call.answer(localStream);
        call.on('stream', (remoteStream) => {
          setFriendStream(remoteStream);
        });
        callRef.current = call;
      } else {
        console.log("No local stream to answer call with");
      }
    });

    p.on('error', (err: any) => {
      console.error('PeerJS error:', err);
      if (err.type === 'peer-unavailable') {
         // This is expected if we are the first to join. We will become the host.
         console.log('Peer not available, creating room...');
         isHostRef.current = true;
         const hostPeer = new Peer(roomName) as PeerJS;
         setMyPeerId(hostPeer.id);
         setPeer(hostPeer);
         peerRef.current = hostPeer;
         setupPeerListeners(hostPeer);
      } else {
        setError(`Connection error: ${err.message}. Your friend might have disconnected.`);
      }
      setIsConnecting(false);
    });

    p.on('disconnected', () => {
      setError('Connection lost. Please try rejoining the room.');
      setIsConnected(false);
    });
  }

  const joinRoom = useCallback(() => {
    if (!userName || !roomName) return;
    
    setIsConnecting(true);
    setMessages([{ id: `sys-${Date.now()}`, type: 'system', text: `Attempting to join room: ${roomName}...` }]);

    // Guest peer with random ID
    const guestPeer = new Peer() as PeerJS;
    peerRef.current = guestPeer;
    
    guestPeer.on('open', (id) => {
        setMyPeerId(id);

        console.log(`Trying to connect to host: ${roomName}`);
        const dataConnection = guestPeer.connect(roomName);
        dataConnectionRef.current = dataConnection;
        
        dataConnection.on('open', () => {
            console.log('Data connection opened with host');
            setIsConnected(true);
            setIsConnecting(false);
            setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'Successfully joined the room.' }]);
            if (localStream) {
                const call = guestPeer.call(roomName, localStream);
                call.on('stream', (remoteStream) => {
                    setFriendStream(remoteStream);
                });
                callRef.current = call;
            }
        });
        
        dataConnection.on('data', (data: any) => {
           setMessages(prev => [...prev, data as Message]);
        });
        
        dataConnection.on('close', () => {
          setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'Friend has left the room.' }]);
          setIsConnected(false);
          setFriendStream(null);
        });

        setPeer(guestPeer);
        setupPeerListeners(guestPeer);
    });

  }, [userName, roomName, localStream]);

  // Effect to re-attempt call when localStream becomes available
  useEffect(() => {
      if (isConnected && localStream && !callRef.current && dataConnectionRef.current) {
          console.log("Local stream is ready, initiating call.");
          const call = peerRef.current?.call(dataConnectionRef.current.peer, localStream);
          if (call) {
            call.on('stream', (remoteStream) => {
                setFriendStream(remoteStream);
            });
            callRef.current = call;
          }
      }
  }, [localStream, isConnected]);
  
  const sendMessage = useCallback((text: string) => {
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      const message: Message = {
        id: `msg-${Date.now()}`,
        type: 'user',
        senderId: myPeerId!,
        senderName: userName || 'User',
        text: text.trim(),
      };
      dataConnectionRef.current.send(message);
      setMessages(prev => [...prev, {...message, senderId: 'self' }]);
    }
  }, [myPeerId, userName]);

  const endCall = useCallback(() => {
    cleanup();
  }, []);

  return { myPeerId, friendStream, messages, sendMessage, joinRoom, endCall, isConnected, isConnecting, error };
};

export default useRoomConnection;
