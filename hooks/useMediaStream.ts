import { useState, useCallback, useRef } from 'react';

const useMediaStream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initializeStream = useCallback(async () => {
    if (streamRef.current) return true;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = mediaStream;

      // Disable tracks by default, user will enable them via UI
      mediaStream.getVideoTracks().forEach(track => track.enabled = false);
      mediaStream.getAudioTracks().forEach(track => track.enabled = false);
      
      setStream(mediaStream);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error accessing media devices.', err);
      if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setError('Permission to access camera and microphone was denied. Please allow access in your browser settings and try again.');
          } else {
               setError(`Error accessing media devices: ${err.message}. Please ensure your camera/microphone is connected and not in use by another application.`);
          }
      } else {
          setError('An unknown error occurred while trying to access media devices.');
      }
      return false;
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const success = await initializeStream();
    if (!success || !streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  }, [initializeStream]);

  const toggleMic = useCallback(async () => {
    const success = await initializeStream();
    if (!success || !streamRef.current) return;
    
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  }, [initializeStream]);

  return { stream, isCameraOn, isMicOn, toggleCamera, toggleMic, error, initializeStream };
};

export default useMediaStream;
