import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const deviceId = useSettingsStore(state => state.cameraDeviceId);
  const setDeviceId = useSettingsStore(state => state.setCameraDeviceId);

  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission first
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        // Auto-select first device if none selected
        if (!deviceId && videoDevices.length > 0) {
          setDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get camera devices'));
      }
    }
    getDevices();
  }, [deviceId, setDeviceId]);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    
    async function startStream() {
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        currentStream = newStream;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to access camera'));
      }
    }

    if (deviceId) {
      startStream();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [deviceId]);

  return { stream, error, devices, isReady: !!stream };
}
