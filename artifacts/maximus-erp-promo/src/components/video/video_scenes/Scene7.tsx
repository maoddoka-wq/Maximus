import { motion } from 'framer-motion';
import { Clock3, UsersRound } from 'lucide-react';
import { SceneFrame, Reveal, WordCycle } from './scene-shared';

const WORDS = ['POINTAGE', 'SUIVI DES ÉQUIPES'];
const TEAM = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function Scene7() {
  return (
    <SceneFrame tone="light" name="presences" durationMs={4500}>
      <div className="presence-rail" aria-hidden="true">
        {TEAM.map((person) => <motion.span key={person} className="presence-node" style={{ top: (14 + (person % 6) * 13) + '%', left: (person < 6 ? 18 : 74) + '%' }} initial={{ scale: 0.25, opacity: 0.2 }} animate={{ scale: [0.25, 1.14, 1], opacity: [0.2, 1, 0.88] }} transition={{ delay: 0.42 + person * 0.15, duration: 0.3, ease: [0.18, 0.82, 0.22, 1] }} />)}
      </div>
      <Reveal className="presence-title" delay={0.16}>
        <span className="module-kicker">06 / ÉQUIPES</span>
        <span className="module-title">PRÉSENCES</span>
      </Reveal>
      <motion.div className="clock-face" initial={{ scale: 0.72, rotate: -22, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ delay: 0.36, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}>
        <Clock3 size="33vmin" strokeWidth={1.15} />
        <motion.div className="clock-hand" initial={{ rotate: -90 }} animate={{ rotate: [ -90, 0, 96, 184 ] }} transition={{ delay: 0.72, duration: 2.72, times: [0, 0.32, 0.68, 1], ease: [0.22, 1, 0.36, 1] }} />
      </motion.div>
      <UsersRound className="presence-team-icon" size="11vmin" strokeWidth={1.25} />
      <WordCycle items={WORDS} at={[1050, 2100]} />
      <Reveal className="presence-footer" delay={3.05} duration={0.3}>POINTAGE · ABSENCES · HORAIRES</Reveal>
    </SceneFrame>
  );
}
