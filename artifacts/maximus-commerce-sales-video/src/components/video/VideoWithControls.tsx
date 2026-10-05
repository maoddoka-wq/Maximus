import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';

import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  opening: {
    title: 'Accroche',
    filePath: 'src/components/video/video_scenes/Scene1.tsx',
  },
  storefront: {
    title: 'Boutique publique',
    filePath: 'src/components/video/video_scenes/Scene2.tsx',
  },
  counter: {
    title: 'Caisse comptoir',
    filePath: 'src/components/video/video_scenes/Scene3.tsx',
  },
  activity: {
    title: 'Suivi des ventes',
    filePath: 'src/components/video/video_scenes/Scene4.tsx',
  },
  reports: {
    title: 'Rapports et conclusion',
    filePath: 'src/components/video/video_scenes/Scene5.tsx',
  },
};

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;
  window.parent.postMessage(
    {
      type: 'REPLIT_VIDEO_SCENE_SELECTED',
      payload: {
        sceneIndex: index,
        sceneCount: sceneKeys.length,
        sceneTitle: details.title || key,
        filePath: details.filePath,
        lineNumber: 1,
      },
    },
    '*',
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const [muted, setMuted] = useState(true);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const {
    sceneKeys,
    activeIndex,
    locked,
    paused,
    mountKey,
    tick,
    durations,
    activeDuration,
    activeStartTime,
    totalDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
    togglePause,
  } = useSceneControls(SCENE_DURATIONS);

  const handleJumpTo = useCallback((index: number) => {
    jumpTo(index);
    announceSceneSelection(index, sceneKeys);
  }, [jumpTo, sceneKeys]);

  useEffect(() => {
    if (!paused) return;
    const frozen = document
      .getAnimations()
      .filter((animation) => animation.playState === 'running');
    frozen.forEach((animation) => animation.pause());
    return () => frozen.forEach((animation) => animation.play());
  }, [paused]);

  const handlePointerEnter = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      if (!current) {
        setHovering(false);
        setTapPinned(false);
      }
      return !current;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (sensorRef.current && !sensorRef.current.contains(event.target as Node)) {
        setTapPinned(false);
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  const barVisible = !collapsed || hovering || tapPinned;
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        paused={paused}
        muted={muted}
        onSceneChange={onSceneChange}
      />
      <div
        ref={sensorRef}
        className="film-control-sensor absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="w-full flex-1" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={locked}
          paused={paused}
          muted={muted}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          activeStartTime={activeStartTime}
          totalDuration={totalDuration}
          tick={tick}
          onTogglePause={togglePause}
          onToggleLock={toggleLock}
          onToggleMute={() => setMuted((current) => !current)}
          onJumpTo={handleJumpTo}
          onToggleCollapsed={handleToggleCollapsed}
        />
      </div>
    </div>
  );
}

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  paused: boolean;
  muted: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  onTogglePause: () => void;
  onToggleLock: () => void;
  onToggleMute: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
}

function ControlBar({
  visible,
  collapsed,
  locked,
  paused,
  muted,
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  onTogglePause,
  onToggleLock,
  onToggleMute,
  onJumpTo,
  onToggleCollapsed,
}: ControlBarProps) {
  const buttonClass =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white md:h-14 md:w-14';
  const iconClass = 'h-5 w-5 md:h-8 md:w-8';

  return (
    <div
      className={`flex items-center gap-2 bg-black/60 px-3 py-3 backdrop-blur-sm transition-all duration-200 ease-out md:gap-3 md:px-5 md:py-4 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-full opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={onTogglePause}
        className={buttonClass}
        aria-label={paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause'}
      >
        {paused ? <Play className={iconClass} /> : <Pause className={iconClass} />}
      </button>
      <button
        type="button"
        onClick={onToggleLock}
        className={`${buttonClass} ${locked ? 'bg-white/15 text-white' : ''}`}
        aria-label={locked ? 'Désactiver la boucle de scène' : 'Boucler la scène'}
        aria-pressed={locked}
      >
        <Repeat className={iconClass} />
      </button>
      <button
        type="button"
        onClick={onToggleMute}
        className={buttonClass}
        aria-label={muted ? 'Activer le son' : 'Couper le son'}
        aria-pressed={muted}
      >
        {muted ? <VolumeX className={iconClass} /> : <Volume2 className={iconClass} />}
      </button>

      <div className="h-8 w-px shrink-0 bg-white/20" aria-hidden="true" />

      <PlaybackStatus
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        activeStartTime={activeStartTime}
        totalDuration={totalDuration}
        tick={tick}
        paused={paused}
        onJumpTo={onJumpTo}
      />

      <button
        type="button"
        onClick={onToggleCollapsed}
        className={buttonClass}
        aria-label={collapsed ? 'Afficher les commandes' : 'Masquer les commandes'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronUp className={iconClass} /> : <ChevronDown className={iconClass} />}
      </button>
    </div>
  );
}

interface PlaybackStatusProps {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: PlaybackStatusProps) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - startedAt);
    }, 60);
    return () => {
      window.clearInterval(interval);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [paused, tick]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(
    totalDuration,
    activeStartTime + Math.min(elapsed, activeDuration),
  );

  return (
    <>
      <div className="flex min-w-[2.5rem] flex-1 items-center gap-1 md:min-w-0 md:gap-1.5">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            type="button"
            onClick={() => onJumpTo(index)}
            className="relative h-2 min-h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-3 md:h-3 md:min-h-3"
            aria-label={`Aller à la scène ${index + 1}`}
            aria-current={activeIndex === index ? 'true' : undefined}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-[width] duration-100"
              style={{ width: `${activeIndex === index ? progress * 100 : 0}%` }}
            />
          </button>
        ))}
      </div>
      <div className="shrink-0 text-xs tabular-nums text-white/70 md:text-xl">
        {activeIndex + 1}/{sceneKeys.length}
      </div>
      <div
        className="min-w-[7ch] shrink-0 text-right font-mono text-[0.65rem] tabular-nums text-white/80 md:min-w-[11ch] md:text-xl"
        role="timer"
        aria-label={`Temps ${formatPlaybackTime(totalElapsed)} sur ${formatPlaybackTime(totalDuration)}`}
      >
        {formatPlaybackTime(totalElapsed)} / {formatPlaybackTime(totalDuration)}
      </div>
    </>
  );
}

function formatPlaybackTime(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
