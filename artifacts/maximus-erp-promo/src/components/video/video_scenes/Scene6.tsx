import { motion } from 'framer-motion';
import { Building2, DoorOpen, MapPin } from 'lucide-react';
import { SceneFrame, Reveal, WordCycle } from './scene-shared';

const WORDS = ['BIENS', 'ANNONCES', 'PROSPECTS', 'VISITES'];

export function Scene6() {
  return (
    <SceneFrame tone="slate" name="immobilier" durationMs={4500}>
      <Reveal className="realty-title module-title" delay={0.2}>IMMOBILIER</Reveal>
      <div className="blueprint" aria-hidden="true">
        <motion.div className="blueprint-floor" initial={{ rotateX: 68, y: 150, opacity: 0 }} animate={{ rotateX: 0, y: 0, opacity: 1 }} transition={{ delay: 0.32, duration: 0.76, ease: [0.22, 1, 0.36, 1] }}>
          <div className="blueprint-room room-one" /><div className="blueprint-room room-two" /><div className="blueprint-room room-three" />
          <motion.div className="realty-building" initial={{ scaleY: 0.1, opacity: 0.1 }} animate={{ scaleY: [0.1, 1.04, 1], opacity: 1 }} transition={{ delay: 0.95, duration: 0.76, ease: [0.22, 1, 0.36, 1] }}><Building2 size="35vmin" strokeWidth={1.05} /></motion.div>
        </motion.div>
        <motion.div className="visit-marker" initial={{ x: -80, y: 50, opacity: 0 }} animate={{ x: [ -80, 0, 68 ], y: [50, 0, -20], opacity: [0, 1, 1] }} transition={{ delay: 1.86, duration: 1.24, times: [0, 0.75, 1], ease: [0.22, 1, 0.36, 1] }}><MapPin size="9vmin" /><DoorOpen size="7vmin" /></motion.div>
      </div>
      <WordCycle items={WORDS} at={[850, 1550, 2300, 3050]} />
      <Reveal className="realty-footer" delay={3.7} duration={0.3}>BIENS · ANNONCES · PROSPECTS · VISITES</Reveal>
    </SceneFrame>
  );
}
