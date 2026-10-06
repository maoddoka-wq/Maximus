import { Building2, FileText, UsersRound } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

const FEATURES: DetailCardItem[] = [
  { title: 'BIENS', detail: 'Gérez le patrimoine de l’agence.', icon: Building2 },
  { title: 'ANNONCES', detail: 'Publiez des biens sélectionnés.', icon: FileText },
  { title: 'PROSPECTS & VISITES', detail: 'Traitez les contacts et demandes reçus.', icon: UsersRound },
];

export function Scene6() {
  return (
    <SceneFrame tone="slate" name="immobilier" durationMs={10000}>
      <Reveal className="realty-title module-title" delay={0.2}>
        <span className="module-kicker">05 / PATRIMOINE ET ANNONCES</span>
        <span>IMMOBILIER</span>
      </Reveal>
      <ModulePhoto
        src="images/modules/maximus-immobilier.jpg"
        alt="Agent immobilier présentant un appartement à des visiteurs."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
