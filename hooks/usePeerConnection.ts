import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '../types';

// Since we're loading PeerJS from a CDN, we need to declare its type for TypeScript
declare const Peer: any;
type PeerJS = import('peerjs').default;
type DataConnection = import('peerjs').DataConnection;
type MediaConnection = import('peerjs').MediaConnection;

const usePeerConnection = (userName: string, localStream: MediaStream | null) => {
  const [peer, setPeer] = useState<PeerJS | null>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [friendStream, setFriendStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  useEffect(() => {
    if (!userName || !localStream) return;

    try {
      // For production, you'd want your own PeerServer. For this demo, the public one is fine.
      const newPeer = new Peer() as PeerJS;

      newPeer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        setMyPeerId(id);
        setIsConnecting(false);
        setMessages([{ id: `sys-${Date.now()}`, type: 'system', text: 'Ready to connect.' }]);
      });

      newPeer.on('connection', (conn) => {
        console.log('Incoming data connection');
        dataConnectionRef.current = conn;
        conn.on('data', (data: any) => {
          setMessages(prev => [...prev, data as Message]);
        });
        conn.on('open', () => {
          setIsConnected(true);
          setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'Friend connected.' }]);
        });
      });

      newPeer.on('call', (call) => {
        console.log('Incoming call');
        call.answer(localStream);
        call.on('stream', (remoteStream) => {
          setFriendStream(remoteStream);
        });
        callRef.current = call;
      });

      newPeer.on('error', (err: any) => {
        console.error('PeerJS error:', err);
        setError(`Connection error: ${err.message}. Your friend might have disconnected.`);
        setIsConnected(false);
        setIsConnecting(false);
      });
      
      newPeer.on('disconnected', () => {
        setError('Connection lost. Please reconnect.');
        setIsConnected(false);
      });

      setPeer(newPeer);

      return () => {
        console.log("Cleaning up PeerJS connection");
        newPeer.destroy();
      };
    } catch (e) {
      console.error("Failed to initialize PeerJS", e);
      setError("Could not initialize connection client. Your browser might not be supported.");
      setIsConnecting(false);
    }
  }, [userName, localStream]);

  const connectToPeer = useCallback((friendId: string) => {
    if (!peer || !localStream) return;

    console.log(`Connecting to peer: ${friendId}`);
    
    const dataConnection = peer.connect(friendId);
    dataConnectionRef.current = dataConnection;
    dataConnection.on('data', (data: any) => {
      setMessages(prev => [...prev, data as Message]);
    });
    dataConnection.on('open', () => {
      setIsConnected(true);
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'Connected to friend.' }]);
    });
    
    const call = peer.call(friendId, localStream);
    call.on('stream', (remoteStream) => {
      setFriendStream(remoteStream);
    });
    callRef.current = call;

  }, [peer, localStream]);
  
  const sendMessage = useCallback((text: string) => {
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      const message: Message = {
        id: `msg-${Date.now()}`,
        type: 'user',
        senderId: myPeerId!,
        senderName: userName,
        text: text.trim(),
      };
      dataConnectionRef.current.send(message);
      // Add own message to local state immediately
      setMessages(prev => [...prev, {...message, senderId: 'self' }]);
    }
  }, [myPeerId, userName]);

  const endCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.close();
    }
    if (dataConnectionRef.current) {
      dataConnectionRef.current.close();
    }
    peer?.destroy();
    setIsConnected(false);
    setFriendStream(null);
    setMessages([]);
    // Reloading is a simple way to reset the app state to the lobby
    window.location.reload();
  }, [peer]);

  return { peer, myPeerId, friendStream, messages, sendMessage, connectToPeer, endCall, isConnected, isConnecting, error };
};

export default usePeerConnection;
