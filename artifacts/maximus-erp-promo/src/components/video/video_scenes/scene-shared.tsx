import { useState, type PropsWithChildren } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';

export const EASE = [0.22, 1, 0.36, 1] as const;

export function SceneFrame({
  children,
  tone,
  name,
  durationMs,
  opening = false,
}: PropsWithChildren<{
  tone: 'dark' | 'light' | 'slate';
  name: string;
  durationMs: number;
  opening?: boolean;
}>) {
  return (
    <motion.section
      className={'film-scene tone-' + tone + ' scene-' + name}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.025, clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)' }}
      transition={{ duration: 0.34, ease: EASE }}
    >
      <motion.div
        className="carrier-orb"
        initial={opening ? { scale: 0.5, opacity: 0.82 } : { scale: 1.55, opacity: 0.5, filter: 'blur(10px)' }}
        animate={{ scale: [1, 1.04, 1.12, 3.35], opacity: [0.32, 0.4, 0.55, 0], filter: ['blur(0px)', 'blur(0px)', 'blur(1px)', 'blur(8px)'] }}
        transition={{ duration: durationMs / 1000, times: [0, 0.58, 0.79, 1], ease: [0.22, 0.4, 0.6, 1] }}
        aria-hidden="true"
      />
      <div className="scene-light-wash" aria-hidden="true" />
      {children}
    </motion.section>
  );
}

export function WordCycle({ items, at }: { items: string[]; at: number[] }) {
  const [index, setIndex] = useState(-1);
  useSceneTimer(at.map((time, step) => ({ time, callback: () => setIndex(step) })));

  if (index < 0) return null;

  return (
    <div className="word-cycle" aria-live="off">
      <AnimatePresence mode="sync" initial={false}>
        <motion.span
          key={items[index]}
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)', scale: 0.92 }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, y: -12, filter: 'blur(5px)', scale: 1.04 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function Reveal({ children, className = '', delay = 0, duration = 0.55 }: PropsWithChildren<{ className?: string; delay?: number; duration?: number }>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function TracedLine({ className = '' }: { className?: string }) {
  return (
    <svg className={'traced-line ' + className} viewBox="0 0 400 620" fill="none" aria-hidden="true">
      <motion.path
        d="M82 492 C78 388 315 420 308 292 C300 184 105 252 102 137 C101 91 178 80 245 82"
        pathLength={1}
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 1"
        initial={{ strokeDashoffset: 1, opacity: 0.2 }}
        animate={{ strokeDashoffset: [1, 0, -0.12], opacity: [0.25, 1, 0.7] }}
        transition={{ duration: 3.6, times: [0, 0.68, 1], ease: EASE, repeat: Infinity, repeatType: 'reverse' }}
      />
    </svg>
  );
}
