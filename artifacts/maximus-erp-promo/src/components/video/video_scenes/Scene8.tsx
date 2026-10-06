import { motion } from 'framer-motion';
import { ArrowDownToLine, Banknote, CircleCheck, UsersRound } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';

const FEATURES: DetailCardItem[] = [
  { title: 'BÉNÉFICIAIRES', detail: 'Gérez les personnes concernées.', icon: UsersRound },
  { title: 'PRÉPARER UNE PAIE', detail: 'Préparez puis validez le traitement.', icon: Banknote },
  { title: 'VIREMENTS & HISTORIQUE', detail: 'Suivez les opérations et leur état.', icon: ArrowDownToLine },
];
const STEPS = [
  { label: 'Bénéficiaires', Icon: UsersRound },
  { label: 'Préparation', Icon: Banknote },
  { label: 'Virements', Icon: ArrowDownToLine },
];

export function Scene8() {
  return (
    <SceneFrame tone="dark" name="payroll" durationMs={10000}>
      <Reveal className="payroll-title module-title" delay={0.2}>
        <span className="module-kicker">07 / RÉMUNÉRATION</span>
        <span>PAIE</span>
      </Reveal>
      <div className="payroll-track" aria-hidden="true">
        {STEPS.map(({ label, Icon }, index) => (
          <motion.div className="payroll-card" key={label} initial={{ x: -120, y: 60, rotate: -8, opacity: 0 }} animate={{ x: [ -120, 0, 18 ], y: [60, 0, -12], rotate: [ -8, 0, 3 ], opacity: [0, 1, 1] }} transition={{ delay: 0.16 + index * 0.36, duration: 0.64, times: [0, 0.72, 1], ease: [0.22, 1, 0.36, 1] }}>
            <Icon size="8vmin" strokeWidth={1.35} /><span>{label}</span><i /><i />
          </motion.div>
        ))}
        <motion.div className="payroll-confirm" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.12, 1], opacity: [0, 1, 1] }} transition={{ delay: 2.82, duration: 0.42 }}><CircleCheck size="8vmin" strokeWidth={1.2} /></motion.div>
      </div>
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
