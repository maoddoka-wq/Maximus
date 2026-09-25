import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export function CardDemo() {
  return <Card className="max-w-md"><CardHeader><CardTitle>Installation</CardTitle><CardDescription>Résumé de votre configuration MAXIMUS.</CardDescription></CardHeader><CardContent><p className="text-sm">Les informations sont prêtes à être vérifiées.</p></CardContent><CardFooter><Button>Continuer</Button></CardFooter></Card>;
}