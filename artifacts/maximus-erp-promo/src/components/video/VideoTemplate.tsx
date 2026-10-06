import {
  VideoCanvas,
  type VideoAspectRatio,
  VideoPausedContext,
  useVideoAudio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';
import { VideoAudioTrack } from './VideoAudioTrack';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';
import { Scene9 } from './video_scenes/Scene9';

export const SCENE_DURATIONS = {
  opening: 3500,
  commercial: 10000,
  ecommerce: 10000,
  stock: 10000,
  transport: 10000,
  immobilier: 10000,
  presences: 10000,
  payroll: 10000,
  signature: 7000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  opening: Scene1,
  commercial: Scene2,
  ecommerce: Scene3,
  stock: Scene4,
  transport: Scene5,
  immobilier: Scene6,
  presences: Scene7,
  payroll: Scene8,
  signature: Scene9,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '9:16';

interface VideoTemplateProps {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  onSceneChange?: (sceneKey: string) => void;
}

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  onSceneChange,
}: VideoTemplateProps = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioState = useVideoAudio();
  const playbackPaused = paused || audioState.paused;
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  if (!SceneComponent) {
    throw new Error(`No video scene is registered for "${baseSceneKey}"`);
  }

  return (
    <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} className="video-canvas">
      <VideoPausedContext.Provider value={playbackPaused}>
        <div className="video-stage">
          <AnimatePresence mode="sync">
            <SceneComponent key={currentSceneKey} />
          </AnimatePresence>
        </div>
        <VideoAudioTrack
          currentScene={currentScene}
          currentSceneKey={currentSceneKey}
          durations={durations}
          muted={audioState.muted}
          paused={playbackPaused}
        />
      </VideoPausedContext.Provider>
    </VideoCanvas>
  );
}
