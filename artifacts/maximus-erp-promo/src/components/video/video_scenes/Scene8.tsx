import { ArrowDownToLine, Banknote, UsersRound } from 'lucide-react';
import { SceneFrame, Reveal } from './scene-shared';
import { DetailCards, type DetailCardItem } from './DetailCards';
import { ModulePhoto } from './ModulePhoto';

const FEATURES: DetailCardItem[] = [
  { title: 'BÉNÉFICIAIRES', detail: 'Gérez les personnes concernées.', icon: UsersRound },
  { title: 'PRÉPARER UNE PAIE', detail: 'Préparez puis validez le traitement.', icon: Banknote },
  { title: 'VIREMENTS & HISTORIQUE', detail: 'Suivez les opérations et leur état.', icon: ArrowDownToLine },
];
export function Scene8() {
  return (
    <SceneFrame tone="dark" name="payroll" durationMs={10000}>
      <Reveal className="payroll-title module-title" delay={0.2}>
        <span className="module-kicker">07 / RÉMUNÉRATION</span>
        <span>PAIE</span>
      </Reveal>
      <ModulePhoto
        src="images/modules/maximus-paie.jpg"
        alt="Responsable paie examinant des documents confidentiels non lisibles."
      />
      <DetailCards items={FEATURES} />
    </SceneFrame>
  );
}
