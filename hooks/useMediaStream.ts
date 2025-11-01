import { useState, useEffect, useCallback, useRef } from 'react';

const useMediaStream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startStream = useCallback(async () => {
    // If stream already exists, do nothing.
    if (streamRef.current) return;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraOn(true);
      setIsMicOn(true);
      setError(null);
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
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  return { stream, isCameraOn, isMicOn, toggleCamera, toggleMic, error, startStream };
};

export default useMediaStream;
