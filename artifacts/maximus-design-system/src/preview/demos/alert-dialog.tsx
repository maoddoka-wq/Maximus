import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';

export function AlertDialogDemo() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('Aucune décision');
  return <div className="p-10"><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger asChild><Button variant="destructive">Supprimer l’élément</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmer la suppression</AlertDialogTitle><AlertDialogDescription>Cette action est définitive. Voulez-vous continuer ?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setResult('Suppression annulée')}>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => setResult('Élément supprimé')}>Confirmer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><p className="mt-3 text-sm text-muted-foreground">{result}</p></div>;
}