import { motion } from 'framer-motion';
import { CarFront, MapPin, Route, UserRound } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';

const FEATURES: DetailCardItem[] = [
  { title: 'COURSES TAXI', detail: 'Demandes et étapes de course.', icon: Route },
  { title: 'CHAUFFEURS', detail: 'Disponibilités et affectations.', icon: UserRound },
  { title: 'VÉHICULES', detail: 'Gérez le parc lié à votre activité.', icon: CarFront },
];

export function Scene5() {
  return (
    <SceneFrame tone="dark" name="transport" durationMs={4500}>
      <Reveal className="transport-title module-title" delay={0.22}>
        <span className="module-kicker">04 / MOBILITÉ</span>
        <span>TRANSPORT</span>
      </Reveal>
      <div className="route-grid" aria-hidden="true" />
      <svg className="taxi-route" viewBox="0 0 420 720" fill="none" aria-hidden="true">
        <motion.path d="M62 600 C90 492 294 550 325 414 C360 265 92 345 100 184 C104 116 172 84 308 90" pathLength={1} stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 0 }} transition={{ delay: 0.18, duration: 3.25, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <motion.div className="taxi-car" initial={{ x: -90, y: 270, rotate: -12, opacity: 0 }} animate={{ x: [ -90, 8, 68 ], y: [270, 88, -52], rotate: [ -12, 8, -3 ], opacity: [0, 1, 1] }} transition={{ delay: 0.55, duration: 2.8, times: [0, 0.66, 1], ease: [0.22, 1, 0.36, 1] }}><CarFront size="20vmin" strokeWidth={1.3} /></motion.div>
      <motion.div className="taxi-destination" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: [0.2, 1, 3.1], opacity: [0, 1, 0] }} transition={{ delay: 3.2, duration: 1.3, times: [0, 0.5, 1], ease: [0.22, 1, 0.36, 1] }}><MapPin size="9vmin" /></motion.div>
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
