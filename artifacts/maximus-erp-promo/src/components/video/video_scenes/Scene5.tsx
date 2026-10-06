import { CarFront, Route, UserRound } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

const FEATURES: DetailCardItem[] = [
  { title: 'COURSES TAXI', detail: 'Demandes et étapes de course.', icon: Route },
  { title: 'CHAUFFEURS', detail: 'Disponibilités et affectations.', icon: UserRound },
  { title: 'VÉHICULES', detail: 'Gérez le parc lié à votre activité.', icon: CarFront },
];

export function Scene5() {
  return (
    <SceneFrame tone="dark" name="transport" durationMs={10000}>
      <Reveal className="transport-title module-title" delay={0.22}>
        <span className="module-kicker">04 / MOBILITÉ</span>
        <span>TRANSPORT</span>
      </Reveal>
      <ModulePhoto
        src="images/modules/maximus-transport.jpg"
        alt="Chauffeur professionnel à côté d’un taxi dans une rue de Dakar."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
