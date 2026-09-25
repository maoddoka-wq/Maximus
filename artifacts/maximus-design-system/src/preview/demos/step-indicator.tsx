import { Step } from '../../components/ui/step-indicator';

export function StepDemo() {
  return <div className="card-surface flex flex-wrap gap-6 p-6"><Step n={1} label="Entreprise" active={false} done /><Step n={2} label="Configuration" active done={false} /><Step n={3} label="Confirmation" active={false} done={false} /></div>;
}