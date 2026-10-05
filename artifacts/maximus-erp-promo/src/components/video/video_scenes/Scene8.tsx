import { motion } from 'framer-motion';
import { ArrowDownToLine, Banknote, CircleCheck, UsersRound } from 'lucide-react';
import { SceneFrame, Reveal, WordCycle } from './scene-shared';

const WORDS = ['BÉNÉFICIAIRES', 'PRÉPARATION', 'VIREMENTS'];
const STEPS = [
  { label: 'Bénéficiaires', Icon: UsersRound },
  { label: 'Préparation', Icon: Banknote },
  { label: 'Virements', Icon: ArrowDownToLine },
];

export function Scene8() {
  return (
    <SceneFrame tone="dark" name="payroll" durationMs={4500}>
      <Reveal className="payroll-title module-title" delay={0.2}>PAIE</Reveal>
      <div className="payroll-track" aria-hidden="true">
        {STEPS.map(({ label, Icon }, index) => (
          <motion.div className="payroll-card" key={label} initial={{ x: -120, y: 60, rotate: -8, opacity: 0 }} animate={{ x: [ -120, 0, 18 ], y: [60, 0, -12], rotate: [ -8, 0, 3 ], opacity: [0, 1, 1] }} transition={{ delay: 0.16 + index * 0.36, duration: 0.64, times: [0, 0.72, 1], ease: [0.22, 1, 0.36, 1] }}>
            <Icon size="8vmin" strokeWidth={1.35} /><span>{label}</span><i /><i />
          </motion.div>
        ))}
        <motion.div className="payroll-confirm" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.12, 1], opacity: [0, 1, 1] }} transition={{ delay: 2.82, duration: 0.42 }}><CircleCheck size="8vmin" strokeWidth={1.2} /></motion.div>
      </div>
      <WordCycle items={WORDS} at={[900, 1700, 2550]} />
      <Reveal className="payroll-footer" delay={3.28} duration={0.3}>BÉNÉFICIAIRES · PRÉPARATION · VIREMENTS</Reveal>
    </SceneFrame>
  );
}
