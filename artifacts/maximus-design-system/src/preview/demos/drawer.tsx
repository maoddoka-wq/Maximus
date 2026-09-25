import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../../components/ui/drawer';

export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  return <div className="p-10"><Drawer open={open} onOpenChange={setOpen}><DrawerTrigger asChild><Button>Ouvrir le tiroir</Button></DrawerTrigger><DrawerContent><DrawerHeader><DrawerTitle>Tiroir de confirmation</DrawerTitle><DrawerDescription>Un tiroir mobile avec fermeture contrôlée et actions explicites.</DrawerDescription></DrawerHeader><DrawerFooter><Button onClick={() => setOpen(false)}>Confirmer</Button><DrawerClose asChild><Button variant="outline">Annuler</Button></DrawerClose></DrawerFooter></DrawerContent></Drawer><p className="mt-3 text-sm text-muted-foreground">État : {open ? 'ouvert' : 'fermé'}</p></div>;
}