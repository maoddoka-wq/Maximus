import { ActivityRow } from '../../components/ui/activity-row';

export function ActivityRowDemo() {
  return <div className="card-surface divide-y"><ActivityRow activity={{ id: '1', user: 'Aminata Diop', action: 'a validé une commande', module: 'Commerce', object: 'CMD-2048', date: 'Il y a 5 min' }} /><ActivityRow delay={1} activity={{ id: '2', user: 'Moussa Fall', action: 'a modifié un produit', module: 'Stock', object: 'SKU-104', date: 'Il y a 18 min' }} /></div>;
}