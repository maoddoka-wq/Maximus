import { motion } from 'framer-motion';
import { Building2, DoorOpen, FileText, MapPin, UsersRound } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';

const FEATURES: DetailCardItem[] = [
  { title: 'BIENS', detail: 'Gérez le patrimoine de l’agence.', icon: Building2 },
  { title: 'ANNONCES', detail: 'Publiez des biens sélectionnés.', icon: FileText },
  { title: 'PROSPECTS & VISITES', detail: 'Traitez les contacts et demandes reçus.', icon: UsersRound },
];

export function Scene6() {
  return (
    <SceneFrame tone="slate" name="immobilier" durationMs={4500}>
      <Reveal className="realty-title module-title" delay={0.2}>
        <span className="module-kicker">05 / PATRIMOINE ET ANNONCES</span>
        <span>IMMOBILIER</span>
      </Reveal>
      <div className="blueprint" aria-hidden="true">
        <motion.div className="blueprint-floor" initial={{ rotateX: 68, y: 150, opacity: 0 }} animate={{ rotateX: 0, y: 0, opacity: 1 }} transition={{ delay: 0.32, duration: 0.76, ease: [0.22, 1, 0.36, 1] }}>
          <div className="blueprint-room room-one" /><div className="blueprint-room room-two" /><div className="blueprint-room room-three" />
          <motion.div className="realty-building" initial={{ scaleY: 0.1, opacity: 0.1 }} animate={{ scaleY: [0.1, 1.04, 1], opacity: 1 }} transition={{ delay: 0.95, duration: 0.76, ease: [0.22, 1, 0.36, 1] }}><Building2 size="35vmin" strokeWidth={1.05} /></motion.div>
        </motion.div>
        <motion.div className="visit-marker" initial={{ x: -80, y: 50, opacity: 0 }} animate={{ x: [ -80, 0, 68 ], y: [50, 0, -20], opacity: [0, 1, 1] }} transition={{ delay: 1.86, duration: 1.24, times: [0, 0.75, 1], ease: [0.22, 1, 0.36, 1] }}><MapPin size="9vmin" /><DoorOpen size="7vmin" /></motion.div>
      </div>
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
