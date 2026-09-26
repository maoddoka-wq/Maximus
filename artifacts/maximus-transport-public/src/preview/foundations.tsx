import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';

const CORE_SWATCHES = [
  { name: 'Primary · ambre taxi', className: 'bg-primary' },
  { name: 'Secondary · pierre claire', className: 'bg-secondary' },
  { name: 'Accent · bleu nuit', className: 'bg-accent' },
] as const;

const SUPPORTING_SWATCHES = [
  { name: 'Fond', className: 'border bg-background' },
  { name: 'Texte', className: 'bg-foreground' },
  { name: 'Surface atténuée', className: 'bg-muted' },
  { name: 'Danger', className: 'bg-destructive' },
  { name: 'Bordure', className: 'bg-border' },
] as const;

const TYPE_SCALE = [
  { label: 'Titre', className: 'text-4xl font-bold' },
  { label: 'Intertitre', className: 'text-2xl font-semibold' },
  { label: 'Texte courant', className: 'text-base' },
  { label: 'Libellé', className: 'text-sm font-medium' },
  { label: 'Légende', className: 'text-sm text-muted-foreground' },
] as const;

const SPACING_SCALE = [
  { label: '4', className: 'w-4' },
  { label: '8', className: 'w-8' },
  { label: '12', className: 'w-12' },
  { label: '16', className: 'w-16' },
  { label: '24', className: 'w-24' },
] as const;

function Swatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`h-16 rounded-lg ${className}`} />
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}

export function OverviewPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-accent p-6 text-accent-foreground sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Mobilité urbaine · Dakar
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
          Un parcours simple, du point de départ au suivi du taxi.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-accent-foreground/75">
          Une identité MAXIMUS à fort contraste, avec l’ambre taxi pour les
          actions importantes et le bleu nuit pour ancrer les informations.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Palette centrale
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Typographie
          </h2>
          <div className="mt-4 space-y-3">
            {TYPE_SCALE.map((entry) => (
              <p key={entry.label} className={entry.className}>
                {entry.label}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 text-card-foreground">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            En situation
          </h2>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Réserver une course</CardTitle>
              <CardDescription>
                Un parcours guidé pour un taxi urbain à Dakar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="overview-name">Nom du passager</Label>
                <Input id="overview-name" placeholder="Aïssatou Ndiaye" />
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked id="overview-notify" />
                <Label htmlFor="overview-notify">Position GPS prête</Label>
                <Badge className="ml-auto">Dakar</Badge>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button>Commander un taxi</Button>
              <Button variant="outline">Voir l’itinéraire</Button>
            </CardFooter>
          </Card>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Actions et états
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Demander un taxi</Button>
          <Button variant="secondary">Étape suivante</Button>
          <Button variant="outline">Modifier l’adresse</Button>
          <Button variant="ghost">Actualiser</Button>
          <Badge>GPS prêt</Badge>
          <Badge variant="secondary">Recherche en cours</Badge>
          <Badge variant="outline">À confirmer</Badge>
        </div>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Couleurs de marque</h2>
          <p className="text-sm text-muted-foreground">
            L’ambre distingue l’action principale ; le bleu nuit porte les
            surfaces et informations fortes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CORE_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Couleurs sémantiques et surfaces</h2>
          <p className="text-sm text-muted-foreground">
            Les rôles des textes, fonds, bordures, états atténués et erreurs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SUPPORTING_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function FontsPage() {
  return (
    <div className="space-y-8 rounded-xl border bg-card p-6 text-card-foreground">
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Familles de caractères
        </h2>
        <p className="mt-4 text-4xl font-bold">
          De Dakar à votre destination.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          DM Sans porte l’interface ; Space Mono rend les métriques et
          coordonnées faciles à comparer.
        </p>
        <p className="mt-4 font-mono text-sm">DKR · 12 min · 8,4 km</p>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Échelle typographique
        </h2>
        {TYPE_SCALE.map((entry) => (
          <div key={entry.label} className="grid gap-2 sm:grid-cols-[88px_1fr]">
            <span className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.label}
            </span>
            <p className={entry.className}>Un trajet lisible, à chaque étape.</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function LayoutPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Espacement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Une progression régulière qui garde les étapes faciles à parcourir.
        </p>
        <div className="mt-6 space-y-4">
          {SPACING_SCALE.map((space) => (
            <div key={space.label} className="flex items-center gap-4">
              <span className="w-8 text-xs text-muted-foreground">
                {space.label}
              </span>
              <div className={`h-3 rounded-full bg-primary ${space.className}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Arrondis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les arrondis des composants dérivent du token de base.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Petit', className: 'rounded-sm' },
            { label: 'Moyen', className: 'rounded-md' },
            { label: 'Grand', className: 'rounded-lg' },
            { label: 'Très grand', className: 'rounded-xl' },
          ].map((radius) => (
            <div
              key={radius.label}
              className={`flex h-24 items-end border bg-muted p-3 ${radius.className}`}
            >
              <span className="text-xs font-medium">{radius.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
