import { FileText, UsersRound, TrendingUp } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

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
      <ModulePhoto
        src="images/modules/maximus-commercial.jpg"
        alt="Gérante d’un commerce de proximité accueillant une cliente."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
