import { motion } from 'framer-motion';
import { BadgeCheck, Boxes, Building2, CarFront, Clock3, FileText, Package, ShieldCheck, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';

const MOTIFS = [TrendingUp, FileText, Package, Boxes, CarFront, Building2, Clock3];
const BENEFITS: DetailCardItem[] = [
  { title: 'MODULES CHOISIS', detail: 'Retenez ceux utiles à votre entreprise.', icon: Boxes },
  { title: 'FONCTIONS ADAPTÉES', detail: 'Choisissez les outils selon votre activité.', icon: SlidersHorizontal },
  { title: 'ACCÈS PAR RÔLE', detail: 'Définissez les autorisations de chaque équipe.', icon: ShieldCheck },
];

export function Scene9() {
  return (
    <SceneFrame tone="light" name="signature" durationMs={7000}>
      <div className="signature-orbit" aria-hidden="true">
        {MOTIFS.map((Icon, index) => {
          const angle = -90 + index * (360 / MOTIFS.length);
          const radians = (angle * Math.PI) / 180;
          const left = 50 + Math.cos(radians) * 29;
          const top = 35 + Math.sin(radians) * 17;
          return <motion.span className="signature-motif" key={index} style={{ left: left + '%', top: top + '%' }} initial={{ scale: 0.2, opacity: 0, rotate: -18 }} animate={{ scale: [0.2, 1.16, 1], opacity: [0, 1, 0.74], rotate: 0 }} transition={{ delay: 0.2 + index * 0.14, duration: 0.36, ease: [0.18, 0.82, 0.22, 1] }}><Icon size="6vmin" strokeWidth={1.25} /></motion.span>;
        })}
      </div>
      <Reveal className="signature-kicker" delay={0.16} duration={0.3}>LA FORCE DE MAXIMUS</Reveal>
      <motion.img className="signature-logo" src={import.meta.env.BASE_URL + 'images/maximus-mark.svg'} alt="" initial={{ scale: 0.74, opacity: 0, rotate: -8 }} animate={{ scale: [0.74, 1.05, 1], opacity: 1, rotate: 0 }} transition={{ delay: 0.28, duration: 0.84, ease: [0.22, 1, 0.36, 1] }} />
      <Reveal className="signature-wordmark" delay={0.72} duration={0.42}><BadgeCheck className="signature-seal" size="4.5vmin" strokeWidth={1.2} /><span>MAXIMUS ERP</span></Reveal>
      <DetailCards items={BENEFITS} className="signature-benefits" delay={1.05} stagger={0.42} />
      <Reveal className="signature-line" delay={2.1} duration={0.38}>Un seul espace pour piloter vos activités.</Reveal>
      <motion.div className="loop-thread" initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }} transition={{ delay: 5.15, duration: 1.65, times: [0, 0.35, 0.78, 1], ease: [0.22, 1, 0.36, 1] }} aria-hidden="true" />
    </SceneFrame>
  );
}
