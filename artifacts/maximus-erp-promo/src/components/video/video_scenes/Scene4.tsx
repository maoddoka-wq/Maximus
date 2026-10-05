import { motion } from 'framer-motion';
import { ArrowDownUp, Boxes, Package } from 'lucide-react';
import { SceneFrame, Reveal, WordCycle } from './scene-shared';

const WORDS = ['ARTICLES', 'MOUVEMENTS', 'SEUILS'];
const UNITS = [0, 1, 2, 3, 4, 5];

export function Scene4() {
  return (
    <SceneFrame tone="light" name="stock" durationMs={4500}>
      <Reveal className="stock-copy" delay={0.18}>
        <span className="module-kicker">03 / FLUX</span>
        <span className="module-title">GESTION<br />DE STOCK</span>
      </Reveal>
      <div className="stock-level" aria-hidden="true">
        <motion.div className="stock-threshold" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.45, duration: 0.65 }}><span>SEUIL</span></motion.div>
        <div className="stock-units">
          {UNITS.map((unit) => <motion.div key={unit} className="stock-unit" initial={{ y: 72, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.34 + unit * 0.16, duration: 0.42, ease: [0.18, 0.82, 0.22, 1] }}><Package size="6vmin" strokeWidth={1.4} /></motion.div>)}
        </div>
        <motion.div className="stock-motion-icon" initial={{ x: -180, opacity: 0 }} animate={{ x: [-180, -28, 22], opacity: [0, 1, 1] }} transition={{ delay: 1.45, duration: 1.2, times: [0, 0.72, 1], ease: [0.18, 0.82, 0.22, 1] }}><ArrowDownUp size="8vmin" strokeWidth={1.5} /></motion.div>
        <Boxes className="stock-master-icon" size="18vmin" strokeWidth={1.1} />
      </div>
      <WordCycle items={WORDS} at={[1050, 1850, 2650]} />
      <Reveal className="stock-footer" delay={3.32} duration={0.3}>ARTICLES · ENTRÉES · SORTIES · ALERTES</Reveal>
    </SceneFrame>
  );
}
