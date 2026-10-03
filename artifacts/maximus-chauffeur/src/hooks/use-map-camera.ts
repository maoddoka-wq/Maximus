import { useMemo, useRef, useState } from 'react';
import { PanResponder, type GestureResponderEvent } from 'react-native';
import {
  gestureCamera,
  zoomCamera,
  type MapCamera,
  type MapPixel,
  type MapSize,
} from '../lib/map-camera';

type GestureSession = { camera: MapCamera; size: MapSize; touches: MapPixel[] };

function touchPoints(event: GestureResponderEvent): MapPixel[] {
  return event.nativeEvent.touches.slice(0, 2).map((touch) => ({
    x: touch.locationX,
    y: touch.locationY,
  }));
}

export function useMapCamera(tripId: string, automatic: MapCamera | null, size: MapSize) {
  const [manual, setManual] = useState<{ tripId: string; camera: MapCamera } | null>(null);
  const camera = manual?.tripId === tripId ? manual.camera : automatic;
  const latest = useRef({ tripId, camera, size });
  latest.current = { tripId, camera, size };
  const session = useRef<GestureSession | null>(null);

  const handlers = useMemo(() => {
    const commit = (next: MapCamera) => {
      latest.current.camera = next;
      setManual({ tripId: latest.current.tripId, camera: next });
    };
    const begin = (event: GestureResponderEvent) => {
      const current = latest.current;
      const touches = touchPoints(event);
      session.current = current.camera && touches.length
        ? { camera: current.camera, size: current.size, touches }
        : null;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.camera !== null,
      onMoveShouldSetPanResponder: () => latest.current.camera !== null,
      onPanResponderGrant: begin,
      onPanResponderStart: begin,
      onPanResponderMove: (event) => {
        const touches = touchPoints(event);
        const initial = session.current;
        if (!initial || touches.length !== initial.touches.length) {
          begin(event);
          return;
        }
        commit(gestureCamera(initial.camera, initial.size, initial.touches, touches));
      },
      // Rebase when a finger is added/removed, preventing jumps between pan and pinch.
      onPanResponderEnd: begin,
      onPanResponderRelease: () => { session.current = null; },
      onPanResponderTerminate: () => { session.current = null; },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }).panHandlers;
  }, []);

  return {
    camera,
    handlers,
    zoom: (delta: number) => {
      if (!latest.current.camera) return;
      const next = zoomCamera(latest.current.camera, delta);
      latest.current.camera = next;
      setManual({ tripId: latest.current.tripId, camera: next });
    },
    recenter: () => {
      session.current = null;
      latest.current.camera = automatic;
      setManual(null);
    },
  };
}