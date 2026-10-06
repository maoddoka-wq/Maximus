import { ShoppingBag, Store, Truck } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

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
      <ModulePhoto
        src="images/modules/maximus-ecommerce.jpg"
        alt="Vendeur préparant une commande pour une boutique en ligne."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
