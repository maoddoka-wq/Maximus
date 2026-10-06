import { motion } from 'framer-motion';
import { FileText, UsersRound, TrendingUp } from 'lucide-react';
import { SceneFrame, Reveal, TracedLine } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';

const FEATURES: DetailCardItem[] = [
  { title: 'CLIENTS & PRODUITS', detail: 'Fiches, contacts et références.', icon: UsersRound },
  { title: 'VENTES & FACTURES', detail: 'Transactions, factures et reçus.', icon: FileText },
  { title: 'ACHATS & CAISSE', detail: 'Fournisseurs, dépenses et encaissements.', icon: TrendingUp },
];

export function Scene2() {
  return (
    <SceneFrame tone="light" name="commercial" durationMs={10000}>
      <Reveal className="module-heading heading-left" delay={0.16}>
        <span className="module-kicker">01 / VENTE ET GESTION</span>
        <span className="module-title">GESTION<br />COMMERCIALE</span>
      </Reveal>
      <TracedLine className="commercial-route" />
      <motion.div className="commercial-hub" initial={{ scale: 0.65, rotate: -16, opacity: 0 }} animate={{ scale: [0.65, 1.08, 1], rotate: 0, opacity: 1 }} transition={{ delay: 0.28, duration: 0.7, ease: [0.18, 0.82, 0.22, 1] }}>
        <div className="hub-ring" />
        <TrendingUp size="22%" strokeWidth={1.4} />
      </motion.div>
      <div className="commercial-node node-client"><UsersRound size="6vmin" /><span>CLIENTS</span></div>
      <div className="commercial-node node-quote"><FileText size="6vmin" /><span>FACTURES</span></div>
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
