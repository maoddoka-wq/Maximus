import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

interface VideoAudioTrackProps {
  currentScene: number;
  currentSceneKey: string;
  durations: Record<string, number>;
  muted: boolean;
  paused: boolean;
}

const AUDIO_SOURCE = `${import.meta.env.BASE_URL}audio/composite_audio.mp3`;

export function VideoAudioTrack({
  currentScene,
  currentSceneKey,
  durations,
  muted,
  paused,
}: VideoAudioTrackProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sceneElapsedMs = useRef(0);
  const scenePlayStartedAt = useRef<number | null>(null);
  const [needsAudioGesture, setNeedsAudioGesture] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const { durationMs, sceneOffsetsMs } = useMemo(() => {
    let total = 0;
    const offsets = Object.values(durations).map((duration) => {
      const offset = total;
      total += duration;
      return offset;
    });

    return { durationMs: total, sceneOffsetsMs: offsets };
  }, [durations]);

  const sceneOffsetMs = sceneOffsetsMs[currentScene] ?? 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    sceneElapsedMs.current = 0;
    scenePlayStartedAt.current = null;
    const seekToSceneStart = () => {
      audio.currentTime = Math.min(sceneOffsetMs / 1000, audio.duration || 0);
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      seekToSceneStart();
      return;
    }

    audio.addEventListener('loadedmetadata', seekToSceneStart, { once: true });
    return () => audio.removeEventListener('loadedmetadata', seekToSceneStart);
  }, [currentSceneKey, sceneOffsetMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (paused) {
      if (scenePlayStartedAt.current !== null) {
        sceneElapsedMs.current += performance.now() - scenePlayStartedAt.current;
        scenePlayStartedAt.current = null;
      }
      audio.pause();
      return;
    }

    scenePlayStartedAt.current = performance.now();
    void audio.play().then(
      () => setNeedsAudioGesture(false),
      () => setNeedsAudioGesture(true),
    );
  }, [currentSceneKey, paused]);

  const enableAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || paused || durationMs <= 0) return;

    const activeSceneMs =
      sceneElapsedMs.current +
      (scenePlayStartedAt.current === null
        ? 0
        : performance.now() - scenePlayStartedAt.current);
    const videoTimeMs = (sceneOffsetMs + activeSceneMs) % durationMs;
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      audio.currentTime = videoTimeMs / 1000;
    }
    void audio.play().then(
      () => setNeedsAudioGesture(false),
      () => setNeedsAudioGesture(true),
    );
  }, [durationMs, muted, paused, sceneOffsetMs]);

  return (
    <>
      <audio
        ref={audioRef}
        className="film-audio"
        src={AUDIO_SOURCE}
        preload="auto"
        muted={muted}
        onError={() => setAudioUnavailable(true)}
        aria-label="Voix off et musique du film MAXIMUS ERP"
      />
      {audioUnavailable ? (
        <div className="audio-status" role="status">Piste audio indisponible</div>
      ) : needsAudioGesture && !paused ? (
        <button className="audio-enable" type="button" onClick={enableAudio}>
          <Volume2 aria-hidden="true" size={18} />
          Activer le son
        </button>
      ) : null}
    </>
  );
}
