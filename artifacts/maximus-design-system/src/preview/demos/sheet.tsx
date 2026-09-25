import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';

export function SheetDemo() {
  const [open, setOpen] = useState(false);
  return <div className="p-10"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button>Ouvrir le panneau</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Panneau latéral</SheetTitle><SheetDescription>Un panneau accessible qui se ferme avec la croix, Échap ou Annuler.</SheetDescription></SheetHeader><SheetFooter><SheetClose asChild><Button variant="outline">Annuler</Button></SheetClose><Button onClick={() => setOpen(false)}>Enregistrer</Button></SheetFooter></SheetContent></Sheet><p className="mt-3 text-sm text-muted-foreground">État : {open ? 'ouvert' : 'fermé'}</p></div>;
}