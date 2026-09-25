import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return <div className="p-10"><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button>Ouvrir la boîte de dialogue</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Modifier les paramètres</DialogTitle><DialogDescription>Cette fenêtre est contrôlée et peut être fermée par Échap, la croix ou le bouton.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => setOpen(false)}>Confirmer</Button></DialogFooter></DialogContent></Dialog><p className="mt-3 text-sm text-muted-foreground">État : {open ? 'ouverte' : 'fermée'}</p></div>;
}