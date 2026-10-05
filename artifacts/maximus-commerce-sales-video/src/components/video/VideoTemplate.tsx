import { useEffect, useRef, type ComponentType } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  VideoCanvas,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  opening: 6000,
  storefront: 7000,
  counter: 7000,
  activity: 7000,
  reports: 8000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '9:16';
const AUDIO_SEEK_EPSILON_SEC = 0.18;

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  opening: Scene1,
  storefront: Scene2,
  counter: Scene3,
  activity: Scene4,
  reports: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const starts: Record<string, number> = {};
  let elapsedMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    starts[key] = elapsedMs / 1000;
    elapsedMs += duration;
  }
  return starts;
})();

interface VideoTemplateProps {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
}

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: VideoTemplateProps = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.52;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
        audio.currentTime = targetTime;
      }
    }
    void audio.play().catch(() => {});
  }, [baseSceneKey, currentSceneKey, muted, paused]);

  return (
    <VideoCanvas
      aspectRatio={VIDEO_ASPECT_RATIO}
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      <AnimatePresence mode="sync" initial={false}>
        {SceneComponent && (
          <SceneComponent key={currentSceneKey} />
        )}
      </AnimatePresence>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
        aria-hidden="true"
      />
    </VideoCanvas>
  );
}
