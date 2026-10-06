import { ArrowDownUp, ClipboardCheck, Package } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

const FEATURES: DetailCardItem[] = [
  { title: 'ARTICLES', detail: 'Références, quantités et seuils.', icon: Package },
  { title: 'MOUVEMENTS', detail: 'Réceptions, sorties et transferts.', icon: ArrowDownUp },
  { title: 'INVENTAIRES', detail: 'Comptez et vérifiez les écarts terrain.', icon: ClipboardCheck },
];
export function Scene4() {
  return (
    <SceneFrame tone="light" name="stock" durationMs={10000}>
      <Reveal className="stock-copy" delay={0.18}>
        <span className="module-kicker">03 / APPROVISIONNEMENT</span>
        <span className="module-title">GESTION<br />DE STOCK</span>
      </Reveal>
      <ModulePhoto
        src="images/modules/maximus-stock.jpg"
        alt="Employé d’entrepôt vérifiant des cartons avec un lecteur de codes-barres."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
