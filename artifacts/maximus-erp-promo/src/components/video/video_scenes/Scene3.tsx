import { motion } from 'framer-motion';
import { PackageCheck, ShoppingBag, Store, Truck } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';

const FEATURES: DetailCardItem[] = [
  { title: 'BOUTIQUE & CATALOGUE', detail: 'Présentez vos produits en ligne.', icon: Store },
  { title: 'COMMANDES', detail: 'Suivez clients, articles et paiements.', icon: ShoppingBag },
  { title: 'LIVRAISONS', detail: 'De la vente jusqu’à la remise au client.', icon: Truck },
];

export function Scene3() {
  return (
    <SceneFrame tone="dark" name="ecommerce" durationMs={10000}>
      <Reveal className="ecom-title module-title" delay={0.2}>
        <span className="module-kicker">02 / VENTE EN LIGNE</span>
        <span>E-COMMERCE</span>
      </Reveal>
      <div className="catalog-stack" aria-hidden="true">
        <motion.div className="catalog-card catalog-back" initial={{ y: 72, rotate: 8, opacity: 0 }} animate={{ y: 0, rotate: 6, opacity: 0.64 }} transition={{ delay: 0.42, duration: 0.55 }}><span /><span /><span /></motion.div>
        <motion.div className="catalog-card catalog-mid" initial={{ y: 60, rotate: -7, opacity: 0 }} animate={{ y: 0, rotate: -5, opacity: 0.82 }} transition={{ delay: 0.62, duration: 0.58 }}><span /><span /><span /></motion.div>
        <motion.div className="catalog-card catalog-front" initial={{ y: 42, rotate: 0, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ delay: 0.78, duration: 0.62 }}>
          <div className="catalog-card-top"><Store size="8vmin" /><div><i /><i /></div></div>
          <div className="catalog-card-row"><span /><span /><b /></div>
          <div className="catalog-card-row"><span /><span /><b /></div>
          <div className="catalog-card-row"><span /><span /><b /></div>
        </motion.div>
        <motion.div className="order-token" initial={{ x: -180, y: 120, scale: 0.5, opacity: 0 }} animate={{ x: [ -180, 0, 74 ], y: [120, 10, -46], scale: [0.5, 1.05, 1], opacity: [0, 1, 1] }} transition={{ delay: 1.92, duration: 1.15, times: [0, 0.68, 1], ease: [0.18, 0.82, 0.22, 1] }}><PackageCheck size="10vmin" strokeWidth={1.3} /></motion.div>
      </div>
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
