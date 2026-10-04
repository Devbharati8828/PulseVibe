import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraEngine } from './CameraEngine.js';
import type { CameraDevice, CameraError, CameraConstraints } from './camera.types.js';

export function useCamera() {
  const [engine] = useState(() => new CameraEngine());
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const devs = await engine.listDevices();
      setDevices(devs);
    } catch (err) {
      console.warn('Failed to list camera devices', err);
    }
  }, [engine]);

  const start = useCallback(async (constraints?: CameraConstraints) => {
    setIsLoading(true);
    setError(null);
    try {
      const newStream = await engine.start(constraints);
      setStream(newStream);
      
      const track = newStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.deviceId) setActiveDeviceId(settings.deviceId);
      }
      
      await loadDevices();
    } catch (err) {
      setError(err as CameraError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [engine, loadDevices]);

  const stop = useCallback(() => {
    engine.stop();
    setStream(null);
    setActiveDeviceId(null);
  }, [engine]);

  const switchDevice = useCallback(async (deviceId: string) => {
    await start({ deviceId });
  }, [start]);

  useEffect(() => {
    // Cleanup on unmount
    return () => stop();
  }, [stop]);

  return {
    engine,
    stream,
    devices,
    activeDeviceId,
    error,
    isLoading,
    start,
    stop,
    switchDevice,
    loadDevices,
  };
}
