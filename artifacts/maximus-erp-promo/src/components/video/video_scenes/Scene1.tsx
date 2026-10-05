import { motion } from 'framer-motion';
import { EASE, SceneFrame, Reveal } from './scene-shared';

const POINTS = [
  { x: 50, y: 30 }, { x: 32, y: 36 }, { x: 68, y: 38 },
  { x: 25, y: 51 }, { x: 75, y: 53 }, { x: 36, y: 66 }, { x: 64, y: 68 },
];

export function Scene1() {
  return (
    <SceneFrame tone="dark" name="opener" durationMs={3500} opening>
      <div className="opener-copy">
        <Reveal className="eyebrow mono-label" delay={0.08} duration={0.2}>MAXIMUS ERP</Reveal>
        <Reveal className="opener-title" delay={0.12} duration={0.35}>UN ERP</Reveal>
        <Reveal className="opener-subtitle" delay={0.62} duration={0.28}>SEPT MODULES</Reveal>
      </div>
      <motion.div className="opener-number" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: [0.3, 1.12, 1], opacity: [0, 1, 1] }} transition={{ delay: 1.38, duration: 0.5, times: [0, 0.56, 1], ease: [0.18, 0.82, 0.22, 1] }}>7</motion.div>
      <div className="module-orbit" aria-hidden="true">
        {POINTS.map((point, index) => (
          <motion.span
            className="module-orbit-dot"
            key={index}
            style={{ left: point.x + '%', top: point.y + '%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.12, 1], opacity: [0, 1, 1] }}
            transition={{ delay: 0.35 + index * 0.45, duration: 0.28, times: [0, 0.62, 1], ease: [0.18, 0.82, 0.22, 1] }}
          />
        ))}
      </div>
      <motion.div className="opener-trace" initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1] }} transition={{ delay: 0.28, duration: 2.65, times: [0, 0.75, 1], ease: EASE }} aria-hidden="true" />
    </SceneFrame>
  );
}
