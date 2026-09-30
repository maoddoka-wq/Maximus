import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

export function ChauffeurExamplePage() {
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Maquette statique composée avec les tokens et composants du système.
        Les informations affichées sont fictives; aucun comportement de course
        ou de localisation n’est simulé.
      </p>

      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border bg-background text-foreground shadow-lg">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-5 py-4">
          <div>
            <p className="text-sm font-semibold tracking-wide">MAXIMUS</p>
            <p className="text-xs text-muted-foreground">Espace Chauffeur</p>
          </div>
          <Badge variant="secondary">Disponible</Badge>
        </header>

        <main className="space-y-5 p-5">
          <section>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aujourd’hui
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Bonjour, Awa</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Votre espace de conduite
            </p>
          </section>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Course en cours
                  </p>
                  <CardTitle className="mt-1 text-lg">
                    Trajet vers l’aéroport
                  </CardTitle>
                </div>
                <Badge>Confirmée</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p className="text-sm font-medium">Plateau, Dakar</p>
                  </div>
                </div>
                <div className="ml-2 h-4 border-l border-dashed" />
                <div className="flex items-center gap-3">
                  <MapPin
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    <p className="text-sm font-medium">Aéroport Blaise-Diagne</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden="true" />
                <span>Environ 45 min</span>
                <span className="ml-auto font-mono text-xs">EXEMPLE</span>
              </div>

              <Button className="w-full">
                Détails de la course
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Exemple de composition · données fictives
          </p>
        </main>
      </div>
    </div>
  );
}