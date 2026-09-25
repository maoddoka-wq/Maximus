import { Button } from '../../components/ui/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../../components/ui/button-group';

export function ButtonGroupDemo() {
  return <div className="card-surface flex flex-wrap gap-6 p-6"><ButtonGroup><Button variant="outline">Précédent</Button><Button variant="outline">Suivant</Button></ButtonGroup><ButtonGroup><Button>Copier</Button><ButtonGroupSeparator /><ButtonGroupText>⌘ K</ButtonGroupText></ButtonGroup><ButtonGroup orientation="vertical"><Button variant="outline">Haut</Button><Button variant="outline">Bas</Button></ButtonGroup></div>;
}