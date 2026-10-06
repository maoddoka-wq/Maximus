import { CalendarDays, Clock3, QrCode } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

const FEATURES: DetailCardItem[] = [
  { title: 'POINTAGE PAR QR', detail: 'Chaque employé pointe avec son compte.', icon: QrCode },
  { title: 'ABSENCES & CONGÉS', detail: 'Saisissez et suivez les demandes.', icon: CalendarDays },
  { title: 'HORAIRES & RAPPORTS', detail: 'Organisez les horaires et consultez les suivis.', icon: Clock3 },
];
export function Scene7() {
  return (
    <SceneFrame tone="light" name="presences" durationMs={10000}>
      <Reveal className="presence-title" delay={0.16}>
        <span className="module-kicker">06 / ÉQUIPES</span>
        <span className="module-title">PRÉSENCES</span>
      </Reveal>
      <ModulePhoto
        src="images/modules/maximus-presences.jpg"
        alt="Employé pointant à son arrivée dans un lieu de travail."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
